from django.core.exceptions import DisallowedHost, SuspiciousOperation

from config.sentry_filters import (
    REDIS_LOADING_MARKER,
    drop_benign_noise,
    drop_disallowed_host,
    drop_redis_loading_noise,
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
