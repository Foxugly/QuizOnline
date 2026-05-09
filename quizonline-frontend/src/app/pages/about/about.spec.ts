import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';

import {About} from './about';
import {UserService} from '../../services/user/user';

describe('About', () => {
  let fixture: ComponentFixture<About>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [About],
      providers: [
        {
          provide: UserService,
          useValue: {currentLang: 'fr', currentUser: signal(null)},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default to company tab', () => {
    expect(fixture.componentInstance['activeTab']()).toBe('company');
  });
});
