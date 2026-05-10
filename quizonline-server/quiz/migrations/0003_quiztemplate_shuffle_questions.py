from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0002_quiz_notification_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiztemplate",
            name="shuffle_questions",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Si activé, chaque session reçoit un ordre de questions différent, "
                    "déterministe par session (mêmes questions à chaque rechargement)."
                ),
                verbose_name="Mélanger l'ordre des questions",
            ),
        ),
    ]
