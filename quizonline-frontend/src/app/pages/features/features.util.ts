/**
 * Features-page composition logic extracted from the (now JSON) catalog.
 *
 * The page renders each section with a structural icon/slug layout that is the
 * SAME across every language, merged with the per-language copy. JSON cannot
 * hold that merge (nor the non-translatable icon layout), so the layout defs
 * and the pure ``buildFeaturesUiText`` builder live here while the translatable
 * copy lives in ``features.i18n.json``.
 */

/** A single rendered feature card (icon + localized copy). */
export type FeatureItem = {
  icon: string;
  title: string;
  description: string;
};

/** A rendered feature section (structural icon/slug + localized copy). */
export type FeatureSection = {
  slug: string;
  icon: string;
  badge: string;
  title: string;
  intro: string;
  features: FeatureItem[];
};

/** The fully composed, render-ready features view text. */
export type FeaturesUiText = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: FeatureSection[];
};

/** Localized copy for a single feature card (from JSON). */
export type FeatureContent = {title: string; description: string};

/** Localized copy for a single section (from JSON). */
export type SectionContent = {
  badge: string;
  title: string;
  intro: string;
  features: Record<string, FeatureContent>;
};

/** Localized copy for the whole page (one per language, from JSON). */
export type FeaturesContent = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaPrimary: string;
  ctaSecondary: string;
  ctaLoggedIn: string;
  sections: Record<string, SectionContent>;
};

type SectionDef = {
  slug: string;
  icon: string;
  features: ReadonlyArray<{key: string; icon: string}>;
};

/**
 * Non-translatable structural layout: section order, section icons and the
 * per-feature icons. Shared verbatim by every language.
 */
export const SECTION_DEFS: ReadonlyArray<SectionDef> = [
  {
    slug: 'domains',
    icon: 'pi-th-large',
    features: [
      {key: 'roles', icon: 'pi-users'},
      {key: 'policies', icon: 'pi-key'},
      {key: 'requests', icon: 'pi-user-plus'},
      {key: 'bulkModeration', icon: 'pi-check-square'},
      {key: 'multiInvite', icon: 'pi-share-alt'},
      {key: 'analytics', icon: 'pi-chart-bar'},
      {key: 'transferOwnership', icon: 'pi-arrow-right-arrow-left'},
      {key: 'auditLog', icon: 'pi-history'},
      {key: 'notifications', icon: 'pi-envelope'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'languageGate', icon: 'pi-filter'},
    ],
  },
  {
    slug: 'subjects',
    icon: 'pi-tags',
    features: [
      {key: 'crud', icon: 'pi-folder-open'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'tagging', icon: 'pi-link'},
      {key: 'autoCreate', icon: 'pi-bolt'},
    ],
  },
  {
    slug: 'questions',
    icon: 'pi-question-circle',
    features: [
      {key: 'multipleChoice', icon: 'pi-list'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'images', icon: 'pi-image'},
      {key: 'videos', icon: 'pi-video'},
      {key: 'youtube', icon: 'pi-youtube'},
      {key: 'modes', icon: 'pi-flag'},
      {key: 'explanations', icon: 'pi-info-circle'},
      {key: 'aiTranslate', icon: 'pi-sparkles'},
      {key: 'importExport', icon: 'pi-file-import'},
      {key: 'duplicate', icon: 'pi-clone'},
    ],
  },
  {
    slug: 'quizzes',
    icon: 'pi-stopwatch',
    features: [
      {key: 'modes', icon: 'pi-bolt'},
      {key: 'timer', icon: 'pi-clock'},
      {key: 'window', icon: 'pi-calendar'},
      {key: 'visibility', icon: 'pi-eye'},
      {key: 'notifyUnlock', icon: 'pi-bell'},
      {key: 'shuffle', icon: 'pi-sort-alt'},
      {key: 'public', icon: 'pi-globe'},
      {key: 'assignment', icon: 'pi-send'},
      {key: 'emails', icon: 'pi-envelope'},
      {key: 'messages', icon: 'pi-comments'},
      {key: 'scoring', icon: 'pi-chart-line'},
      {key: 'pdf', icon: 'pi-file-pdf'},
      {key: 'tracking', icon: 'pi-history'},
    ],
  },
  {
    slug: 'learning',
    icon: 'pi-graduation-cap',
    features: [
      {key: 'catalog', icon: 'pi-th-list'},
      {key: 'structure', icon: 'pi-sitemap'},
      {key: 'blocks', icon: 'pi-th-large'},
      {key: 'editor', icon: 'pi-pencil'},
      {key: 'calloutVariants', icon: 'pi-palette'},
      {key: 'translations', icon: 'pi-language'},
      {key: 'viewAsLearner', icon: 'pi-eye'},
      {key: 'publish', icon: 'pi-send'},
      {key: 'safeHtml', icon: 'pi-shield'},
      {key: 'multilingual', icon: 'pi-globe'},
    ],
  },
  {
    slug: 'enrollment',
    icon: 'pi-id-card',
    features: [
      {key: 'modes', icon: 'pi-key'},
      {key: 'invites', icon: 'pi-user-plus'},
      {key: 'progress', icon: 'pi-chart-line'},
      {key: 'validationQuiz', icon: 'pi-check-square'},
      {key: 'finalQuiz', icon: 'pi-flag'},
      {key: 'certificates', icon: 'pi-file-pdf'},
      {key: 'verification', icon: 'pi-search-plus'},
      {key: 'emails', icon: 'pi-envelope'},
      {key: 'analytics', icon: 'pi-chart-bar'},
      {key: 'dashboard', icon: 'pi-home'},
    ],
  },
  {
    slug: 'platform',
    icon: 'pi-cog',
    features: [
      {key: 'auth', icon: 'pi-shield'},
      {key: 'magicLink', icon: 'pi-link'},
      {key: 'notificationPrefs', icon: 'pi-bell'},
      {key: 'multilingual', icon: 'pi-globe'},
      {key: 'outbox', icon: 'pi-inbox'},
      {key: 'dashboard', icon: 'pi-chart-bar'},
      {key: 'diagnostics', icon: 'pi-server'},
      {key: 'rateLimit', icon: 'pi-lock'},
      {key: 'api', icon: 'pi-code'},
    ],
  },
];

/**
 * Merge the non-translatable layout (``SECTION_DEFS``) with a language's copy
 * into the render-ready view text. Preserves section and feature order from the
 * layout and ignores any extra copy keys not present in the layout.
 */
export function buildFeaturesUiText(content: FeaturesContent): FeaturesUiText {
  return {
    eyebrow: content.eyebrow,
    title: content.title,
    intro: content.intro,
    ctaPrimary: content.ctaPrimary,
    ctaSecondary: content.ctaSecondary,
    ctaLoggedIn: content.ctaLoggedIn,
    sections: SECTION_DEFS.map((def) => {
      const sec = content.sections[def.slug];
      return {
        slug: def.slug,
        icon: def.icon,
        badge: sec.badge,
        title: sec.title,
        intro: sec.intro,
        features: def.features.map((f) => {
          const featureContent = sec.features[f.key];
          return {
            icon: f.icon,
            title: featureContent.title,
            description: featureContent.description,
          };
        }),
      };
    }),
  };
}
