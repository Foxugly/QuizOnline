from config.sentry_filters import REDIS_LOADING_MARKER, drop_redis_loading_noise


def _event(formatted="", message="", params=()):
    return {"logentry": {"formatted": formatted, "message": message, "params": list(params)}}


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
