import {provideHttpClient} from '@angular/common/http';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';

import {Preferences} from './preferences';

describe('Preferences', () => {
  let component: Preferences;
  let fixture: ComponentFixture<Preferences>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Preferences],
      providers: [provideHttpClient(), provideRouter([])],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Preferences);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
