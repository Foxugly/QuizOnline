import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {FormGroup, FormControl} from '@angular/forms';
import {DomainEditorFormComponent} from './domain-editor-form';
import {UserService} from '../../services/user/user';

describe('DomainEditorFormComponent', () => {
  let fixture: ComponentFixture<DomainEditorFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DomainEditorFormComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DomainEditorFormComponent);
    fixture.componentRef.setInput('form', new FormGroup({translations: new FormGroup({})}));
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
