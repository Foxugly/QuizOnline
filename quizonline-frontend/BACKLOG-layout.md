# Backlog — harmonisation layout · quizonline-frontend (A21)

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`) ; réf = `FoxRunner_frontend`.
> **Statut : ~45 % conforme** (audit exhaustif 2026-07-11). Travailler sur branche **`feat/scss-standard`** — **jamais `main`** (auto-deploy).

## ✅ Déjà conforme (bonne base)
- `app-page-header` (3-col + slots), `app-empty-state`, skeletons (`loading-skeleton`/`table-skeleton`).
- Chrome : `app-topmenu` (BEM `topbar__`), `app-user-menu` polymorphe, cloches message+notif, `app-footer` (version runtime), `app-lang-select` (5 langues, popup a11y, codes majuscules).
- Shell : skip-link `common.skip_to_content`→`#main-content`, `<main id>`, `<p-toast>` unique, footer collé.
- Pages : About (p-tabs Company/Legal/Technical), Features, Home, Privacy, Donate ; auth (login/register **Turnstile ✓**/reset/confirm/magic).
- **i18n 5 langues** (fr/nl/en/it/es) — mais via **UiTextService maison** (`shared/i18n/ui-text/*.ts`), pas Transloco.

## Lot 1 — Fondation CSS (safe, indépendant du look)
- [ ] **`_tokens.scss`** : remplacer la palette **navy/slate** (`$accent:#1e2c38`, `--color-slate-*`) par le **set canonique** (emerald `--accent*`, `--ink*`, `--muted`, `--surface`/`--surface-2`, `--border`, `--chrome-*`, `--success/--warn/--danger`, `--content-max`/`--content-pad`, `--radius*`) + `.dark-mode`.
- [ ] **`_breakpoints.scss`** : 640/768/1024/1280 + mixin `below()`.
- [ ] **Largeur** : `max-width: 1440px` → `var(--content-max)` (80rem) — `app.scss:25`, `topmenu.scss:30`, `_layout.scss:4`, footer.
- [ ] **Breakpoints topmenu** : 1180→**1024**, 960→768, 480→640 (`topmenu.scss:299/306/360`).
- [ ] **ThemeService + dark toggle + anti-FOUC** (copie FoxRunner) ; `darkModeSelector:'.dark-mode'` ; toggle rectangulaire (ordre thème→langue→user).
- [ ] **Retrait PrimeFlex** (4 usages seulement) : `certificate-view.html:55`, `certificate-list.html:52`, `domain-list.html:95` (`p-badge`), `domain-join-requests.html:1` (`p-4`) + désinstaller la dép.

## Lot 2 — i18n maison → Transloco (gros, indépendant du look)
- [ ] Installer/configurer **Transloco** (provideTransloco 5 langues + loader) ; setup de test global.
- [ ] Migrer `shared/i18n/ui-text/{fr,nl,en,it,es}.ts` → catalogues Transloco (contenu 5 langues **déjà là**).
- [ ] Remplacer `UiTextService.ui` → `| transloco` / `TranslocoService` dans les templates.

## Lot 3 — Polissage
- [ ] `components/topmenu` + `components/footer` → **`core/layout/`**.
- [ ] `[mode]` public/authenticated formalisé au topmenu ; severities (ex. « Ajouter domaine » `primary`→`success`).
- [ ] Grilles collections → `repeat(auto-fit, minmax(16rem,1fr))` là où pertinent (sinon `p-table` OK).
- [ ] (optionnel) `app-auth-card` partagé login/register ; vérifier dark mode footer.

_Effort estimé : Lot 1 ~13 h · Lot 2 ~49 h · Lot 3 ~9 h._
