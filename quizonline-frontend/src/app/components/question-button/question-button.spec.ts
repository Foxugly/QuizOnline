import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {QuestionButton} from './question-button';

describe('QuestionButton', () => {
  let component: QuestionButton;
  let fixture: ComponentFixture<QuestionButton>;
  let buttonEl: HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionButton]
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionButton);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', '3');
    fixture.detectChanges();
    buttonEl = fixture.debugElement.query(By.css('button.question-button')).nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the label inside the native button', () => {
    expect(buttonEl.textContent?.trim()).toBe('3');
  });

  it('applies the backgroundColor input as inline style on the visible button', () => {
    fixture.componentRef.setInput('backgroundColor', '#e3f2fd');
    fixture.detectChanges();

    expect(buttonEl.style.background).toContain('rgb(227, 242, 253)');
  });

  it('applies the borderColor and borderWidth inputs', () => {
    fixture.componentRef.setInput('borderColor', '#1976d2');
    fixture.componentRef.setInput('borderWidth', '2px');
    fixture.detectChanges();

    expect(buttonEl.style.borderColor).toBe('rgb(25, 118, 210)');
    expect(buttonEl.style.borderWidth).toBe('2px');
    expect(buttonEl.style.borderStyle).toBe('solid');
  });

  it('reflects the textColor input', () => {
    fixture.componentRef.setInput('textColor', '#0d47a1');
    fixture.detectChanges();

    expect(buttonEl.style.color).toBe('rgb(13, 71, 161)');
  });

  it('emits "clicked" when the button is pressed', () => {
    let received: MouseEvent | undefined;
    component.clicked.subscribe((event: MouseEvent) => (received = event));

    buttonEl.click();

    expect(received).toBeDefined();
  });

  it('disables the native button when the disabled input is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(buttonEl.disabled).toBeTrue();
  });

  it('updates styles reactively when an input changes', () => {
    fixture.componentRef.setInput('backgroundColor', '#f2f2f2');
    fixture.detectChanges();
    expect(buttonEl.style.background).toContain('rgb(242, 242, 242)');

    // simulate the parent flipping the item to answered
    fixture.componentRef.setInput('backgroundColor', '#e3f2fd');
    fixture.detectChanges();

    expect(buttonEl.style.background).toContain('rgb(227, 242, 253)');
  });
});
