import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MessageService} from 'primeng/api';
import {By} from '@angular/platform-browser';
import {provideRouter} from '@angular/router';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {BlockListEditor} from '../block-list-editor/block-list-editor';
import {LessonContentEditor} from './lesson-content-editor';

describe('LessonContentEditor', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<LessonContentEditor>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LessonContentEditor],
      providers: [MessageService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LessonContentEditor);
  });

  afterEach(() => {
    http.match(() => true);
  });

  function load(id: number, body: object): void {
    fixture.componentRef.setInput('lessonId', id);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith(`/lesson/${id}/`)).flush(body);
    fixture.detectChanges();
  }

  it('loads the lesson for the given id and reloads when the id changes', () => {
    load(5, {id: 5, blocks: [], translations: {fr: {title: 'A'}}});
    fixture.componentRef.setInput('lessonId', 6);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/lesson/6/')).flush({id: 6, blocks: [], translations: {fr: {title: 'B'}}});
    http.verify();
  });

  it('revalidates lesson reads so a block refetch never hits the 30 s browser cache', () => {
    fixture.componentRef.setInput('lessonId', 5);
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.endsWith('/lesson/5/'));
    expect(req.request.cache).toBe('no-cache');
    req.flush({id: 5, blocks: []});
  });

  it('emits navigate with the next lesson id', () => {
    load(5, {id: 5, blocks: [], next_lesson: {id: 7, title: 'N'}});
    let navigated = 0;
    fixture.componentInstance.navigate.subscribe((id: number) => (navigated = id));
    const btn = fixture.nativeElement.querySelector('[data-testid="next-lesson"] button') as HTMLButtonElement;
    btn.click();
    expect(navigated).toBe(7);
  });

  function startRename(): HTMLInputElement {
    const h2 = fixture.nativeElement.querySelector('h2.lesson-pane__title') as HTMLElement;
    h2.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('input.lesson-pane__title-input') as HTMLInputElement;
  }

  it('renames the lesson and emits titleChanged with the trimmed title', () => {
    load(5, {id: 5, blocks: [], translations: {fr: {title: 'A'}}});
    const emitted: {id: number; title: string}[] = [];
    fixture.componentInstance.titleChanged.subscribe((e: {id: number; title: string}) => emitted.push(e));
    const input = startRename();
    expect(input.value).toBe('A');
    input.value = '  Nouveau  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    const req = http.expectOne((r) => r.url.endsWith('/lesson/5/') && r.method === 'PATCH');
    expect(req.request.body).toEqual({translations: {fr: {title: 'Nouveau'}}});
    req.flush({id: 5, blocks: [], translations: {fr: {title: 'Nouveau'}}});
    fixture.detectChanges();
    expect(emitted).toEqual([{id: 5, title: 'Nouveau'}]);
    expect((fixture.nativeElement.querySelector('h2') as HTMLElement).textContent).toContain('Nouveau');
  });

  it('sends nothing when the rename is blank or cancelled', () => {
    load(5, {id: 5, blocks: [], translations: {fr: {title: 'A'}}});
    let input = startRename();
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    fixture.detectChanges();
    http.expectNone((r) => r.method === 'PATCH');
    expect(fixture.nativeElement.querySelector('input.lesson-pane__title-input')).toBeNull();

    input = startRename();
    input.value = 'Autre';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();
    http.expectNone((r) => r.method === 'PATCH');
    expect((fixture.nativeElement.querySelector('h2') as HTMLElement).textContent).toContain('A');
  });

  it('reports no unsaved changes', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('forwards the block list unsaved state', () => {
    load(5, {id: 5, blocks: [{id: 3, block_type: 'rich_text', block_role: 'body', order: 0, translations: {}}]});
    const c = fixture.componentInstance;
    expect(c.hasUnsavedChanges()).toBe(false);
    const list = fixture.debugElement.query(By.directive(BlockListEditor)).componentInstance as BlockListEditor;
    list['editBlock'](3);
    expect(c.hasUnsavedChanges()).toBe(true);
  });
});
