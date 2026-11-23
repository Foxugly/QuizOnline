import {DestroyRef, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Subject, throwError} from 'rxjs';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {AppToastService} from '../toast/app-toast.service';
import {runSave, RunSaveContext} from './run-save';

describe('runSave', () => {
  let ctx: RunSaveContext;
  let toast: {add: ReturnType<typeof vi.fn>; addApiError: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    toast = {add: vi.fn(), addApiError: vi.fn()};
    ctx = {
      saving: signal(false),
      lastSavedAt: signal<Date | null>(null),
      destroyRef: TestBed.inject(DestroyRef),
      toast: toast as unknown as AppToastService,
    };
  });

  it('flags saving while in flight, then runs the success branch', () => {
    const source = new Subject<number>();
    const onSuccess = vi.fn();
    runSave(ctx, source, {onSuccess, successDetail: 'Saved', errorDetail: 'Failed', bumpSavedAt: true});

    expect(ctx.saving()).toBe(true);
    source.next(42);
    source.complete();

    expect(ctx.saving()).toBe(false);
    expect(onSuccess).toHaveBeenCalledWith(42);
    expect(ctx.lastSavedAt?.()).toBeInstanceOf(Date);
    expect(toast.add).toHaveBeenCalledWith({severity: 'success', detail: 'Saved'});
  });

  it('stays quiet without successDetail and leaves lastSavedAt alone unless asked', () => {
    const source = new Subject<string>();
    runSave(ctx, source, {onSuccess: vi.fn(), errorDetail: 'Failed'});
    source.next('ok');
    source.complete();
    expect(toast.add).not.toHaveBeenCalled();
    expect(ctx.lastSavedAt?.()).toBeNull();
  });

  it('reports errors through onError and an API error toast', () => {
    const err = {status: 400};
    const onError = vi.fn();
    const onSuccess = vi.fn();
    runSave(ctx, throwError(() => err), {onSuccess, onError, errorDetail: 'Failed'});

    expect(ctx.saving()).toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
    expect(toast.addApiError).toHaveBeenCalledWith(err, 'Failed');
  });

  it('works without onError', () => {
    runSave(ctx, throwError(() => 'x'), {onSuccess: vi.fn(), errorDetail: 'Failed'});
    expect(toast.addApiError).toHaveBeenCalledWith('x', 'Failed');
  });
});
