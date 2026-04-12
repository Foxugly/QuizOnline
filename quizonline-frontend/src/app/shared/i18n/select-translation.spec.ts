import {LanguageEnum} from '../../api/generated';
import {selectTranslation} from './select-translation';

describe('selectTranslation', () => {
  it('returns null when translations are undefined', () => {
    expect(selectTranslation(undefined, LanguageEnum.Fr)).toBeNull();
  });

  it('returns null when translations are null', () => {
    expect(selectTranslation(null, LanguageEnum.Fr)).toBeNull();
  });

  it('returns the requested language when available', () => {
    expect(
      selectTranslation(
        {
          fr: {name: 'Nom'},
          en: {name: 'Name'},
        },
        LanguageEnum.En,
      ),
    ).toEqual({name: 'Name'});
  });
});
