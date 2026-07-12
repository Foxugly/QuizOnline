import {buildFeaturesUiText, SECTION_DEFS, type FeaturesContent} from './features.util';

function makeContent(): FeaturesContent {
  const sections: FeaturesContent['sections'] = {};
  for (const def of SECTION_DEFS) {
    const features: FeaturesContent['sections'][string]['features'] = {};
    for (const f of def.features) {
      features[f.key] = {title: `${f.key} title`, description: `${f.key} desc`};
    }
    // Extra copy key not present in the layout — must be ignored.
    features['__unused__'] = {title: 'nope', description: 'nope'};
    sections[def.slug] = {
      badge: `${def.slug} badge`,
      title: `${def.slug} title`,
      intro: `${def.slug} intro`,
      features,
    };
  }
  return {
    eyebrow: 'Eyebrow',
    title: 'Title',
    intro: 'Intro',
    ctaPrimary: 'Primary',
    ctaSecondary: 'Secondary',
    ctaLoggedIn: 'LoggedIn',
    sections,
  };
}

describe('buildFeaturesUiText', () => {
  it('preserves the section order and icons from the layout', () => {
    const ui = buildFeaturesUiText(makeContent());
    expect(ui.sections.map((s) => s.slug)).toEqual(SECTION_DEFS.map((d) => d.slug));
    expect(ui.sections.map((s) => s.icon)).toEqual(SECTION_DEFS.map((d) => d.icon));
  });

  it('merges layout icons with localized copy per feature and ignores extra keys', () => {
    const ui = buildFeaturesUiText(makeContent());
    const domains = ui.sections[0];
    expect(domains.badge).toBe('domains badge');
    expect(domains.features.length).toBe(SECTION_DEFS[0].features.length);
    expect(domains.features[0]).toEqual({
      icon: SECTION_DEFS[0].features[0].icon,
      title: `${SECTION_DEFS[0].features[0].key} title`,
      description: `${SECTION_DEFS[0].features[0].key} desc`,
    });
  });

  it('carries the top-level CTA copy through', () => {
    const ui = buildFeaturesUiText(makeContent());
    expect(ui.ctaPrimary).toBe('Primary');
    expect(ui.ctaLoggedIn).toBe('LoggedIn');
  });
});
