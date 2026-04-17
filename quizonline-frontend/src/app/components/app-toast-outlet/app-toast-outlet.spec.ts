import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AppToastOutletComponent} from './app-toast-outlet';
import {AppToastService} from '../../shared/toast/app-toast.service';

describe('AppToastOutletComponent', () => {
  let fixture: ComponentFixture<AppToastOutletComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppToastOutletComponent],
      providers: [
        {provide: AppToastService, useValue: {messages: () => [], remove: () => {}}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AppToastOutletComponent);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
