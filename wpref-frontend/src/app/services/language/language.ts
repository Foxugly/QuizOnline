import { Injectable } from '@angular/core';
import {map, Observable} from 'rxjs';
import {LanguageApi, LanguageReadDto} from '../../api/generated';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  constructor(private api: LanguageApi, private router: Router) {
  }
  list(params?: { name?: string; search?: string }): Observable<LanguageReadDto[]> {
    return this.api.langList().pipe(map((response) => response.results ?? []));
  }
}
