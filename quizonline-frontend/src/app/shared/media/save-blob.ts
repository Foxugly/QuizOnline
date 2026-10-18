/**
 * Hand a Blob fetched through the authenticated ``HttpClient`` to the
 * browser as a file download. Used for private files (certificate PDFs)
 * that have no public URL and therefore cannot be a plain ``<a href>``.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
