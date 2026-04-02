# Deployment

## Backend

Configuration attendue :

- `DJANGO_ENV=prod`
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL`
- `FRONTEND_BASE_URL`
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS`
- `DEFAULT_FROM_EMAIL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `USE_DEEPL`
- `DEEPL_AUTH_KEY`
- `DEEPL_IS_FREE`

Recommandations production :

- reverse proxy HTTPS devant Django
- `SECURE_SSL_REDIRECT` actif
- cookies `Secure`
- HSTS actif
- base PostgreSQL recommandee
- stockage des medias hors filesystem local si plusieurs instances
- Redis pour le broker Celery
- worker Celery dedie pour traiter l outbox email

Commandes minimales :

```bash
cd wpref
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py test
python manage.py check --deploy
python manage.py spectacular --file openapi.yaml
celery -A wpref worker -l info
```

Notes d exploitation :

- les emails backend sont emis dans la langue du destinataire
- `python manage.py process_outbound_email --limit 100` reste disponible pour du rattrapage, pas pour le flux nominal
- le worker Celery doit tourner en continu ; ne pas compter sur le process web pour envoyer les mails
- Redis est une dependance runtime du flux email
- si `USE_DEEPL=True`, la cle DeepL doit rester hors Git et etre geree comme un secret
- les erreurs transitoires DeepL sont retriees cote HTTP client puis remontees sous une forme applicative simple

Architecture email :

- application Django -> table `core_outboundemail`
- hook `transaction.on_commit(...)`
- tache Celery `deliver_outbound_emails_task`
- worker Celery -> SMTP Office 365

## Frontend

```bash
cd wpref-frontend
npm ci
npm test -- --watch=false
npm run build
npm run test:e2e
```

Le bundle de production est genere dans `wpref-frontend/dist/wpref-frontend`.

## Contrat API

Avant une release :

```bash
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
git diff -- wpref/openapi.yaml wpref-frontend/openapi.yaml wpref-frontend/src/app/api/generated
```
