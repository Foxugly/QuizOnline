from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage


class GraphEmailBackendError(RuntimeError):
    """Raised when Microsoft Graph rejects an email operation."""


@dataclass(frozen=True)
class GraphToken:
    access_token: str


class EmailBackend(BaseEmailBackend):
    token_url_template = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    graph_send_mail_url_template = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"

    def send_messages(self, email_messages: list[EmailMessage] | None) -> int:
        if not email_messages:
            return 0

        token = self._fetch_access_token()
        sent_count = 0
        for message in email_messages:
            recipient_count = self._send_message(token, message)
            if recipient_count > 0:
                sent_count += 1
        return sent_count

    def _fetch_access_token(self) -> GraphToken:
        response = requests.post(
            self.token_url_template.format(tenant_id=settings.MS_GRAPH_TENANT_ID),
            data={
                "client_id": settings.MS_GRAPH_CLIENT_ID,
                "client_secret": settings.MS_GRAPH_CLIENT_SECRET,
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
            timeout=15,
        )
        self._raise_for_graph_error(response, "token")
        payload = response.json()
        access_token = str(payload.get("access_token", "")).strip()
        if not access_token:
            raise GraphEmailBackendError("Microsoft Graph token response did not include access_token.")
        return GraphToken(access_token=access_token)

    def _send_message(self, token: GraphToken, message: EmailMessage) -> int:
        recipients = [
            {"emailAddress": {"address": address}}
            for address in message.recipients()
            if address
        ]
        if not recipients:
            return 0

        payload = {
            "message": {
                "subject": message.subject,
                "body": {
                    "contentType": "HTML" if message.content_subtype == "html" else "Text",
                    "content": message.body,
                },
                "toRecipients": recipients,
            },
            "saveToSentItems": False,
        }

        response = requests.post(
            self.graph_send_mail_url_template.format(sender=settings.MS_GRAPH_SENDER_USER_ID),
            headers={
                "Authorization": f"Bearer {token.access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
        self._raise_for_graph_error(response, "sendMail")
        return 1

    def _raise_for_graph_error(self, response: requests.Response, operation: str) -> None:
        if response.ok:
            return

        error_detail = self._format_graph_error(response)
        raise GraphEmailBackendError(f"Microsoft Graph {operation} failed: {error_detail}")

    @staticmethod
    def _format_graph_error(response: requests.Response) -> str:
        try:
            payload: dict[str, Any] = response.json()
        except ValueError:
            return f"HTTP {response.status_code}: {response.text.strip()}"

        error = payload.get("error")
        if isinstance(error, dict):
            code = str(error.get("code", "")).strip()
            message = str(error.get("message", "")).strip()
            if code and message:
                return f"{code}: {message}"
            if message:
                return message
            if code:
                return code
        return f"HTTP {response.status_code}"
