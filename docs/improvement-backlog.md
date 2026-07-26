# QuizOnline — Backlog d'améliorations

> Issu d'un audit code (backend Django / frontend Angular / ops-CI) du 2026-07-25.
> Le socle est mûr et sain : aucun problème critique de sécurité ou d'intégrité.
> Ces items sont des raffinements priorisés, pas des urgences. Chaque constat est
> référencé à un `fichier:ligne` vérifié dans le code au moment de l'audit.

Légende priorité : **P1** = fort ROI / faible risque · **P2** = durcissement utile · **P3** = polish.

## État

- ✅ **O1**, **O2 (partiel)**, **O3** traités par la PR `ci/fullstack-e2e-lms-tests-and-deploy-healthcheck`.
- ⬜ Le reste est ouvert.

---

## A. OPS / CI / Tests

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| O1 | P1 | L'e2e « fullstack » (vrai backend Django) ne tourne jamais en CI — script de boot en PowerShell, local-Windows only. Les specs smoke/quiz/course-invite ne gardent aucune régression d'intégration. | `.github/workflows/ci.yml`, `playwright.fullstack.config.ts`, `scripts/run-fullstack-backend.ps1` | ✅ |
| O4 | P1→ | Les apps cœur LMS (`course`, `lesson`, `enrollment`, `certificate`, `assessment`, `block`, `connectionlog`) utilisent **pytest** (fonctions+fixtures) et n'étaient découvertes par aucun `manage.py test` → des centaines de tests jamais exécutés en CI. | `.github/workflows/ci.yml`, `pytest.ini` | ✅ (job unique `backend` en `pytest`, auto-découverte = anti-drift ; remplace les 4 jobs `manage.py test` fragmentés) |
| O3 | P1 | Le déploiement ne vérifie jamais `/health/` après restart : un boot cassé (DB/migration KO) donne quand même un deploy « vert », sans rollback. Le endpoint renvoie déjà 503 si KO. | `.github/workflows/deploy.yml`, `config/views_health.py:116` | ✅ (health-check post-SSM) |
| O2 | P2 | Aucune mesure ni seuil de couverture en CI (`run-coverage.bat` jamais appelé). | `.github/workflows/ci.yml` | ⬜ |
| O5 | P3 | Le hook pre-commit `check-i18n` ne se déclenche que sur `shared/i18n/` et `*.i18n.ts` ; une clé ajoutée ailleurs n'est gardée qu'en CI. | `.pre-commit-config.yaml:22` | ⬜ |
| O6 | P2 | Réhabiliter les 4 specs e2e fullstack encore en `test.skip` (course-invite, quiz-assign, question ×2, quiz-play). Découvert en câblant O1 : ces specs avaient silencieusement pourri (login `#username`→`#email`, `/api/token/` `username`→`email`, routes `/lms/*` supprimées, `username` retiré du modèle, sélecteurs UI). Auth/routes déjà corrigés ; reste à réaligner les assertions UI (dialog d'assignation, flux d'invitation, vues question/quiz) sur la SPA actuelle. Le smoke, lui, gate déjà en CI. | `quizonline-frontend/e2e/fullstack/*.spec.ts` | ⬜ |

## B. Sécurité

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| S1 | P2 | Endpoint d'inscription sans throttling — seul endpoint d'auth sans `ScopedRateThrottle`, protégé uniquement par Turnstile (désactivé si `TURNSTILE_SECRET_KEY` vide) → risque de création de comptes en masse + email-bombing. | `customuser/views.py:203`, `config/settings_base.py:118` | ✅ (`RegisterRateThrottle` scope `register`, défaut 10/h, testé) |
| S2 | P3 | Fuite du texte d'exception interne vers le client sur les imports JSON (`str(exc)` renvoyé, et `course` ne logue même pas). | `course/views.py:309`, `question/views.py:487` | ⬜ |
| S3 | P3 | `SENTRY_SEND_DEFAULT_PII=True` par défaut envoie IP + email à Sentry — documenté/intentionnel, à revalider vs politique de confidentialité. | `config/settings_base.py:88,106` | ⬜ |

## C. Performance (backend)

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| B1 | P2 | N+1 sur la liste des fils d'alerte : `unread`/`unread_count` reconstruisent un queryset (`.count()`/`.exists()`) sans réutiliser le prefetch → ~2 requêtes/fil (page de 20 → ~40 en trop). | `quiz/serializers.py:990`, `quiz/alerting.py:82` | ⬜ |
| B2 | P3 | Filtre `created_at__date__gte/lte` sur `ConnectionEvent` casse l'usage de l'index B-tree (cast de date) → full scan progressif sur table de logs. | `connectionlog/views.py:36` | ⬜ |

