import {isFrameableUrl} from './frame-policy';

describe('isFrameableUrl (audit M14)', () => {
  it('accepts the CSP frame-src hosts over https', () => {
    expect(isFrameableUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    expect(isFrameableUrl('https://player.vimeo.com/video/1')).toBe(true);
  });

  it('refuses everything else', () => {
    expect(isFrameableUrl('http://www.youtube.com/embed/x')).toBe(false);
    expect(isFrameableUrl('https://www.youtube.com.evil.example/embed/x')).toBe(false);
    expect(isFrameableUrl('https://codepen.io/x/embed/y')).toBe(false);
    expect(isFrameableUrl('javascript:alert(1)')).toBe(false);
    expect(isFrameableUrl('')).toBe(false);
    expect(isFrameableUrl(null)).toBe(false);
  });
});
