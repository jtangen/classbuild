/** Trigger a browser download for a string blob or a Blob. */
export function downloadFile(
  content: string | Blob,
  filename: string,
  type = 'text/html',
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
