import {describe, expect, it} from 'vitest';

import {getLocalizedDomainName} from './domain-label';

describe('getLocalizedDomainName', () => {
  it('returns an empty label for a missing domain', () => {
    expect(getLocalizedDomainName(null, 'fr')).toBe('');
    expect(getLocalizedDomainName(undefined, 'fr')).toBe('');
  });

  it('prefers the requested language, trimmed', () => {
    const d = {id: 1, translations: {fr: {name: ' Maths '}, nl: {name: 'Wiskunde'}}};
    expect(getLocalizedDomainName(d, 'nl')).toBe('Wiskunde');
    expect(getLocalizedDomainName(d, 'fr')).toBe('Maths');
  });

  it('falls back along fr → en → nl → it → es when the language is missing or blank', () => {
    const d = {id: 1, translations: {it: {name: 'Matematica'}, en: {name: 'Math'}, es: {name: ' '}}};
    expect(getLocalizedDomainName(d, 'es')).toBe('Math');
    expect(getLocalizedDomainName(d, null)).toBe('Math');
  });

  it('uses any other translation before the #id placeholder', () => {
    expect(getLocalizedDomainName({id: 1, translations: {de: {name: 'Mathe'}}}, 'fr')).toBe('Mathe');
    expect(getLocalizedDomainName({id: 7, translations: {de: {}}}, 'fr')).toBe('#7');
    expect(getLocalizedDomainName({id: 0, translations: null}, 'fr')).toBe('#0');
    expect(getLocalizedDomainName({translations: {}}, 'fr')).toBe('');
  });
});
