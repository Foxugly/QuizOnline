const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function isYoutubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url.trim()).hostname.toLowerCase();
    return YOUTUBE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    if (hostname === 'youtu.be' || hostname === 'www.youtu.be') {
      return isValidVideoId(pathParts[0]) ? pathParts[0] : null;
    }

    if (!YOUTUBE_HOSTS.has(hostname)) {
      return null;
    }

    if (pathParts[0] === 'watch') {
      const videoId = parsed.searchParams.get('v') ?? '';
      return isValidVideoId(videoId) ? videoId : null;
    }

    if (['embed', 'shorts', 'live', 'v'].includes(pathParts[0] ?? '')) {
      const videoId = pathParts[1] ?? '';
      return isValidVideoId(videoId) ? videoId : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function toCanonicalYoutubeUrl(url: string): string | null {
  const videoId = extractYoutubeVideoId(url);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function toYoutubeEmbedUrl(url: string): string | null {
  const videoId = extractYoutubeVideoId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function isValidVideoId(value: string | undefined): value is string {
  return !!value && /^[A-Za-z0-9_-]{11}$/.test(value);
}
