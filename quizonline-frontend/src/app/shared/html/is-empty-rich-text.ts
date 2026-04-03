export function isEmptyRichText(html: string): boolean {
  const cleaned = (html ?? '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();

  return cleaned.length === 0;
}
