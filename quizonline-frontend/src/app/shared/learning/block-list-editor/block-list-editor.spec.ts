import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {MessageService} from 'primeng/api';
import {beforeEach, describe, expect, it} from 'vitest';

import {BlockListEditor} from './block-list-editor';
import {ContentBlock} from '../content-block.types';

describe('BlockListEditor unsaved changes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({imports: [BlockListEditor], providers: [MessageService, provideHttpClient(), provideHttpClientTesting()]});
    TestBed.overrideComponent(BlockListEditor, {set: {imports: [], template: '<div></div>'}});
  });

  function render() {
    const f = TestBed.createComponent(BlockListEditor);
    f.componentRef.setInput('blocks', [{id: 7, block_type: 'rich_text', block_role: 'body', order: 0, translations: {}}] as unknown as ContentBlock[]);
    f.componentRef.setInput('hostType', 'lesson');
    f.componentRef.setInput('hostId', 1);
    f.detectChanges();
    return f.componentInstance;
  }

  it('reports unsaved changes while a block is in edit mode', () => {
    const c = render();
    expect(c.hasUnsavedChanges()).toBe(false);
    c['editBlock'](7);
    expect(c.hasUnsavedChanges()).toBe(true);
    c['cancelBlock'](7);
    expect(c.hasUnsavedChanges()).toBe(false);
  });

  it('counts a freshly created block as unsaved until it is cancelled', () => {
    const c = render();
    c['addBlock']('rich_text');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.method === 'POST').flush({id: 9, block_type: 'rich_text'});
    expect(c.hasUnsavedChanges()).toBe(true);
  });

  it('resets edit state when the host changes and deletes abandoned fresh drafts', () => {
    const f = TestBed.createComponent(BlockListEditor);
    f.componentRef.setInput('blocks', [{id: 7, block_type: 'rich_text', block_role: 'body', order: 0, translations: {}}] as unknown as ContentBlock[]);
    f.componentRef.setInput('hostType', 'lesson');
    f.componentRef.setInput('hostId', 1);
    f.detectChanges();
    const c = f.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    c['editBlock'](7);
    c['addBlock']('rich_text');
    http.expectOne((r) => r.method === 'POST').flush({id: 9, block_type: 'rich_text'});
    expect(c.hasUnsavedChanges()).toBe(true);

    f.componentRef.setInput('blocks', []);
    f.componentRef.setInput('hostId', 2);
    f.detectChanges();

    expect(c.hasUnsavedChanges()).toBe(false);
    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/block/9/')).flush(null);
    http.expectNone((r) => r.method === 'DELETE' && r.url.endsWith('/block/7/'));
    http.verify();
  });
});
