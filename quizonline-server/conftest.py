import os


os.environ.setdefault("DJANGO_ENV", "test")

import pytest


@pytest.fixture(autouse=True)
def _clear_cache_between_tests():
    """Reset the (process-wide locmem) cache around every test.

    The test cache backend is ``locmemcache://`` which persists for the
    whole pytest process. Cached view payloads (e.g. ``course_analytics``)
    are keyed by object pk, and transactional test rollback reuses pks
    across tests, so without an explicit reset one test's cached payload
    could be served to the next. Clearing before and after keeps cached
    endpoints deterministic under test."""
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()
