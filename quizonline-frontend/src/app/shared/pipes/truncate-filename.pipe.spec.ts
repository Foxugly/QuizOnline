import {TruncateFilenamePipe} from './truncate-filename.pipe';

describe('TruncateFilenamePipe', () => {
  const pipe = new TruncateFilenamePipe();

  it('returns empty string for null / undefined / empty input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('returns the filename unchanged when shorter than max length', () => {
    expect(pipe.transform('photo.jpg')).toBe('photo.jpg');
  });

  it('preserves the extension when the stem is too long', () => {
    const long = 'file_fsdifsqdf65q4sd65qs4d6q5s4d6qsdQSD846qddfgsdg.jpg';
    const result = pipe.transform(long);

    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith('.jpg')).toBeTrue();
    expect(result.startsWith('file_fsdifsqdf')).toBeTrue();
    expect(result).toContain('...');
  });

  it('honours a custom max length', () => {
    expect(pipe.transform('verylongfilename.png', 15).length).toBeLessThanOrEqual(15);
  });

  it('falls back to plain ellipsis when there is no usable extension', () => {
    const noExt = 'somelongidentifierwithoutanyextension';
    const result = pipe.transform(noExt);

    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith('...')).toBeTrue();
  });

  it('treats a long suffix (>8 chars) as part of the stem, not an extension', () => {
    const input = 'archive_with_long_extension.something';
    const result = pipe.transform(input);

    expect(result.length).toBeLessThanOrEqual(30);
    expect(result.endsWith('...')).toBeTrue();
  });
});
