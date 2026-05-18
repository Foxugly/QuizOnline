from lms_catalog.sanitizer import sanitize_rich_text


def test_strips_script_tag():
    out = sanitize_rich_text('<p>hi</p><script>alert(1)</script>')
    assert "script" not in out.lower()
    assert "hi" in out


def test_allows_safe_tags():
    out = sanitize_rich_text('<p><strong>bold</strong></p>')
    assert "<strong>" in out


def test_empty_input_returns_empty():
    assert sanitize_rich_text("") == ""
    assert sanitize_rich_text(None) == ""
