import {ComponentFixture, TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {QuestionPreviewDialogComponent} from './question-preview-dialog';
import {QuestionService} from '../../services/question/question';

describe('QuestionPreviewDialogComponent', () => {
  let fixture: ComponentFixture<QuestionPreviewDialogComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionPreviewDialogComponent],
      providers: [
        {provide: QuestionService, useValue: {retrieve: () => of(null)}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuestionPreviewDialogComponent);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
