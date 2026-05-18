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


def test_keeps_quill_color_span():
    """Quill emits ``<span style="color: rgb(...);">`` for the colour
    picker — the sanitizer must keep both the span and the colour."""
    out = sanitize_rich_text('<p><span style="color: rgb(230, 0, 0);">red</span></p>')
    assert "span" in out
    assert "color" in out


def test_keeps_background_color():
    out = sanitize_rich_text('<p><span style="background-color: #ffff00;">highlight</span></p>')
    assert "background-color" in out


def test_keeps_text_align():
    out = sanitize_rich_text('<p style="text-align: center;">centered</p>')
    assert "text-align" in out


def test_strips_url_payload_from_style():
    out = sanitize_rich_text(
        '<span style="background-image: url(javascript:alert(1)); color: red">x</span>'
    )
    assert "url(" not in out
    assert "javascript" not in out
    # The legitimate colour declaration is preserved.
    assert "color" in out


def test_strips_unknown_css_property():
    out = sanitize_rich_text(
        '<span style="position: fixed; top: 0; color: red">x</span>'
    )
    assert "position" not in out
    assert "fixed" not in out
    assert "color" in out
