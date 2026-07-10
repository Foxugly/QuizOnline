# Backlog — harmonisation layout · quizonline-frontend

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`).
> Écart principal : **pas de thème** + **i18n maison à migrer vers Transloco**.
> **Statut :** à faire (audit 2026-07-10).

## ✅ Déjà conforme
- `app-topmenu` · BEM `topbar__*` ; cloches msg + notif ; `app-user-menu` + login « Se connecter ».
- `app-language-switcher` (5 langues, popup a11y) ; `app-page-header` 3 colonnes (slots).
- About en `p-tabs` (Company/Legal/Technical) ; Features en SCSS ; `app-empty-state` + skeletons.

## Phase 1 — structurel
- [ ] **Thème** : ajouter **toggle + `ThemeService`** + dark mode (aujourd'hui Aura light figé) → `localStorage['theme']`, `.dark-mode`, **anti-FOUC**.
- [ ] **Topmenu** : déplacer `components/topmenu/` → **`core/layout/topmenu/`**.
- [ ] **Breakpoints** : 960/1180 → échelle standard ; topmenu drawer à **1024**.
- [ ] **Shell** : formaliser `main`/`public-layout` sous `core/layout/` (aujourd'hui assemblé dans `app.html` ; skip-link + `p-toast` déjà présents).
- [ ] **Footer** : déplacer `components/footer/` → `core/layout/footer/` ; vérifier version runtime.
- [ ] **Largeur** : `--content-max: 80rem` / `--content-pad: 1.5rem`, fonds pleine largeur.
- [ ] **CSS** : retirer PrimeFlex (~30 usages, léger).

## Phase 2 — i18n
- [ ] **Migrer l'i18n maison** (`UiTextService` + `ui-text/*.ts`) → **Transloco** (garder les 5 langues, aligner le switcher sur la réf TM).

## Note
- Le sélecteur de domaine (Domaines) est spécifique à QuizOnline → à conserver dans les actions.
