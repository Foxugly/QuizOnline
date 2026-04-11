import {
  extractYoutubeVideoId,
  isYoutubeUrl,
  toCanonicalYoutubeUrl,
  toYoutubeEmbedUrl,
} from './youtube';

describe('youtube helpers', () => {
  it('recognizes valid youtube hosts', () => {
    expect(isYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeTrue();
    expect(isYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBeTrue();
    expect(isYoutubeUrl('https://example.com/watch?v=dQw4w9WgXcQ')).toBeFalse();
  });

  it('extracts a video id from supported youtube urls', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=43')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('normalizes and converts valid youtube urls', () => {
    expect(toCanonicalYoutubeUrl('https://youtu.be/dQw4w9WgXcQ?t=43'))
      .toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(toYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('rejects invalid youtube urls', () => {
    expect(toCanonicalYoutubeUrl('https://www.youtube.com/watch?feature=share')).toBeNull();
    expect(toYoutubeEmbedUrl('https://example.com/video')).toBeNull();
  });
});
