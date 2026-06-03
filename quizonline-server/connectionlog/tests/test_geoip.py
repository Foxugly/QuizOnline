from connectionlog import geoip


def test_geo_disabled_when_no_db(settings):
    geoip._reader.cache_clear()
    settings.GEOIP_PATH = ""
    assert geoip.lookup_geo("8.8.8.8") == {}


def test_geo_private_ip_returns_empty(settings, tmp_path):
    geoip._reader.cache_clear()
    # even if a path is set, a private/invalid IP yields nothing, no exception
    settings.GEOIP_PATH = str(tmp_path)
    assert geoip.lookup_geo("10.0.0.1") == {}
    assert geoip.lookup_geo("") == {}
