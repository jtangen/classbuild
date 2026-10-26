import type { GeneratedChapter } from '../../types/course';
import { isSafeMediaUrl } from '../../utils/url';

/**
 * Read a chapter's narration as a Blob for packaging into a ZIP.
 *
 * Tries the in-session blob: URL first, then the durable data: URI — a blob
 * URL can be dead (revoked, or from another session), so a failed read falls
 * through to the next source instead of giving up. Only URLs the app itself
 * produces are read: stored values can come from an imported project file.
 * Returns null when no source yields audio.
 */
export async function readChapterAudio(
  chapter: Pick<GeneratedChapter, 'audioUrl' | 'audioDataUri'>,
): Promise<Blob | null> {
  for (const src of [chapter.audioUrl, chapter.audioDataUri]) {
    if (!isSafeMediaUrl(src, 'audio')) continue;
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size > 0) return blob;
    } catch {
      /* dead blob URL or unreadable data URI — try the next source */
    }
  }
  return null;
}

/** True when the chapter claims to have narration (whether or not it's readable). */
export function hasChapterAudio(chapter: Pick<GeneratedChapter, 'audioUrl' | 'audioDataUri'>): boolean {
  return !!(chapter.audioUrl || chapter.audioDataUri);
}
