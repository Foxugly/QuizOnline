from django.core.exceptions import DisallowedHost, SuspiciousOperation

from config.sentry_filters import (
    DATA_COLLECTION,
    REDIS_LOADING_MARKER,
    before_send,
    drop_benign_noise,
    drop_disallowed_host,
    drop_redis_loading_noise,
    scrub_event,
)


def _event(formatted="", message="", params=()):
    return {"logentry": {"formatted": formatted, "message": message, "params": list(params)}}


def _exc_hint(exc):
    return {"exc_info": (type(exc), exc, None)}


def test_drops_event_when_formatted_message_matches():
    event = _event(
        formatted=(
            "consumer: Cannot connect to redis://127.0.0.1:6379/1: "
            f"{REDIS_LOADING_MARKER}."
        ),
    )
    assert drop_redis_loading_noise(event, hint={}) is None


def test_drops_event_when_only_params_carry_the_marker():
    event = _event(
        message="consumer: Cannot connect to %s: %s.",
        params=("redis://127.0.0.1:6379/1", f"{REDIS_LOADING_MARKER}."),
    )
    assert drop_redis_loading_noise(event, hint={}) is None


def test_lets_unrelated_broker_error_through():
    event = _event(
        formatted="consumer: Cannot connect to redis://127.0.0.1:6379/1: Connection refused.",
    )
    assert drop_redis_loading_noise(event, hint={}) is event


def test_lets_event_without_logentry_through():
    event = {"exception": {"values": [{"type": "ValueError", "value": "boom"}]}}
    assert drop_redis_loading_noise(event, hint={}) is event


def test_drops_disallowed_host_event():
    event = _event()
    hint = _exc_hint(DisallowedHost("Invalid HTTP_HOST header: ''."))
    assert drop_disallowed_host(event, hint) is None


def test_lets_other_suspicious_operation_through():
    event = _event()
    hint = _exc_hint(SuspiciousOperation("something else"))
    assert drop_disallowed_host(event, hint) is event


def test_lets_event_without_exc_info_through():
    event = _event()
    assert drop_disallowed_host(event, hint={}) is event


def test_composite_drops_both_noise_kinds():
    # DisallowedHost (via hint) and Redis-loading (via logentry) both dropped.
    assert drop_benign_noise(_event(), _exc_hint(DisallowedHost("''"))) is None
    redis_event = _event(formatted=f"Cannot connect: {REDIS_LOADING_MARKER}.")
    assert drop_benign_noise(redis_event, hint={}) is None


def test_composite_lets_real_error_through():
    event = _event(formatted="consumer: Connection refused.")
    assert drop_benign_noise(event, hint={}) is event


# --- data_collection (replaces the deprecated send_default_pii) -------------


def _client_options():
    import warnings

    import sentry_sdk

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        client = sentry_sdk.Client(
            dsn=None, default_integrations=False, data_collection=DATA_COLLECTION
        )
    messages = [str(w.message) for w in caught]
    return client.options, messages


def test_data_collection_collects_no_pii_and_raises_no_deprecation():
    options, messages = _client_options()
    assert not any("send_default_pii" in m for m in messages)
    resolved = options["data_collection"]
    assert resolved["provided_by_user"] is True
    assert resolved["user_info"] is False
    assert resolved["cookies"] == {"mode": "off"}
    assert resolved["http_bodies"] == []
    assert resolved["queues"] is False
    assert resolved["database_query_data"] is False
    assert options["send_default_pii"] is None


def _filtered(value):
    # The SDK scrubber substitutes an AnnotatedValue whose value is "[Filtered]".
    return getattr(value, "value", value) == "[Filtered]"


def test_scrub_event_keeps_the_sdk_denylist():
    event = {
        "extra": {"password": "hunter2", "page": 3},
        "breadcrumbs": {"values": [{"data": {"token": "abc", "n": 1}}]},
        "request": {"headers": {"Authorization": "Bearer x", "Accept": "*/*"}},
        "user": {"id": "7", "ip_address": "203.0.113.9"},
    }
    out = scrub_event(event, {})
    assert _filtered(out["extra"]["password"]) and out["extra"]["page"] == 3
    crumb = out["breadcrumbs"]["values"][0]["data"]
    assert _filtered(crumb["token"]) and crumb["n"] == 1
    headers = out["request"]["headers"]
    assert _filtered(headers["Authorization"]) and headers["Accept"] == "*/*"
    assert "ip_address" not in out["user"]


def test_before_send_scrubs_then_drops_noise():
    assert before_send(_event(), _exc_hint(DisallowedHost("''"))) is None
    event = {"extra": {"secret": "s"}}
    assert _filtered(before_send(event, {})["extra"]["secret"])
