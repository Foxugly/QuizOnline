import { Injectable } from '@angular/core';
import {map, Observable} from 'rxjs';
import {LanguageService as LanguageApiService, LanguageRead} from '../../api/generated';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  constructor(private api: LanguageApiService, private router: Router) {
  }
  list(params?: { name?: string; search?: string }): Observable<LanguageRead[]> {
    return this.api.langList().pipe(map((response: any) => response.results ?? []));
  }
}
