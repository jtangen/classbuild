import type { Syllabus, GeneratedChapter, WeeklyChallengeData } from '../../types/course';
import { renderChapterHtml, getTheme } from '../../themes';
import {
  buildCodexViewerHtml,
  type CodexChapterData,
} from '../../templates/codexCourseSiteTemplate';

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Assembles a self-contained, multi-file course SITE as a zip — the same shape
 * as the example courses at courses.classbuild.ai. Unzips to:
 *
 *   index.html              Codex viewer (sidebar, tabs, welcome)
 *   chapters/NN.html        themed reading
 *   quizzes/NN.html         gamified practice quiz (chapter theme)
 *   challenges/NN.html      weekly mastery challenge (chapter theme)
 *   slides/chNN/slide-MM.jpg  rendered slide images
 *   audio/NN.mp3            audiobook narration
 *
 * Discussion + activities are rendered natively inside index.html. A tab/file
 * only appears when its data exists. Returns the zip as a Blob.
 */
export async function assemblePublishSite(
  syllabus: Syllabus,
  chapters: GeneratedChapter[],
  themeId?: string,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // Code-split material templates (optional — degrade gracefully if missing).
  let buildQuizHtml:
    | ((title: string, data: string, course: string, theme?: string) => string)
    | null = null;
  try {
    buildQuizHtml = (await import('../../templates/quizTemplate')).buildQuizHtml;
  } catch {
    /* quiz template unavailable */
  }

  let buildChallengeHtml:
    | ((title: string, data: WeeklyChallengeData, course: string, theme?: string) => string)
    | null = null;
  try {
    buildChallengeHtml = (await import('../../templates/weeklyChallengeTemplate'))
      .buildWeeklyChallengeHtml;
  } catch {
    /* challenge template unavailable */
  }

  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  const chapterData: CodexChapterData[] = [];

  for (const ch of sorted) {
    const nn = pad2(ch.number);
    const syllCh = syllabus.chapters.find((c) => c.number === ch.number);
    const data: CodexChapterData = {
      number: ch.number,
      title: ch.title,
      narrative: syllCh?.narrative,
    };

    // Reading — themed, standalone HTML document.
    if (ch.htmlContent) {
      zip.file(`chapters/${nn}.html`, renderChapterHtml(ch.htmlContent, themeId, ch.title));
      data.chapterHtmlPath = `chapters/${nn}.html`;
    }

    // Practice quiz.
    if (ch.practiceQuizData && buildQuizHtml) {
      try {
        zip.file(
          `quizzes/${nn}.html`,
          buildQuizHtml(`${ch.title} — Practice Quiz`, ch.practiceQuizData, syllabus.courseTitle, themeId),
        );
        data.quizHtmlPath = `quizzes/${nn}.html`;
      } catch {
        /* quiz build failed — omit tab */
      }
    }

    // Weekly challenge.
    if (ch.weeklyChallengeData?.questions?.length && buildChallengeHtml) {
      try {
        zip.file(
          `challenges/${nn}.html`,
          buildChallengeHtml(
            `Week ${ch.number} Challenge — ${ch.title}`,
            ch.weeklyChallengeData,
            syllabus.courseTitle,
            themeId,
          ),
        );
        data.challengeHtmlPath = `challenges/${nn}.html`;
      } catch {
        /* challenge build failed — omit tab */
      }
    }

    // Discussion + activities — rendered natively in the viewer.
    if (ch.discussionData?.length) data.discussion = ch.discussionData;
    if (ch.activityData?.length) data.activities = ch.activityData;

    // Slides — write each rendered image as slides/chNN/slide-MM.jpg.
    if (ch.slidesJson?.length) {
      let wroteAny = false;
      ch.slidesJson.forEach((s, i) => {
        const m = s.imageDataUri?.match(/^data:[^;]+;base64,(.+)$/);
        if (m) {
          zip.file(`slides/ch${nn}/slide-${pad2(i + 1)}.jpg`, m[1], { base64: true });
          wroteAny = true;
        }
      });
      // Only surface the Slides tab if at least one image rendered. Captions
      // come from the slide titles; the viewer hides any card whose image 404s.
      if (wroteAny) data.slides = ch.slidesJson.map((s) => ({ title: s.title }));
    }

    // Audio — fetch the blob URL (may be dead after a reload; skip if so).
    if (ch.audioUrl) {
      try {
        const audioBlob = await fetch(ch.audioUrl).then((r) => r.blob());
        zip.file(`audio/${nn}.mp3`, audioBlob);
        data.audioPath = `audio/${nn}.mp3`;
      } catch {
        /* blob URL no longer valid (e.g. after reload) — omit audio */
      }
    }
    if (ch.audioTranscript) data.transcript = ch.audioTranscript;

    chapterData.push(data);
  }

  const theme = getTheme(themeId);
  const indexHtml = buildCodexViewerHtml(
    {
      courseTitle: syllabus.courseTitle,
      courseOverview: syllabus.courseOverview || '',
      themeLabel: theme.name,
    },
    chapterData,
  );
  zip.file('index.html', indexHtml);

  return zip.generateAsync({ type: 'blob' });
}
