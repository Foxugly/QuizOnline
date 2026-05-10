from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("quiz", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="quiz",
            name="result_notification_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quiz",
            name="detail_notification_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
