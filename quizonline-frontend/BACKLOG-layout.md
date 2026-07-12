# Backlog — layout · quizonline-frontend

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`) ; réf complète = `FoxRunner_frontend`
> (+ app runnable `foxugly-ops/frontend-reference/foo-app`).
> **Statut : conforme sur le fond (thème, i18n, tokens, auth) — DÉPLOYÉ.** Reste des items **structurels**
> (relocalisation chrome + breakpoints + largeur). Monorepo — front sous `quizonline-frontend/`.

## ✅ Fait + déployé (quizonline.foxugly.com)
- `app-topmenu` (BEM `topbar__*`), cloches msg + notif, `app-user-menu`, `app-page-header` (3-col slots),
  About `p-tabs`, `app-empty-state` + skeletons, Turnstile (register/forgot).
- **i18n maison → Transloco** : 52 catalogues JSON 5 langues + façade `UiTextService` conservée
  (93 clés-fonction converties, logique extraite en utils). Déployé (`0ed70aa`).
- **Thème / dark mode** : `ThemeService` + toggle **borderless** + anti-FOUC + tokens **emerald canoniques**
  (navy → `--accent #10b981`, `--mat-sys-*` mort retiré). Déployé (`e31e439`).
- **PrimeFlex retiré** (dép + usages) ; **`lang-select` → `app-language-switcher`** (relocalisé `core/i18n/`).
- **Auth email-only** : `USERNAME_FIELD='email'`, colonne `username` droppée (migration data-safe),
  `*_username`→`*_name` (nom complet), login par email. Déployé (`43c0b0a`).

## Reste — structurel (relocalisation chrome + grille)
- [ ] **Topmenu** : `components/topmenu/` → **`core/layout/topmenu/`**.
- [ ] **Footer** : `components/footer/` → **`core/layout/footer/`** (vérifier version runtime + segments std).
- [ ] **Shell** : formaliser `main-layout`/`public-layout` sous **`core/layout/`** (aujourd'hui assemblé dans
  `app.html` ; skip-link + `p-toast` déjà présents).
- [ ] **Breakpoints** : remplacer les non-canoniques (**480 / 720 / 960 / 1180**) par l'échelle
  `sm 640 / md 768 / lg 1024 / xl 1280` (`_breakpoints.scss` + mixin `below()` déjà en place) ; drawer topmenu à **1024**.
- [ ] **Largeur** : `max-width: 1440px` (`app.scss:25`, `topmenu.scss:30`) → **`var(--content-max)` (80rem)**
  pour aligner topbar/page/footer.

## Note
- Le sélecteur de domaine (Domaines) est spécifique à QuizOnline → à conserver dans les actions.
