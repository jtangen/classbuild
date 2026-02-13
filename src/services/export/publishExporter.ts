import type { Syllabus, GeneratedChapter } from '../../types/course';
import { buildCourseViewerHtml } from '../../templates/courseViewerTemplate';

/**
 * Assembles a self-contained HTML course viewer from all generated content.
 * Includes student-facing materials: readings, practice quizzes, discussion questions, infographics.
 * Excludes teacher-only materials: slides, in-class quizzes, activities, audio.
 */
export async function assemblePublishHtml(
  syllabus: Syllabus,
  chapters: GeneratedChapter[],
  themeId?: string,
): Promise<string> {
  // Build quiz HTML for chapters that have practice quiz data
  let buildQuizHtml: ((title: string, data: string, course: string, theme?: string) => string) | null = null;
  try {
    const mod = await import('../../templates/quizTemplate');
    buildQuizHtml = mod.buildQuizHtml;
  } catch {
    // Quiz template unavailable
  }

  const chaptersWithQuizHtml = chapters.map((ch) => {
    let quizHtml: string | undefined;
    if (ch.practiceQuizData && buildQuizHtml) {
      try {
        quizHtml = buildQuizHtml(
          `${ch.title} — Practice Quiz`,
          ch.practiceQuizData,
          syllabus.courseTitle,
          themeId,
        );
      } catch {
        // Quiz build failed
      }
    }
    return { ...ch, quizHtml };
  });

  return buildCourseViewerHtml(syllabus, chaptersWithQuizHtml, themeId);
}