## D. Frontend (Angular)

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| FE1 | P1 | Recherche domaine = 1 appel API par frappe (pas de debounce) → rafale de requêtes + résultats qui se doublent. | `pages/domain/list/domain-list.html:29` | ✅ (debounce 300 ms via Subject) |
| FE2 | P2 | États « erreur » confondus avec « chargement/vide » : sur échec réseau `lesson-view` affiche un skeleton à l'infini, `domain-list` affiche « aucun domaine ». | `pages/lesson-view/lesson-view.ts:273`, `pages/domain/list/domain-list.ts:112` | ✅ (domain-list + lesson-view : signal `loadError` + bloc erreur/retry, 5 langues) |
| FE3 | P2 | Typage aux frontières API : `any` dans `quiz-question` (composant de jeu principal), `http.get` brut hors client généré dans `lesson-view`, casts `as … & {…}` pour des champs absents du DTO. | `components/quiz-question/quiz-question.ts:206`, `pages/lesson-view/lesson-view.ts:34`, `pages/domain/list/domain-list.ts:231` | ⬜ |
| FE4 | P2 | Patterns de recherche divergents entre listes (rechargement serveur / filtrage client / debounce) → comportement incohérent, maintenance dispersée. | `domain-list` vs `quiz-list`/`user-list` vs `subject-list`/`course-list`/`catalog` | ⬜ |
| FE5 | P3 | Le polling ne se met pas en pause onglet caché (`interval(60_000)` ignore `document.hidden`). | `services/unread-badges/unread-badges.service.ts:56` | ⬜ |
| FE6 | P3 | Aucun retry/backoff sur les échecs transitoires (timeout 30 s mais zéro `retry`). | `network-interceptor.ts` | ⬜ |
| FE7 | P3 | Code de polling mort et dupliqué (`startPolling` jamais appelé sur `notification.service` et `quiz-alert`). | `services/notification/notification.service.ts:41`, `services/quiz-alert/quiz-alert.ts:78` | ⬜ |
| FE8 | P3 | Catch silencieux à tracer (`question-view.ts:254`, `change-password.ts:106`) — ajouter `logApiError`. | idem | ⬜ |

## E. Produit / Fonctionnel

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| P1 | P1 | QCM tout-ou-rien uniquement : pas de crédit partiel, ni question ouverte/numérique/appariement. Le champ `given_answer` existe mais n'est jamais évalué (vestige). → mérite un brainstorming dédié (`question_type` + stratégies de scoring). | `quiz/models.py:480`, `question/models.py:50`, `quiz/models.py:437` | ⬜ |
| P2 | P2 | Certificats expirables sans relance ni renouvellement : `expires_at` existe, aucune tâche beat ne prévient l'apprenant (asymétrie avec les invitations). | `certificate/models.py:19`, `config/settings_base.py:333` | ✅ (durée = choix jamais/1/2/5/10 ans défaut jamais ; relance email J-30/J-7 idempotente via beat quotidien ; renouvellement = ré-émission quand expiré ; dropdown course-edit ; testé) |
| P3 | P2 | Progression de leçon binaire : `LessonProgress.progress_percent` jamais alimenté (complétion = bouton manuel), alors qu'un scroll-spy existe. | `enrollment/models.py:52` | ✅ (endpoint `POST /lesson/{id}/progress/` + service `record_lesson_progress` monotone/clampé sans compléter ; scroll-spy lesson-view auditTime 1 s, POST à chaque +10 % ; testé) |
| P4 | P3 | Pas d'avis/notes apprenants sur les cours (pas de preuve sociale ni boucle de feedback). | `course/models.py` | ⬜ |
| P5 | P3 | Pas de fil de discussion / Q&A pédagogique par leçon (réutiliser le pattern thread/message de `QuizAlert*`). | `enrollment/models.py:205`, `quiz/models.py:500` | ⬜ |
| P6 | P3 | Manuel utilisateur absent en IT/ES alors que l'UI expose 5 langues (FR/EN/NL/IT/ES). | `docs/manual/` | ⬜ |

## F. Qualité / dette

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| Q1 | P3 | Logique métier (~85 lignes) dans `QuizViewSet.create` alors qu'un `quiz/services.py` existe → non réutilisable / dur à tester hors HTTP. | `quiz/views.py:587` | ⬜ |

## G. Commercial / Facturation (spec validée 2026-07-26)

Nouvelle app `billing` attachée au **Domaine** (chaque domaine = une organisation cliente ; l'admin du domaine est le payeur).

**Décisions verrouillées :**
- **Entité de facturation** = le Domaine.
- **Prix mensuel HTVA** = `20 € × (1 + ⌈membres ⁄ 100⌉)` → 1-100 : 40 € · 101-200 : 60 € · 201-300 : 80 € · +20 €/tranche de 100.
- **Décompte** = tous les **membres du domaine** (simple, prévisible).
- **Offre gratuite** = champ `plan` (`free`/`paid`) + date `free_until` (deadline). Avant l'échéance : 0 €.
- **Paiement** = **facturation manuelle** pour commencer (l'app calcule le prix + suit l'état à jour/en retard ; encaissement hors plateforme). Stripe = phase 2.
- **Application** :
  - Avant la deadline → **bandeau + emails de rappel** (J-14 / J-3), rien de bloqué.
  - Deadline dépassée sans conversion → **blocage complet** du domaine (contenu suspendu), sauf l'admin qui garde accès à la **page d'abonnement** pour régulariser.
- **Tâche beat** quotidienne (réutilise le pattern des rappels d'invitation) : recalcule `member_count`, envoie les rappels, applique le blocage post-deadline.

| # | Prio | Constat | Référence | État |
|---|------|---------|-----------|------|
| G1 | P1 | App `billing` : modèle sur Domaine (`plan`, `free_until`, `member_count`, prix dérivé), page « Abonnement » dans l'admin de domaine, tâche beat (rappels + blocage post-deadline), garde d'accès (lecture bloquée hors admin quand suspendu). Paiement manuel (Stripe = phase 2). | app `billing` (à créer), `domain/models.py`, `config/settings_base.py` (beat) | ⬜ (spec prête) |
