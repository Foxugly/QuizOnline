from django.apps import AppConfig


class DomainConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'domain'

    def ready(self):
        # Import a SEUL EFFET DE BORD : il enregistre les handlers de signaux
        # de l'app. Syntaxiquement 'inutilise' (F401), fonctionnellement
        # indispensable — le supprimer desactiverait silencieusement tous les
        # signaux de `domain`. F401 est exclu pour les apps.py en config.
        from . import signals
