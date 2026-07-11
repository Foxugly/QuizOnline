import {Injectable} from '@angular/core';
import {Translation, TranslocoLoader} from '@jsverse/transloco';
import {of} from 'rxjs';

import {CATALOGS} from './catalogs';

/**
 * Synchronous, bundled Transloco loader (fleet convention, ref PushIT_frontend).
 * Returns the in-memory catalog for ``lang`` — no HTTP round-trip.
 */
@Injectable({providedIn: 'root'})
export class BundledTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of((CATALOGS[lang as keyof typeof CATALOGS] ?? {}) as Translation);
  }
}
