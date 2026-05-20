from django.conf import settings


class SecurityHeadersMiddleware:
    """
    Injects security-related HTTP response headers.

    frame-src is restricted to YouTube's embed host so that only embed
    iframes produced by ``toYoutubeEmbedUrl()`` (frontend) are allowed —
    any other origin would be blocked by the browser even if injected
    via XSS. We allow ``youtube.com`` (the standard embed host) rather
    than the ``youtube-nocookie.com`` variant: the nocookie host has
    stricter embedding rules and surfaces "Vidéo non disponible" on
    perfectly public videos. ``youtube.com/embed`` doesn't drop
    tracking cookies until the user presses play either.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not getattr(settings, "DEBUG", False):
            response["Content-Security-Policy"] = (
                "frame-src https://www.youtube.com"
            )
        return response
