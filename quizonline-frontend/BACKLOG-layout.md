# Backlog — layout · quizonline-frontend

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`) ; réf complète = `FoxRunner_frontend`
> (+ app runnable `foxugly-ops/frontend-reference/foo-app`).
> **Statut : conforme — DÉPLOYÉ.** Seul reste optionnel : formaliser le shell en composants layout (différé).
> Monorepo — front sous `quizonline-frontend/`.

## ✅ Fait + déployé (quizonline.foxugly.com)
- `app-topmenu` (BEM `topbar__*`), cloches msg + notif, `app-user-menu`, `app-page-header` (3-col slots),
  About `p-tabs`, `app-empty-state` + skeletons, Turnstile (register/forgot).
- **i18n maison → Transloco** : 52 catalogues JSON 5 langues + façade `UiTextService` conservée
  (93 clés-fonction converties, logique extraite en utils). (`0ed70aa`)
- **Thème / dark mode** : `ThemeService` + toggle **borderless** + anti-FOUC + tokens **emerald canoniques**
  (navy → `--accent #10b981`, `--mat-sys-*` mort retiré). (`e31e439`)
- **PrimeFlex retiré** ; **`lang-select` → `app-language-switcher`** (`core/i18n/`).
- **Auth email-only** : `USERNAME_FIELD='email'`, colonne `username` droppée (migration data-safe),
  `*_username`→`*_name` (nom complet), login par email. (`43c0b0a`)
- **Chrome dans `core/layout/`** : `topmenu` + `footer` relocalisés depuis `components/`. (`ca4eeb8`)
- **Largeur unique** : toutes les largeurs de contenu (topbar/page/footer + `$page-max-width` + mixin
  `detail-page-shell`) alignées sur **`var(--content-max)` (80rem)** — plus aucun `1440px`.
- **Breakpoints canoniques** : 480/720/960/1180 → **640/768/1024/1280** (drawer topmenu à 1024).

## Reste — optionnel (différé)
- [ ] **Shell formalisé** : extraire `main-layout` / `public-layout` sous `core/layout/` + `[mode]` sur le
  topmenu (aujourd'hui shell simple assemblé dans `app.html`, skip-link + `p-toast` présents). **Faible
  valeur** pour le shell mono de QO (pas de vraie séparation public/authentifié) → non prioritaire.

## Note
- Le sélecteur de domaine (Domaines) est spécifique à QuizOnline → à conserver dans les actions.
