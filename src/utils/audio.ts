/**
 * Audio persistence helpers.
 *
 * In-session, narrated audio is held as a blob: URL (fast, cheap). But blob URLs
 * die on reload AND are stripped from the persisted store, so audio used to
 * vanish after a refresh. To make it durable we ALSO persist a base64 data: URI
 * of the MP3 — capped, so a very long chapter can't re-bloat the saved snapshot
 * (which is what stalled IndexedDB writes and lost content in the first place).
 */

/** ~6 MB of base64 ≈ ~4.5 MB MP3 ≈ ~4–5 min of narration. Above this we don't
 *  persist the audio (it re-narrates from the saved transcript next session)
 *  so the persisted course JSON stays small and saves reliably. */
export const MAX_PERSISTED_AUDIO_CHARS = 6_000_000;

export function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Returns a data: URI for the audio blob suitable for persistence, or undefined
 * if it's too large to keep the saved snapshot lean (caller should then persist
 * only the transcript so the audio re-narrates on demand).
 */
export async function persistableAudioDataUri(blob: Blob): Promise<string | undefined> {
  try {
    const uri = await blobToDataUri(blob);
    return uri.length <= MAX_PERSISTED_AUDIO_CHARS ? uri : undefined;
  } catch {
    return undefined;
  }
}
