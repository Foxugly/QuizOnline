import {LanguageEnumDto} from '../../api/generated/model/language-enum';

/**
 * Registre des catalogues i18n, charges depuis ``public/i18n/<lang>.json``
 * (STANDARD-frontend-layout.md §5bis).
 *
 * Pourquoi un singleton de module et pas un service injectable : tout l'i18n de
 * cette app passe par des fonctions PURES ``getXxxUiText(lang)`` — le
 * dictionnaire du shell, celui de l'editeur, et les 50 dictionnaires de page.
 * Ces fonctions ne sont pas dans un contexte d'injection. Les convertir en
 * services aurait touche les ~126 fichiers consommateurs ; les faire lire ce
 * registre n'en touche aucun.
 *
 * Le remplissage se fait une fois, au bootstrap, via un APP_INITIALIZER attendu
 * avant le premier rendu (voir ``app.config.ts``). Apres quoi les lectures sont
 * synchrones et ne peuvent plus echouer, exactement comme avant la migration ou
 * les catalogues etaient embarques dans le bundle.
 */
export type RootCatalog = {
  ui: unknown;
  editor: unknown;
  pages: Record<string, unknown>;
};

/**
 * Le registre est porte par ``globalThis`` et non par une variable de module.
 *
 * Sous le runner de tests navigateur, le fichier de setup est bundle
 * separement du code applicatif : les deux obtiennent alors leur PROPRE copie
 * de ce module, et le remplissage fait d'un cote reste invisible de l'autre.
 * Constate le 2026-07-31 — 30 fichiers de spec echouaient avec « catalogues non
 * charges » alors que le setup les avait bien enregistres. Passer par un global
 * rend l'identite du module sans objet.
 */
const REGISTRY_KEY = '__quizonline_i18n_catalogs__';

type Registry = {[REGISTRY_KEY]?: Map<string, RootCatalog>};

function store(): Map<string, RootCatalog> {
  const host = globalThis as unknown as Registry;
  host[REGISTRY_KEY] ??= new Map<string, RootCatalog>();
  return host[REGISTRY_KEY];
}

/** Langue de repli : celle qui est toujours complete. */
const FALLBACK = LanguageEnumDto.En as string;

/** Appele une seule fois au bootstrap. */
export function registerCatalogs(catalogs: Record<string, RootCatalog>): void {
  const catalogs_ = store();
  catalogs_.clear();
  for (const [lang, catalog] of Object.entries(catalogs)) {
    catalogs_.set(lang, catalog);
  }
}

function root(lang: LanguageEnumDto | string | null | undefined): RootCatalog {
  const catalogs = store();
  const catalog = catalogs.get(lang as string) ?? catalogs.get(FALLBACK);
  if (catalog === undefined) {
    throw new Error(
      'Catalogues i18n non charges — registerCatalogs() doit etre appele au bootstrap.',
    );
  }
  return catalog;
}

/** Dictionnaire du shell (topmenu, login, footer, home, preferences, …). */
export function shellUiText<T>(lang: LanguageEnumDto | string | null | undefined): T {
  return root(lang).ui as T;
}

/** Dictionnaire editeur / admin. */
export function editorUiText<T>(lang: LanguageEnumDto | string | null | undefined): T {
  return root(lang).editor as T;
}

/**
 * Dictionnaire d'une page. ``slug`` est derive du nom de fichier lors de la
 * fusion des catalogues (``question-editor-form.i18n.json`` →
 * ``questionEditorForm``).
 */
export function pageUiText<T>(
  slug: string,
  lang: LanguageEnumDto | string | null | undefined,
): T {
  const pages = root(lang).pages;
  const page = pages[slug];
  if (page !== undefined) {
    return page as T;
  }
  // Une page traduite partiellement ne doit pas casser : on retombe sur EN.
  return (root(FALLBACK).pages[slug] ?? {}) as T;
}
