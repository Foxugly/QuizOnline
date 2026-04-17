import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {SubjectEditorFormComponent} from './subject-editor-form';
import {UserService} from '../../services/user/user';

describe('SubjectEditorFormComponent', () => {
  let fixture: ComponentFixture<SubjectEditorFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectEditorFormComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SubjectEditorFormComponent);
    fixture.componentRef.setInput('form', new FormGroup({translations: new FormGroup({})}));
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
