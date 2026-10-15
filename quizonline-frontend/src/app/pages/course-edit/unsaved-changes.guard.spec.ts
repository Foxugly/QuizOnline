import {afterEach, describe, expect, it, vi} from 'vitest';
import {unsavedChangesGuard} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lets through when nothing is unsaved', () => {
    const confirm = vi.spyOn(window, 'confirm');
    expect(unsavedChangesGuard({hasUnsavedChanges: () => false}, {} as never, {} as never, {} as never)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks when something is unsaved and blocks on refusal', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(unsavedChangesGuard({hasUnsavedChanges: () => true}, {} as never, {} as never, {} as never)).toBe(false);
    expect(confirm).toHaveBeenCalled();
  });

  it('lets through when the author confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(unsavedChangesGuard({hasUnsavedChanges: () => true}, {} as never, {} as never, {} as never)).toBe(true);
  });
});
