# QuizOnline i18n → Transloco (JSON) — Plan de migration

> **Statut :** en cours (branche `feat/scss-standard`). Option « lourde » validée : catalogues JSON
> + moteur Transloco, fidèle au pattern flotte (réf **PushIT_frontend**). NE PAS merger dans `main`
> (auto-deploy). Build **vert** + tests **verts** + commit à chaque stage.

**Goal :** QuizOnline utilise le moteur Transloco (provider, autorité de langue, switcher, setup de test,
spec de parité) avec des **catalogues JSON** 5 langues (fr/nl/en/it/es), en conservant la façade signaux
existante (`UiTextService`) pour ne PAS churner les ~269 sites d'appel simples.

**Contrainte clé :** JSON ne peut pas contenir de fonctions. L'i18n QO a **93 clés-fonction**
(INTERP=72, PLURAL=15, LOGIC=6) → il faut sortir cette logique du catalogue vers du code.

## Architecture cible

- **Moteur** : `provideTransloco` + `BundledTranslocoLoader` (retourne `CATALOGS[lang]`, pas d'HTTP,
  comme PushIT). Autorité de langue = `UserService.lang()` (déjà en minuscules `en/fr/nl/it/es`,
  clé localStorage `'lang'`), synchronisée vers `TranslocoService.setActiveLang()`. Aucun `| transloco`
  requis dans les templates — la façade rend, Transloco est là pour la conformité + les tests.
- **Façade** : `UiTextService.ui()/editor()/localized(getter)` **inchangée** (signaux computed).
- **Catalogues** : TS → JSON.
  - Cœur : `shared/i18n/ui-text/{lang}.json` + `editor-ui-text/{lang}.json` ; `index.ts` importe le JSON
    (`satisfies UiText`), `types.ts` conservé (clés-fonction retypées, voir ci-dessous).
  - Pages : `<page>.i18n.json` (structure `{ en, fr, nl, it, es }`) + `<page>.i18n.ts` = getter mince.
- **Helpers** (`shared/i18n/format.ts`, testés) :
  - `interp(tpl: string, params): string` — remplace `{clé}` par `params[clé]`.
  - `plural(forms: {one, other}, n, params): string` — choisit la forme puis interpole.
- **Retypage des clés-fonction dans `types.ts`** :
  - INTERP `(a)=>string` → `string` (template `"...{a}..."`).
  - PLURAL `(n)=>string` → `{ one: string; other: string }`.
  - LOGIC → objet de templates (voir utils).
- **Utils LOGIC** (6 clés → `shared/i18n/*.util.ts`, testés) :
  - `notifications.relative` → `{ justNow, minutesAgo:"{n} min ago", hoursAgo, daysAgo }`
    + `formatRelativeTime(sec, copy)`. Conso : `relative-date.pipe.ts`, `notifications.ts`,
    `notifications-bell.ts`.
  - `notifications.kindLine` → objet de templates par type (`joinRequestCreated`,
    `joinRequestApproved`, `joinRequestRejected`, `joinRequestExpiry`, `inviteReceived`,
    `transferReceived`, `quizAssignment`, `quizCompleted`, `quizResult`, `quizDetail`) +
    `buildNotificationLine(kind, payload, copy)`. Conso : `notifications.ts`, `notifications-bell.ts`.
  - `catalog.duration` + `question-import.durationFormat` → `formatDuration(minOrSec, copy)`
    (`shared/utils/duration.util.ts`).
  - `analytics-tab.auditAction` + `domain-edit.actionLabel`/`join-requests.actionLabel` →
    `labelForAction(code, copy)` (lookup dans un objet JSON `actionLabels`).

## Stages (chacun : build vert + tests verts + commit)

### Stage 1 — Fondation + catalogues cœur (prouve le pattern de bout en bout)
- `tsconfig.json` : `resolveJsonModule: true`.
- `shared/i18n/format.ts` (`interp`, `plural`) + `format.spec.ts`.
- `shared/i18n/notifications.util.ts` (`formatRelativeTime`, `buildNotificationLine`) + spec.
- Convertir `ui-text` + `editor-ui-text` en JSON (5 langues) ; retyper `types.ts` ; `index.ts` importe le JSON.
- Mettre à jour les 12 sites d'appel cœur (relative/kindLine/plurals/interp).
- Infra Transloco : `core/i18n/transloco-loader.ts`, `core/i18n/catalogs.ts` (cœur), `provideTransloco`
  dans `app.config.ts`, sync `UserService.lang()` → Transloco.
- `src/test-setup.ts` : `beforeEach` `TranslocoTestingModule.forRoot` (réf standard §131, runner vitest).
- `shared/i18n/locale-parity.spec.ts` (parité des clés fr/nl/en/it/es sur `CATALOGS`).

### Stage 2 — Catalogues page (40 fichiers, 24 à fonctions), par lots
- Par lot : `<page>.i18n.ts` → `.i18n.json` + getter mince ; traiter INTERP/PLURAL/LOGIC ;
  mettre à jour les consommateurs ; brancher dans `CATALOGS` (pour la parité).

### Stage final
- Remplacer/adapter `scripts/check-i18n.ts` par la spec de parité (ou l'adapter au JSON).
- Vérifier `app-language-switcher` (nommage/a11y standard).
- PR sur `feat/scss-standard`. PAS de merge.

## Vérification
- `npm run build` (vert), `npm test` (vert), `npm run check:i18n` (ou la spec de parité).
- Chaque clé-fonction supprimée du type = 0 `=>` résiduel dans les catalogues (`grep -F "=>"`).
