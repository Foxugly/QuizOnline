import pytest



@pytest.mark.django_db
def test_translations_field_serializes_existing_translations(course):
    course.set_current_language("fr")
    course.title = "T-FR"
    course.description = "D-FR"
    course.save()
    from lms_catalog.serializers import TranslationsField
    field = TranslationsField()
    out = field.to_representation(course)
    assert out["fr"]["title"] == "T-FR"
    assert out["fr"]["description"] == "D-FR"
