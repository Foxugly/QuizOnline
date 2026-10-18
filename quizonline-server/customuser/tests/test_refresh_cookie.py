"""HttpOnly refresh-token cookie for the web SPA (opt-in via ``X-Auth-Mode: cookie``).

Fleet design piloted on PushIT (PushIT_server #69). Without the header the
historical body-token contract is unchanged (API clients, old SPA bundles).
"""

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from customuser.magic_link_token import make_magic_link_token
from customuser.models import CustomUser

ORIGIN = "https://quizonline.example.test"
COOKIE = "quizonline_refresh"
LOGIN_URL = "/api/v1/token/"
REFRESH_URL = "/api/v1/token/refresh/"
LOGOUT_URL = "/api/v1/token/blacklist/"
MAGIC_URL = "/api/v1/auth/magic-link/exchange/"
PASSWORD_CHANGE_URL = "/api/v1/user/password/change/"
ME_URL = "/api/v1/user/me/"

COOKIE_HEADERS = {"HTTP_X_AUTH_MODE": "cookie", "HTTP_ORIGIN": ORIGIN}


@override_settings(CORS_ALLOWED_ORIGINS=[ORIGIN])
class RefreshCookieTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = CustomUser.objects.create_user(email="ck@example.test", password="Secret-123!")
        self.user.email_confirmed = True
        self.user.save(update_fields=["email_confirmed"])

    def tearDown(self):
        cache.clear()

    # --- helpers -----------------------------------------------------------

    def _login(self, remember_me=None, **headers):
        payload = {"email": "ck@example.test", "password": "Secret-123!"}
        if remember_me is not None:
            payload["remember_me"] = remember_me
        return self.client.post(LOGIN_URL, payload, content_type="application/json", **headers)

    def _post(self, url, data=None, **headers):
        return self.client.post(url, data or {}, content_type="application/json", **headers)

    def _cookie(self, response):
        return response.cookies.get(COOKIE)

    # --- login -------------------------------------------------------------

    def test_body_mode_login_is_unchanged(self):
        response = self._login()
        self.assertEqual(response.status_code, 200)
        self.assertIn("refresh", response.json())
        self.assertIn("access", response.json())
        self.assertIsNone(self._cookie(response))

    def test_cookie_mode_login_sets_httponly_cookie_and_omits_refresh(self):
        response = self._login(**COOKIE_HEADERS)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("access", body)
        self.assertNotIn("refresh", body)
        cookie = self._cookie(response)
        self.assertIsNotNone(cookie)
        self.assertTrue(cookie["httponly"])
        self.assertTrue(cookie["secure"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], "/api/v1/token/")
        self.assertEqual(cookie["domain"], "")
        self.assertEqual(int(cookie["max-age"]), 24 * 3600)
        RefreshToken(cookie.value)  # a valid refresh token

    def test_cookie_mode_login_remember_me_false_gives_session_cookie(self):
        response = self._login(remember_me=False, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 200)
        cookie = self._cookie(response)
        self.assertEqual(cookie["max-age"], "")
        # Kept through rotation.
        self.client.cookies[COOKIE] = cookie.value
        rotated = self._post(REFRESH_URL, **COOKIE_HEADERS)
        self.assertEqual(rotated.status_code, 200)
        self.assertEqual(self._cookie(rotated)["max-age"], "")

    def test_cookie_mode_login_from_foreign_origin_is_rejected(self):
        response = self._login(HTTP_X_AUTH_MODE="cookie", HTTP_ORIGIN="https://evil.example")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "origin_not_allowed")
        self.assertIsNone(self._cookie(response))

    def test_cookie_mode_login_without_origin_is_rejected(self):
        response = self._login(HTTP_X_AUTH_MODE="cookie")
        self.assertEqual(response.status_code, 403)

    def test_unconfirmed_email_still_refused_in_cookie_mode(self):
        self.user.email_confirmed = False
        self.user.save(update_fields=["email_confirmed"])
        response = self._login(**COOKIE_HEADERS)
        self.assertEqual(response.status_code, 401)
        self.assertIsNone(self._cookie(response))

    # --- refresh -----------------------------------------------------------

    def test_refresh_reads_cookie_rotates_and_rejects_replay(self):
        login = self._login(**COOKIE_HEADERS)
        first = self._cookie(login).value
        response = self._post(REFRESH_URL, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.json())
        self.assertNotIn("refresh", response.json())
        rotated = self._cookie(response).value
        self.assertNotEqual(rotated, first)
        # The old cookie value was blacklisted by the rotation.
        self.client.cookies[COOKIE] = first
        replay = self._post(REFRESH_URL, **COOKIE_HEADERS)
        self.assertEqual(replay.status_code, 401)

    def test_refresh_without_cookie_is_401(self):
        response = self._post(REFRESH_URL, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "refresh_cookie_missing")

    def test_refresh_from_foreign_origin_is_403(self):
        self._login(**COOKIE_HEADERS)
        response = self._post(REFRESH_URL, HTTP_X_AUTH_MODE="cookie", HTTP_ORIGIN="https://evil.example")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "origin_not_allowed")

    def test_refresh_legacy_body_token_migrates_to_cookie(self):
        legacy = str(RefreshToken.for_user(self.user))
        response = self._post(REFRESH_URL, {"refresh": legacy}, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("refresh", response.json())
        self.assertIsNotNone(self._cookie(response))
        # The legacy token is spent.
        again = self._post(REFRESH_URL, {"refresh": legacy})
        self.assertEqual(again.status_code, 401)

    def test_refresh_body_mode_unchanged(self):
        legacy = str(RefreshToken.for_user(self.user))
        response = self._post(REFRESH_URL, {"refresh": legacy})
        self.assertEqual(response.status_code, 200)
        self.assertIn("refresh", response.json())
        self.assertIsNone(self._cookie(response))

    # --- logout ------------------------------------------------------------

    def test_logout_cookie_mode_blacklists_and_clears_without_bearer(self):
        self._login(**COOKIE_HEADERS)
        token = self.client.cookies[COOKIE].value
        response = self._post(LOGOUT_URL, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 204)
        cleared = self._cookie(response)
        self.assertEqual(cleared.value, "")
        self.assertEqual(cleared["path"], "/api/v1/token/")
        self.assertTrue(
            BlacklistedToken.objects.filter(token__jti=RefreshToken(token, verify=False)["jti"]).exists()
        )
        # Idempotent.
        self.assertEqual(self._post(LOGOUT_URL, **COOKIE_HEADERS).status_code, 204)

    def test_logout_cookie_mode_from_foreign_origin_is_403(self):
        self._login(**COOKIE_HEADERS)
        response = self._post(LOGOUT_URL, HTTP_X_AUTH_MODE="cookie", HTTP_ORIGIN="https://evil.example")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(BlacklistedToken.objects.count(), 0)

    def test_logout_body_mode_unchanged(self):
        refresh = str(RefreshToken.for_user(self.user))
        response = self._post(LOGOUT_URL, {"refresh": refresh})
        self.assertEqual(response.status_code, 200)

    # --- magic link ----------------------------------------------------------

    def test_magic_link_cookie_mode_sets_cookie(self):
        token = make_magic_link_token(self.user)
        response = self._post(MAGIC_URL, {"token": token}, **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotIn("refresh", response.json())
        self.assertIsNotNone(self._cookie(response))

    def test_magic_link_cookie_mode_from_foreign_origin_is_403(self):
        token = make_magic_link_token(self.user)
        response = self._post(
            MAGIC_URL, {"token": token}, HTTP_X_AUTH_MODE="cookie", HTTP_ORIGIN="https://evil.example"
        )
        self.assertEqual(response.status_code, 403)

    def test_magic_link_body_mode_unchanged(self):
        token = make_magic_link_token(self.user)
        response = self._post(MAGIC_URL, {"token": token})
        self.assertEqual(response.status_code, 200)
        self.assertIn("refresh", response.json())

    # --- password change ---------------------------------------------------

    def _bearer(self, access):
        return {"HTTP_AUTHORIZATION": f"Bearer {access}"}

    def test_password_change_body_mode_returns_fresh_pair(self):
        access = self._login().json()["access"]
        response = self._post(
            PASSWORD_CHANGE_URL,
            {"old_password": "Secret-123!", "new_password": "Another-456!"},
            **self._bearer(access),
        )
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertIn("access", body)
        RefreshToken(body["refresh"])  # fresh and not blacklisted

    def test_password_change_cookie_mode_resets_cookie_and_keeps_session_choice(self):
        login = self._login(remember_me=False, **COOKIE_HEADERS)
        old = self._cookie(login).value
        response = self._post(
            PASSWORD_CHANGE_URL,
            {"old_password": "Secret-123!", "new_password": "Another-456!"},
            **self._bearer(login.json()["access"]),
            **COOKIE_HEADERS,
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn("access", response.json())
        self.assertNotIn("refresh", response.json())
        cookie = self._cookie(response)
        new = cookie.value  # read now: the client shares this Morsel
        self.assertNotEqual(new, old)
        self.assertEqual(cookie["path"], "/api/v1/token/")
        self.assertEqual(cookie["max-age"], "")  # remember_me=false survives
        # The pre-change cookie is revoked, the new one works.
        self.client.cookies[COOKIE] = old
        self.assertEqual(self._post(REFRESH_URL, **COOKIE_HEADERS).status_code, 401)
        self.client.cookies[COOKIE] = new
        ok = self._post(REFRESH_URL, **COOKIE_HEADERS)
        self.assertEqual(ok.status_code, 200, ok.content)

    def test_password_change_cookie_mode_from_foreign_origin_is_403(self):
        access = self._login().json()["access"]
        response = self._post(
            PASSWORD_CHANGE_URL,
            {"old_password": "Secret-123!", "new_password": "Another-456!"},
            HTTP_X_AUTH_MODE="cookie",
            HTTP_ORIGIN="https://evil.example",
            **self._bearer(access),
        )
        self.assertEqual(response.status_code, 403)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Secret-123!"))

    # --- account deletion --------------------------------------------------

    def test_delete_me_cookie_mode_clears_cookie(self):
        login = self._login(**COOKIE_HEADERS)
        response = self.client.delete(ME_URL, **self._bearer(login.json()["access"]), **COOKIE_HEADERS)
        self.assertEqual(response.status_code, 204)
        self.assertEqual(self._cookie(response).value, "")

    def test_delete_me_body_mode_sets_no_cookie(self):
        access = self._login().json()["access"]
        response = self.client.delete(ME_URL, **self._bearer(access))
        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self._cookie(response))

    # --- misc --------------------------------------------------------------

    def test_access_token_carries_persist_claim_for_session_cookie(self):
        login = self._login(remember_me=False, **COOKIE_HEADERS)
        self.assertIs(AccessToken(login.json()["access"]).payload.get("persist"), False)

    def test_cors_preflight_allows_x_auth_mode_with_credentials(self):
        response = self.client.options(
            REFRESH_URL,
            HTTP_ORIGIN=ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-auth-mode, content-type",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Access-Control-Allow-Origin"], ORIGIN)
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
        self.assertIn("x-auth-mode", response["Access-Control-Allow-Headers"])

    def test_cors_preflight_refuses_foreign_origin(self):
        response = self.client.options(
            REFRESH_URL,
            HTTP_ORIGIN="https://evil.example",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="x-auth-mode",
        )
        self.assertNotIn("Access-Control-Allow-Origin", response)
