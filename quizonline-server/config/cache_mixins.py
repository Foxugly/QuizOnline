"""Lightweight cache-header mixins for DRF viewsets.

The frontend's hot read paths (``GET /api/course/<id>/``,
``GET /api/lesson/<id>/``) are pure functions of the URL — the same
authenticated user, browsing back-and-forth in a learning session,
asks for the same payload several times within a few seconds. Adding
a short browser-cache window keeps those revisits off the wire
without changing any application code.

Why ``private, max-age=30``:

* ``private`` — never share the payload with intermediaries. Even
  though our nginx in front doesn't cache user-tied responses today,
  the directive makes the contract explicit and survives a future
  reverse-proxy reconfiguration.
* ``max-age=30`` — short enough that an instructor who just edited
  the course and clicks back sees the new version on the next ``F5``
  / re-mount within ~30 s, long enough to absorb the typical
  next-lesson / prev-lesson navigation burst in a learning session.

For owner-perceived staleness during rapid edit ↔ preview flows we
deliberately favour simplicity over correctness here: a hard refresh
(``Ctrl+Shift+R``) bypasses the cache, and the next ``Cache-Control``
expiry hits within 30 s regardless. A stricter ETag /
``If-None-Match`` flow would eliminate the window entirely but adds
real implementation surface — not worth it before there's
measurable user pain.
"""


class ShortReadCacheMixin:
    # Mixin for DRF viewsets. Tags ``retrieve`` responses with
    # ``Cache-Control: private, max-age=30`` so the browser can short-
    # circuit repeat reads (typical of back/forward navigation through
    # learner pages) without re-hitting the backend.
    #
    # Only ``retrieve`` is tagged — list endpoints would surface stale
    # aggregates after a write, and other actions (``destroy``, ``@action``
    # methods) keep DRF's default no-cache contract.
    #
    # NOTE: documentation lives in module-level docstring and inline
    # comments rather than a class docstring; drf-spectacular folds a
    # mixin's docstring into every action's OpenAPI description by
    # inheritance, which would surface this implementation note on
    # ``course_list`` / ``course_create`` / ``course_update`` / etc. —
    # an inaccurate user-facing description.

    def retrieve(self, request, *args, **kwargs):  # type: ignore[override]
        response = super().retrieve(request, *args, **kwargs)
        # Only successful reads get the cache header — let 404 / 403
        # flow through with the default headers so a stale denial
        # doesn't keep firing after the owner grants access.
        if 200 <= response.status_code < 300:
            response["Cache-Control"] = "private, max-age=30"
        return response
