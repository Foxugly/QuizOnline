import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';

import {StatisticComponent} from './statistic';

describe('StatisticComponent', () => {
  let fixture: ComponentFixture<StatisticComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticComponent);
    fixture.componentRef.setInput('label', 'Durée');
    fixture.componentRef.setInput('value', '10 min');
    fixture.detectChanges();
  });

  it('renders the label and value in two stacked spans', () => {
    const label = fixture.debugElement.query(By.css('.statistic__label')).nativeElement as HTMLElement;
    const value = fixture.debugElement.query(By.css('.statistic__value')).nativeElement as HTMLElement;

    expect(label.textContent?.trim()).toBe('Durée');
    expect(value.textContent?.trim()).toBe('10 min');
  });

  it('reflects input updates', () => {
    fixture.componentRef.setInput('label', 'Questions');
    fixture.componentRef.setInput('value', '3');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Questions');
    expect(fixture.nativeElement.textContent).toContain('3');
  });
});
