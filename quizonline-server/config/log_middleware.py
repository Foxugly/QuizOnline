import logging
import threading
import uuid

_log_context = threading.local()


def get_log_context() -> dict:
    return getattr(_log_context, "ctx", {})


class LogContextMiddleware:
    """
    Injects request_id and user_id into every log record for the duration of
    the request.  Downstream code only needs to use the standard logger —
    the LogContextFilter adds the fields automatically.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _log_context.ctx = {
            "request_id": str(uuid.uuid4())[:8],
            "user_id": None,
        }

        # Try to resolve user from session auth (non-JWT, already on request)
        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            _log_context.ctx["user_id"] = user.pk

        response = self.get_response(request)

        user = getattr(request, "user", None)
        if user and getattr(user, "is_authenticated", False):
            _log_context.ctx["user_id"] = user.pk

        _log_context.ctx = {}
        return response


class LogContextFilter(logging.Filter):
    """Attaches request_id and user_id from the current thread context to every LogRecord."""

    def filter(self, record: logging.LogRecord) -> bool:
        ctx = get_log_context()
        record.request_id = ctx.get("request_id", "-")
        record.user_id = ctx.get("user_id", "-")
        return True
