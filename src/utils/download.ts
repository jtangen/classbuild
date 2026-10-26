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
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously can cancel the download before the browser has
  // read the blob (Safari/Firefox); keep it alive briefly, as FileSaver does.
  setTimeout(() => URL.revokeObjectURL(url), 40_000);
}
