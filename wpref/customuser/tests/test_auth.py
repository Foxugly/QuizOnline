from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.exceptions import AuthenticationFailed

from customuser.auth import EmailConfirmedTokenObtainPairSerializer


class EmailConfirmedTokenObtainPairSerializerTests(SimpleTestCase):
    @patch("customuser.auth.TokenObtainPairSerializer.validate", return_value={"access": "token"})
    def test_validate_denies_user_without_email_confirmed_attribute(self, super_validate):
        serializer = EmailConfirmedTokenObtainPairSerializer()
        serializer.user = object()

        with self.assertRaises(AuthenticationFailed):
            serializer.validate({"username": "u", "password": "p"})

        super_validate.assert_called_once()
