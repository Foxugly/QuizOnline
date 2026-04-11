from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Injects security-related HTTP response headers.

    frame-src is restricted to youtube-nocookie.com so that only embed iframes
    produced by toYoutubeEmbedUrl() (frontend) are allowed — any other origin
    would be blocked by the browser even if injected via XSS.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not getattr(settings, "DEBUG", False):
            response["Content-Security-Policy"] = (
                "frame-src https://www.youtube-nocookie.com"
            )
        return response
