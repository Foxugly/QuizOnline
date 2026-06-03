from connectionlog.useragent import parse_user_agent


def test_parse_chrome_on_windows():
    ua = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
    out = parse_user_agent(ua)
    assert "Chrome" in out["browser"]
    assert "Windows" in out["os"]


def test_parse_empty():
    assert parse_user_agent("") == {"browser": "", "os": ""}
