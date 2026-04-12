import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {map, Observable} from 'rxjs';
import {ROUTES} from '../../app.routes-paths';
import {
  DomainService as DomainApiService,
  DomainDetail,
  DomainRead,
  DomainWriteRequest,
  PatchedDomainPartialRequest
} from '../../api/generated';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type DomainTranslationDto = { name: string; description: string;};
export type DomainOption = { name: string; id: number };
export type DomainTranslations = Record<string, DomainTranslationDto>;

@Injectable({
  providedIn: 'root',
})
export class DomainService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

    constructor(private api: DomainApiService, private router: Router, private http: HttpClient) {
  }

  list(params?: { name?: string; search?: string }): Observable<DomainRead[]> {
    return this.api.domainList().pipe(
      map((response: any) => {
        const domains = response.results ?? [];
        const nameFilter = params?.name?.trim().toLowerCase();
        const searchFilter = params?.search?.trim().toLowerCase();

        if (!nameFilter && !searchFilter) {
          return domains;
        }

        return domains.filter((domain: any) => {
          const translations = Object.values(domain.translations ?? {}) as DomainTranslationDto[];
          const haystack = translations
            .flatMap((translation) => [
              translation.name ?? '',
              translation.description ?? '',
            ])
            .join(' ')
            .toLowerCase();

          const matchesName = !nameFilter || haystack.includes(nameFilter);
          const matchesSearch = !searchFilter || haystack.includes(searchFilter);
          return matchesName && matchesSearch;
        });
      }),
    );
  }

  availableForLinking(): Observable<DomainRead[]> {
    return this.http.get<DomainRead[]>(`${this.apiBaseUrl}/available-for-linking/`);
  }

  retrieve(domainId: number): Observable<DomainRead> {
    return this.api.domainRetrieve(domainId);
  }

  detail(domainId: number): Observable<DomainDetail> {
    return this.api.domainDetailsRetrieve(domainId);
  }

  create(payload: DomainWriteRequest): Observable<DomainRead> {
    return this.api.domainCreate(payload);
  }

  update(domainId: number, payload: DomainWriteRequest): Observable<DomainRead> {
    return this.api.domainUpdate(domainId, payload);
  }

  updatePartial(domainId: number, payload:PatchedDomainPartialRequest): Observable<DomainRead> {
    return this.api.domainPartialUpdate(domainId, payload);
  }

  delete(domainId: number): Observable<void> {
    return this.api.domainDestroy(domainId).pipe(map(() => void 0));
  }

  goNew(): void {
    this.router.navigate(ROUTES.domain.add());
  }

  goList(): void {
    this.router.navigate(ROUTES.domain.list());
  }

  goBack(): void {
    this.router.navigate(ROUTES.domain.list());
  }

  goEdit(domainId: number): void {
    this.router.navigate(ROUTES.domain.edit(domainId));
  }

  goDelete(domainId: number): void {
    this.router.navigate(ROUTES.domain.delete(domainId));
  }
}
