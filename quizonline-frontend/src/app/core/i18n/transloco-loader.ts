import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Translation, TranslocoLoader} from '@jsverse/transloco';

/**
 * Loader HTTP standard de la flotte (STANDARD-frontend-layout.md §5bis) : les
 * catalogues vivent dans ``public/i18n/<lang>.json`` et sont servis en assets
 * statiques.
 *
 * Remplace le loader « bundle » qui lisait ``core/i18n/catalogs.ts``, lequel
 * reconstruisait les memes donnees a partir des JSON embarques. Transloco et le
 * registre lisent desormais rigoureusement les memes fichiers.
 */
@Injectable({providedIn: 'root'})
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}
