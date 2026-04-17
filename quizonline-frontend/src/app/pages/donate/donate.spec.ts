import {ComponentFixture, TestBed} from '@angular/core/testing';
import {signal} from '@angular/core';

import {Donate} from './donate';
import {UserService} from '../../services/user/user';

describe('Donate', () => {
  let fixture: ComponentFixture<Donate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Donate],
      providers: [
        {
          provide: UserService,
          useValue: {currentLang: 'fr', currentUser: signal(null)},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Donate);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have sponsor URL', () => {
    expect(fixture.componentInstance['sponsorUrl']).toContain('github.com/sponsors');
  });
});
