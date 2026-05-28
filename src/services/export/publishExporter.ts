import type { Syllabus, GeneratedChapter, CurriculumMap } from '../../types/course';
import { buildCourseViewerHtml } from '../../templates/courseViewerTemplate';

/**
 * Assembles a self-contained HTML course viewer from all generated content.
 * Includes student-facing materials: readings, practice quizzes, discussion questions,
 * and the learning-outcomes table when one has been generated.
 * Excludes teacher-only materials: slides, in-class quizzes, activities, audio.
 */
export async function assemblePublishHtml(
  syllabus: Syllabus,
  chapters: GeneratedChapter[],
  themeId?: string,
  curriculumMap?: CurriculumMap | null,
): Promise<string> {
  // Build quiz HTML for chapters that have practice quiz data
  let buildQuizHtml: ((title: string, data: string, course: string, theme?: string) => string) | null = null;
  try {
    const mod = await import('../../templates/quizTemplate');
    buildQuizHtml = mod.buildQuizHtml;
  } catch {
    // Quiz template unavailable
  }

  let buildChallengeHtml: ((title: string, data: import('../../types/course').WeeklyChallengeData, course: string, theme?: string) => string) | null = null;
  try {
    const mod = await import('../../templates/weeklyChallengeTemplate');
    buildChallengeHtml = mod.buildWeeklyChallengeHtml;
  } catch {
    // Weekly challenge template unavailable
  }

  const chaptersWithQuizHtml = chapters.map((ch) => {
    let quizHtml: string | undefined;
    let challengeHtml: string | undefined;
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
    if (ch.weeklyChallengeData && buildChallengeHtml) {
      try {
        challengeHtml = buildChallengeHtml(
          `Week ${ch.number} Challenge — ${ch.title}`,
          ch.weeklyChallengeData,
          syllabus.courseTitle,
          themeId,
        );
      } catch {
        // Challenge build failed
      }
    }
    return { ...ch, quizHtml, challengeHtml };
  });

  return buildCourseViewerHtml(syllabus, chaptersWithQuizHtml, themeId, curriculumMap ?? null);
}
