import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {JoinPolicyEnumDto} from '../../api/generated/model/join-policy-enum';
import {LanguageEnumDto} from '../../api/generated/model/language-enum';
import {QuestionReadDto} from '../../api/generated/model/question-read';
import {QuizNav, QuizNavItem} from './quiz-nav';

function makeQuestion(answerOptions: {id: number; is_correct: boolean | null}[] = []): QuestionReadDto {
  return {
    id: 1,
    domain: {
      id: 1,
      translations: {},
      allowed_languages: [],
      active: true,
      subjects_count: 0,
      questions_count: 0,
      owner: {id: 1, username: 'owner'},
      managers: [],
      members: [],
      created_at: '',
      updated_at: '',
      join_policy: JoinPolicyEnumDto.Auto,
      pending_join_requests_count: null,
      my_join_request_status: null,
    },
    translations: {
      [LanguageEnumDto.Fr]: {title: 'Q', description: '', explanation: ''},
    },
    allow_multiple_correct: false,
    active: true,
    is_mode_practice: true,
    is_mode_exam: true,
    subjects: [],
    answer_options: answerOptions.map((opt) => ({
      id: opt.id,
      content: '',
      translations: {},
      is_correct: opt.is_correct,
      sort_order: opt.id,
    })),
    media: [],
    created_at: '',
  } as unknown as QuestionReadDto;
}

function makeItem(overrides: Partial<QuizNavItem> = {}): QuizNavItem {
  return {
    index: 1,
    id: 100,
    answered: false,
    flagged: false,
    question: makeQuestion(),
    selectedOptionIds: [],
    ...overrides,
  };
}

describe('QuizNav', () => {
  let component: QuizNav;
  let fixture: ComponentFixture<QuizNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizNav],
    }).compileComponents();

    fixture = TestBed.createComponent(QuizNav);
    component = fixture.componentInstance;
  });

  function buttons(): HTMLButtonElement[] {
    return fixture.debugElement
      .queryAll(By.css('button.question-button'))
      .map((el) => el.nativeElement as HTMLButtonElement);
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders a button per item, labelled with item.index', () => {
    fixture.componentRef.setInput('items', [makeItem({index: 1}), makeItem({index: 2}), makeItem({index: 3})]);
    fixture.detectChanges();

    const labels = buttons().map((b) => b.textContent?.trim());
    expect(labels).toEqual(['1', '2', '3']);
  });

  it('renders an answered item with the blue background', () => {
    fixture.componentRef.setInput('items', [makeItem({answered: true})]);
    fixture.detectChanges();

    const [btn] = buttons();
    expect(btn.style.background).toContain('rgb(227, 242, 253)'); // #e3f2fd
  });

  it('renders a not-answered item with the default gray background', () => {
    fixture.componentRef.setInput('items', [makeItem({answered: false})]);
    fixture.detectChanges();

    const [btn] = buttons();
    expect(btn.style.background).toContain('rgb(242, 242, 242)'); // #f2f2f2
  });

  it('renders a flagged item with the red border', () => {
    fixture.componentRef.setInput('items', [makeItem({flagged: true})]);
    fixture.detectChanges();

    const [btn] = buttons();
    expect(btn.style.borderColor).toBe('rgb(211, 47, 47)'); // #d32f2f
    expect(btn.style.borderWidth).toBe('3px');
  });

  it('flips a button to blue when the same items array reports the matching item as answered', () => {
    const item = makeItem({answered: false});
    fixture.componentRef.setInput('items', [item]);
    fixture.detectChanges();
    expect(buttons()[0].style.background).toContain('rgb(242, 242, 242)');

    // setCurrentItem in question-view replaces the array reference and the item.
    fixture.componentRef.setInput('items', [{...item, answered: true}]);
    fixture.detectChanges();

    expect(buttons()[0].style.background).toContain('rgb(227, 242, 253)');
  });

  it('emits questionSelected with the item index on click', () => {
    fixture.componentRef.setInput('items', [makeItem({index: 7})]);
    fixture.detectChanges();
    let emitted: number | undefined;
    component.questionSelected.subscribe((idx: number) => (emitted = idx));

    buttons()[0].click();

    expect(emitted).toBe(7);
  });

  describe('review mode', () => {
    const opts = [
      {id: 1, is_correct: true},
      {id: 2, is_correct: false},
    ];

    it('paints an answered item green when its selection matches the correct options', () => {
      fixture.componentRef.setInput('reviewMode', true);
      fixture.componentRef.setInput('items', [
        makeItem({answered: true, selectedOptionIds: [1], question: makeQuestion(opts)}),
      ]);
      fixture.detectChanges();

      expect(buttons()[0].style.background).toContain('rgb(220, 252, 231)'); // #dcfce7
    });

    it('paints an answered item red when its selection misses the correct options', () => {
      fixture.componentRef.setInput('reviewMode', true);
      fixture.componentRef.setInput('items', [
        makeItem({answered: true, selectedOptionIds: [2], question: makeQuestion(opts)}),
      ]);
      fixture.detectChanges();

      expect(buttons()[0].style.background).toContain('rgb(254, 226, 226)'); // #fee2e2
    });
  });
});
