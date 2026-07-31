import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';

import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {RootCatalog, registerCatalogs} from './catalog-registry';

const LANGS: readonly string[] = [
  LanguageEnumDto.Fr,
  LanguageEnumDto.En,
  LanguageEnumDto.Nl,
  LanguageEnumDto.It,
  LanguageEnumDto.Es,
];

/**
 * Charge les 5 catalogues depuis ``public/i18n/`` et remplit le registre
 * (STANDARD-frontend-layout.md §5bis).
 *
 * Les 5 langues sont prechargees, pas seulement l'active : ``UserService.lang()``
 * change a chaud (preferences, connexion) et tous les getters sont synchrones —
 * aller chercher la langue au moment du basculement rendrait ces lectures
 * asynchrones et remonterait la contrainte jusqu'aux consommateurs.
 */
@Injectable({providedIn: 'root'})
export class CatalogLoader {
  private readonly http = inject(HttpClient);

  async preload(): Promise<void> {
    const entries = await Promise.all(
      LANGS.map(async (lang) => {
        const catalog = await firstValueFrom(this.http.get<RootCatalog>(`/i18n/${lang}.json`));
        return [lang, catalog] as const;
      }),
    );
    registerCatalogs(Object.fromEntries(entries));
  }
}
