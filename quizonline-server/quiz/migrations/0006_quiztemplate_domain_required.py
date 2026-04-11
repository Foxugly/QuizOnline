from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('domain', '0003_domain_updated_by'),
        ('quiz', '0005_quiz_user_indexes'),
    ]

    operations = [
        # Supprime les templates sans domaine (templates orphelins créés par generate_from_subjects)
        migrations.RunPython(
            code=lambda apps, schema_editor: (
                apps.get_model('quiz', 'QuizTemplate').objects.filter(domain__isnull=True).delete()
            ),
            reverse_code=migrations.RunPython.noop,
        ),
        # Rend le champ domain NOT NULL
        migrations.AlterField(
            model_name='quiztemplate',
            name='domain',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='quiz_templates',
                to='domain.domain',
            ),
        ),
    ]
