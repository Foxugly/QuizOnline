import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormGroup, FormControl} from '@angular/forms';
import {UserAdminFormComponent} from './user-admin-form';

describe('UserAdminFormComponent', () => {
  let fixture: ComponentFixture<UserAdminFormComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserAdminFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(UserAdminFormComponent);
    fixture.componentRef.setInput('form', new FormGroup({
      username: new FormControl(''),
      email: new FormControl(''),
      first_name: new FormControl(''),
      last_name: new FormControl(''),
      language: new FormControl('fr'),
      password: new FormControl(''),
      nb_domain_max: new FormControl(0),
      is_active: new FormControl(true),
      password_change_required: new FormControl(false),
    }));
    fixture.componentRef.setInput('languageOptions', [{label: 'Francais', value: 'fr'}]);
  });
  it('should create', () => expect(fixture.componentInstance).toBeTruthy());
});
