import { Injectable, inject} from '@angular/core';
import {map, Observable, of, shareReplay, tap} from 'rxjs';
import {LanguageApi as LanguageApiService} from '../../api/generated/api/language.service';
import {LanguageReadDto} from '../../api/generated/model/language-read';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
    private readonly api = inject(LanguageApiService);
  private readonly router = inject(Router);

  /** TTL cache for the unfiltered language list. The catalogue +
   *  domain-edit + several form widgets all call ``list()`` on
   *  mount; without a cache, every navigation between these pages
   *  re-hits the backend even though the language catalogue is
   *  basically immutable. 10 minutes is comfortable — admin
   *  language toggles are rare, and the next user reload picks
   *  them up regardless. */
  private readonly listCacheTtlMs = 10 * 60_000;
  private listCache: {at: number; data: LanguageReadDto[]} | null = null;

  list(params?: { name?: string; search?: string }): Observable<LanguageReadDto[]> {
    const cached = this.listCache;
    if (cached && Date.now() - cached.at < this.listCacheTtlMs) {
      return of(cached.data);
    }
    return this.api.langList({}).pipe(
      map((response: any) => (response.results ?? []) as LanguageReadDto[]),
      tap((data) => {
        this.listCache = {at: Date.now(), data};
      }),
      shareReplay({bufferSize: 1, refCount: true}),
    );
  }
}
