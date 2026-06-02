import {TestBed} from '@angular/core/testing';
import {StatusBadgeComponent} from './status-badge';

function make(kind: string) {
  const fixture = TestBed.createComponent(StatusBadgeComponent);
  fixture.componentRef.setInput('kind', kind);
  fixture.componentRef.setInput('label', 'x');
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('StatusBadgeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({imports: [StatusBadgeComponent]});
  });

  it('maps positive states (active, published, access-open) to success', () => {
    expect(make('active').severity()).toBe('success');
    expect(make('published').severity()).toBe('success');
    expect(make('access-open').severity()).toBe('success');
  });

  it('maps neutral states (inactive, draft) to secondary — grey, not danger', () => {
    expect(make('inactive').severity()).toBe('secondary');
    expect(make('draft').severity()).toBe('secondary');
  });

  it('maps access modes to informative severities', () => {
    expect(make('access-approval').severity()).toBe('warn');
    expect(make('access-invite').severity()).toBe('info');
  });

  it('exposes an icon per kind', () => {
    expect(make('inactive').icon()).toBe('pi pi-ban');
    expect(make('draft').icon()).toBe('pi pi-file-edit');
  });
});
