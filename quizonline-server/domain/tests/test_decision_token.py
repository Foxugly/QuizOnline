"""
Unit tests for the signed moderation tokens used in domain-join emails.

The token surface is tiny — sign, verify, expire, tamper — but the
correctness of the whole email accept/reject flow depends on it, so we
exercise each failure mode explicitly.
"""

from unittest.mock import patch

from django.test import TestCase

from domain.decision_token import (
    DECISION_TOKEN_TTL_SECONDS,
    DecisionTokenExpired,
    DecisionTokenInvalid,
    make_decision_token,
    parse_decision_token,
)


class MakeDecisionTokenTests(TestCase):
    def test_rejects_unknown_action(self):
        with self.assertRaises(ValueError):
            make_decision_token(request_id=1, recipient_user_id=2, action="delete")

    def test_round_trip_approve(self):
        token = make_decision_token(request_id=42, recipient_user_id=7, action="approve")
        parsed = parse_decision_token(token)
        self.assertEqual(parsed, {"request_id": 42, "recipient_user_id": 7, "action": "approve"})

    def test_round_trip_reject(self):
        token = make_decision_token(request_id=1, recipient_user_id=2, action="reject")
        self.assertEqual(parse_decision_token(token)["action"], "reject")

    def test_two_tokens_for_same_inputs_differ_by_timestamp(self):
        """TimestampSigner appends a timestamp, so successive tokens differ."""
        # Patch time to two different seconds so the timestamps differ.
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            a = make_decision_token(request_id=1, recipient_user_id=2, action="approve")
            mock_time.time.return_value = 1_000_001
            b = make_decision_token(request_id=1, recipient_user_id=2, action="approve")
        self.assertNotEqual(a, b)


class ParseDecisionTokenTests(TestCase):
    def test_garbage_token_raises_invalid(self):
        with self.assertRaises(DecisionTokenInvalid):
            parse_decision_token("not-a-real-token")

    def test_tampered_payload_raises_invalid(self):
        token = make_decision_token(request_id=10, recipient_user_id=11, action="approve")
        # Flip a byte in the payload section, signature now no longer verifies.
        head, sep, sig = token.rpartition(":")
        tampered = head[:-1] + ("a" if head[-1] != "a" else "b") + sep + sig
        with self.assertRaises(DecisionTokenInvalid):
            parse_decision_token(tampered)

    def test_expired_token_raises_expired(self):
        with patch("django.core.signing.time") as mock_time:
            mock_time.time.return_value = 1_000_000
            token = make_decision_token(request_id=1, recipient_user_id=2, action="approve")
            # Fast-forward past TTL.
            mock_time.time.return_value = 1_000_000 + DECISION_TOKEN_TTL_SECONDS + 1
            with self.assertRaises(DecisionTokenExpired):
                parse_decision_token(token)

    def test_payload_with_wrong_shape_raises_invalid(self):
        """A signed-but-malformed payload (e.g. wrong top-level type) still rejects."""
        from django.core import signing
        from domain.decision_token import SALT

        # Valid signature with the same salt, but payload is a list, not a dict.
        token = signing.dumps(["not", "a", "dict"], salt=SALT)
        with self.assertRaises(DecisionTokenInvalid):
            parse_decision_token(token)

    def test_payload_with_unknown_action_raises_invalid(self):
        from django.core import signing
        from domain.decision_token import SALT

        token = signing.dumps({"rid": 1, "uid": 2, "act": "purge"}, salt=SALT)
        with self.assertRaises(DecisionTokenInvalid):
            parse_decision_token(token)

    def test_token_is_url_safe(self):
        """
        The token rides in a URL path segment, so it must not contain
        characters that need percent-encoding. The signing.dumps base64
        alphabet is URL-safe (``-`` / ``_``), and the timestamp/signature
        use the same alphabet -- this test guards against ever switching
        back to a JSON-prefixed payload that would break mail links.
        """
        token = make_decision_token(request_id=99, recipient_user_id=42, action="approve")
        import string
        allowed = set(string.ascii_letters + string.digits + "-_.:")
        bad = sorted(set(token) - allowed)
        self.assertFalse(bad, f"token contains non URL-safe chars: {bad!r} (full token={token!r})")
