import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Router} from '@angular/router';
import {map, Observable} from 'rxjs';
import {ROUTES} from '../../app.routes-paths';
import {DomainApi as DomainApiService} from '../../api/generated/api/domain.service';
import {DomainDetailDto} from '../../api/generated/model/domain-detail';
import {DomainReadDto} from '../../api/generated/model/domain-read';
import {DomainWriteRequestDto} from '../../api/generated/model/domain-write-request';
import {PatchedDomainPartialRequestDto} from '../../api/generated/model/patched-domain-partial-request';
import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export type DomainTranslationDto = { name: string; description: string;};
export type DomainOption = { name: string; id: number };
export type DomainTranslations = Record<string, DomainTranslationDto>;

@Injectable({
  providedIn: 'root',
})
export class DomainService {
  private readonly apiBaseUrl = `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/domain`;

      private readonly api = inject(DomainApiService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  list(params?: { name?: string; search?: string }): Observable<DomainReadDto[]> {
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

  availableForLinking(): Observable<DomainReadDto[]> {
    return this.http.get<DomainReadDto[]>(`${this.apiBaseUrl}/available-for-linking/`);
  }

  retrieve(domainId: number): Observable<DomainReadDto> {
    return this.api.domainRetrieve({domainId});
  }

  detail(domainId: number): Observable<DomainDetailDto> {
    return this.api.domainDetailsRetrieve({domainId});
  }

  create(payload: DomainWriteRequestDto): Observable<DomainReadDto> {
    return this.api.domainCreate({domainWriteRequestDto: payload});
  }

  update(domainId: number, payload: DomainWriteRequestDto): Observable<DomainReadDto> {
    return this.api.domainUpdate({domainId, domainWriteRequestDto: payload});
  }

  updatePartial(domainId: number, payload:PatchedDomainPartialRequestDto): Observable<DomainReadDto> {
    return this.api.domainPartialUpdate({domainId, patchedDomainPartialRequestDto: payload});
  }

  delete(domainId: number): Observable<void> {
    return this.api.domainDestroy({domainId}).pipe(map(() => void 0));
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
