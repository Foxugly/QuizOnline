import { Injectable, inject} from '@angular/core';
import {map, Observable} from 'rxjs';
import {LanguageApi as LanguageApiService} from '../../api/generated/api/language.service';
import {LanguageReadDto} from '../../api/generated/model/language-read';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
    private readonly api = inject(LanguageApiService);
  private readonly router = inject(Router);
  list(params?: { name?: string; search?: string }): Observable<LanguageReadDto[]> {
    return this.api.langList({}).pipe(map((response: any) => response.results ?? []));
  }
}
