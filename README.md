# QuizOnline

QuizOnline est un monorepo contenant une application de quiz multilingue avec :

- backend Django REST dans [`quizonline-server/`](./quizonline-server)
- frontend Angular dans [`quizonline-frontend/`](./quizonline-frontend)
- contrat API partagé via OpenAPI

Fonctionnalités principales :

- authentification JWT, confirmation email, reset et changement de mot de passe
- gestion des domaines, membres, managers et demandes d accès
- création de sujets, questions et templates de quiz
- assignation de quiz avec alertes applicatives
- outbox email backend avec livraison Celery
- traduction via DeepL en option
- pages d administration pour statistiques, diagnostic système et test email

## Stack

- backend : Django 6, Django REST Framework, Celery, Redis, django-parler
- frontend : Angular 21, PrimeNG
- base locale par défaut : SQLite
- production recommandée : PostgreSQL + Redis

## Structure

- [`quizonline-server/`](./quizonline-server) : API, logique métier, admin Django, OpenAPI backend
- [`quizonline-frontend/`](./quizonline-frontend) : SPA Angular, client API généré, e2e
- [`docs/`](./docs) : déploiement, structure du dépôt, checklist
- [`scripts/`](./scripts) : scripts utilitaires, dont synchronisation OpenAPI

## Installation Linux

Prérequis recommandés :

- `python3.12+`
- `nodejs 20+`
- `npm`
- `redis-server` si tu veux le flux email nominal avec Celery
- `git`

Exemple Debian/Ubuntu :

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm redis-server
```

## Démarrage local

### 1. Cloner le dépôt

```bash
git clone <repo-url>
cd QuizOnline
```

### 2. Backend Django

```bash
cd quizonline-server
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env 2>/dev/null || true
python manage.py migrate
python manage.py runserver
```

Le backend tourne alors sur `http://127.0.0.1:8000`.

### 3. Frontend Angular

```bash
cd quizonline-frontend
npm ci
npm start
```

Le frontend tourne alors sur `http://127.0.0.1:4200`.

## Configuration backend

La configuration est lue au démarrage depuis les variables d environnement et `quizonline-server/.env`. Le point d entrée principal est [`quizonline-server/config/settings_base.py`](./quizonline-server/config/settings_base.py).

Variables importantes :

- `DJANGO_ENV` : `dev` ou `prod`
- `SECRET_KEY`
- `JWT_SIGNING_KEY`
- `DATABASE_URL`
- `FRONTEND_BASE_URL`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `EMAIL_BACKEND`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS`
- `DEFAULT_FROM_EMAIL`
- `CELERY_BROKER_URL`
- `CELERY_RESULT_BACKEND`
- `CELERY_TASK_ALWAYS_EAGER`
- `CELERY_TASK_DEFAULT_QUEUE`
- `USE_DEEPL`
- `DEEPL_AUTH_KEY`
- `DEEPL_IS_FREE`
- `API_PAGE_SIZE`
- `DATA_UPLOAD_MAX_MEMORY_SIZE`
- `FILE_UPLOAD_MAX_MEMORY_SIZE`
- `MAX_UPLOAD_FILE_SIZE`

Exemple de référence : [`deploy/env.production.example`](./deploy/env.production.example)

## Email, Celery et Redis

Le flux nominal des emails applicatifs passe par une outbox base de données :

- le code enfile un `OutboundEmail`
- `transaction.on_commit(...)` déclenche la livraison
- Celery traite l outbox
- le backend email Django envoie via SMTP ou Microsoft Graph

Pour lancer Redis et le worker Celery en local :

```bash
redis-server
cd quizonline-server
source .venv/bin/activate
celery -A config worker -l info
```

Commande de rattrapage manuel :

```bash
cd quizonline-server
source .venv/bin/activate
python manage.py process_outbound_email --limit 100
```

## DeepL

- `USE_DEEPL=True` active les appels DeepL
- `USE_DEEPL=False` garde le backend sans dépendance DeepL
- `DEEPL_IS_FREE=True` cible `api-free.deepl.com`
- `DEEPL_AUTH_KEY` doit rester hors Git

## Administration

Administration disponible côté application :

- statistiques : `/admin/stats`
- configuration système : `/admin/system-config`
- test email : `/admin/mail-test`

Le backend expose aussi :

- OpenAPI : `/api/schema/`
- Swagger UI : `/api/docs/`
- health check : `/health/`

L admin Django est disponible sur `/admin/`.

## Nouvelles fonctionnalites

- Dashboard analytics avec graphiques Chart.js (`/admin/stats`)
- Export PDF des resultats de quiz
- Page "A propos" avec onglets (features, legal GDPR, technique)
- Page "Soutenir" (donate) avec lien GitHub Sponsors
- Emails HTML rich text avec fallback plaintext

## Qualité et tests

Backend :

```bash
cd quizonline-server
source .venv/bin/activate
python manage.py test
pytest
python manage.py spectacular --file openapi.yaml
python manage.py check --deploy
```

Frontend :

```bash
cd quizonline-frontend
npm run typecheck
npm test -- --watch=false
npm run build
npm run test:e2e
```

## Contrat API

Le frontend et le backend restent découplés à l exécution. La frontière partagée est OpenAPI.

Synchronisation du contrat :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-openapi.ps1
```

Fichiers concernés :

- [`quizonline-server/openapi.yaml`](./quizonline-server/openapi.yaml)
- [`quizonline-frontend/openapi.yaml`](./quizonline-frontend/openapi.yaml)
- `quizonline-frontend/src/app/api/generated`

## Déploiement

En production, prévoir au minimum :

- reverse proxy HTTPS
- PostgreSQL recommandé
- Redis pour Celery
- stockage média adapté si plusieurs instances
- cohérence entre limites d upload Django et reverse proxy

Guide détaillé : [`docs/deployment.md`](./docs/deployment.md)

## Deploy automatise

Le deploiement est automatise via GitHub Actions :

- CI : `.github/workflows/ci.yml` (tests backend + frontend)
- Deploy : `.github/workflows/deploy.yml` (build frontend, SCP vers EC2, SSH deploy)
- Script serveur : `deploy/redeploy.sh` — pull, update backend, sync services, restart, health checks
- Secrets GitHub requis : `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`
- Le frontend est builde en CI (pas sur l EC2) car la memoire de l instance est limitee

## Documentation complémentaire

- structure du dépôt : [`docs/repository-structure.md`](./docs/repository-structure.md)
- déploiement : [`docs/deployment.md`](./docs/deployment.md)
- checklist acceptance / production : [`docs/acceptance-checklist.md`](./docs/acceptance-checklist.md)

## Principes du projet

- backend et frontend séparés mais versionnés ensemble
- logique métier côté backend, interface côté frontend
- contrat partagé explicite via OpenAPI
- secrets non commités
- CI verte avant merge
