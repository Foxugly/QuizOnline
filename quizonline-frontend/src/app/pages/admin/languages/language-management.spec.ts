import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {of} from 'rxjs';
import {provideRouter} from '@angular/router';
import {LanguageManagementPage} from './language-management';
import {LanguageApi as LanguageApiService} from '../../../api/generated/api/language.service';
import {UserService} from '../../../services/user/user';

describe('LanguageManagementPage', () => {
  let fixture: ComponentFixture<LanguageManagementPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageManagementPage],
      providers: [
        provideRouter([]),
        {provide: LanguageApiService, useValue: {langList: () => of({results: []})}},
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LanguageManagementPage);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
