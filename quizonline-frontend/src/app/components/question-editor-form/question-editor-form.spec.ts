import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';
import {FormGroup, FormControl, FormArray} from '@angular/forms';
import {QuestionEditorFormComponent} from './question-editor-form';
import {UserService} from '../../services/user/user';

describe('QuestionEditorFormComponent', () => {
  let fixture: ComponentFixture<QuestionEditorFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionEditorFormComponent],
      providers: [
        {provide: UserService, useValue: {currentLang: 'fr', currentUser: signal(null), isAdmin: () => false, isSuperuser: () => false}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuestionEditorFormComponent);
    fixture.componentRef.setInput('form', new FormGroup({
      domain_id: new FormControl(0),
      subject_ids: new FormControl([]),
      media: new FormControl(null),
      translations: new FormGroup({}),
      answers: new FormArray([]),
    }));
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
