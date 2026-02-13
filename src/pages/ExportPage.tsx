import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCourseStore } from '../store/courseStore';
import { useApiStore } from '../store/apiStore';
import { useUiStore } from '../store/uiStore';
import { streamMessage } from '../services/claude/streaming';
import { MODELS } from '../services/claude/client';
import { buildChapterPrompt, buildChapterUserPrompt } from '../prompts/chapter';
import { buildPracticeQuizPrompt, buildPracticeQuizUserPrompt } from '../prompts/practiceQuiz';
import { buildInClassQuizPrompt, buildInClassQuizUserPrompt } from '../prompts/inClassQuiz';
import { Button } from '../components/shared/Button';
import type { InClassQuizQuestion } from '../types/course';

function extractHtml(text: string): string {
  const htmlMatch = text.match(/```html\s*\n?([\s\S]*?)\n?```/);
  if (htmlMatch) return htmlMatch[1];
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) return trimmed;
  const docIdx = text.indexOf('<!DOCTYPE');
  const htmlIdx = text.indexOf('<html');
  const startIdx = docIdx !== -1 ? docIdx : htmlIdx;
  if (startIdx !== -1) {
    const endIdx = text.lastIndexOf('</html>');
    if (endIdx !== -1) return text.slice(startIdx, endIdx + 7);
    return text.slice(startIdx);
  }
  return text;
}

function downloadFile(content: string | Blob, filename: string, type = 'text/html') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function ExportPage() {
  const { syllabus, chapters, researchDossiers, addChapter, updateChapter, setup, curriculumMap } = useCourseStore();
  const { claudeApiKey } = useApiStore();
  const { isGenerating, setIsGenerating, setError, error } = useUiStore();
  const [generatingChapter, setGeneratingChapter] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // --- Download handlers ---

  const handleDownloadChapter = useCallback((chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter) return;
    downloadFile(chapter.htmlContent, `chapter-${chapterNum}-${sanitizeFilename(chapter.title)}.html`);
  }, [chapters]);

  const handleDownloadQuiz = useCallback(async (chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter?.practiceQuizData || !syllabus) return;
    try {
      const { buildQuizHtml } = await import('../templates/quizTemplate');
      const html = buildQuizHtml(`${chapter.title} — Practice Quiz`, chapter.practiceQuizData, syllabus.courseTitle, setup.themeId);
      downloadFile(html, `quiz-${chapterNum}-${sanitizeFilename(chapter.title)}.html`);
    } catch {
      downloadFile(chapter.practiceQuizData, `quiz-${chapterNum}-${sanitizeFilename(chapter.title)}.txt`, 'text/plain');
    }
  }, [chapters, syllabus]);

  const handleDownloadSlides = useCallback(async (chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter?.slidesJson || !syllabus) return;
    try {
      const { generatePptx } = await import('../services/export/pptxExporter');
      const blob = await generatePptx(chapter.slidesJson, syllabus.courseTitle, chapter.title, setup.themeId);
      downloadFile(blob, `slides-${chapterNum}-${sanitizeFilename(chapter.title)}.pptx`);
    } catch {
      downloadFile(JSON.stringify(chapter.slidesJson, null, 2), `slides-${chapterNum}-${sanitizeFilename(chapter.title)}.json`, 'application/json');
    }
  }, [chapters, syllabus, setup.themeId]);

  const handleDownloadInClassQuiz = useCallback(async (chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter?.inClassQuizData || !syllabus) return;
    try {
      const { generateQuizDocPackage } = await import('../services/export/quizDocExporter');
      const blob = await generateQuizDocPackage(chapter.inClassQuizData, syllabus.courseTitle, chapter.title);
      downloadFile(blob, `quiz-pack-${chapterNum}-${sanitizeFilename(chapter.title)}.zip`, 'application/zip');
    } catch {
      downloadFile(JSON.stringify(chapter.inClassQuizData, null, 2), `quiz-${chapterNum}-${sanitizeFilename(chapter.title)}.json`, 'application/json');
    }
  }, [chapters, syllabus]);

  const handleDownloadAudio = useCallback((chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter?.audioUrl) return;
    const a = document.createElement('a');
    a.href = chapter.audioUrl;
    a.download = `audio-${chapterNum}-${sanitizeFilename(chapter.title)}.mp3`;
    a.click();
  }, [chapters]);

  const handleDownloadTeachingResources = useCallback(async (chapterNum: number) => {
    const chapter = chapters.find(c => c.number === chapterNum);
    if (!chapter || !syllabus) return;
    const discussions = chapter.discussionData || [];
    const activities = chapter.activityData || [];
    const details = chapter.activityDetails || {};
    if (discussions.length === 0 && activities.length === 0) return;

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
    const children: InstanceType<typeof Paragraph>[] = [];

    // Title
    children.push(new Paragraph({
      children: [new TextRun({ text: `Teaching Resources — ${chapter.title}`, bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: syllabus.courseTitle, italics: true, color: '666666', size: 22 })],
      spacing: { after: 400 },
    }));

    // Discussion starters
    if (discussions.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Conversation Starters', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: 'Display these on a slide as students arrive.', italics: true, color: '888888', size: 20 })],
        spacing: { after: 200 },
      }));
      discussions.forEach((d, i) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: `[${d.hook}] `, bold: true, color: '8b5cf6', size: 22 }),
            new TextRun({ text: d.prompt, size: 22 }),
          ],
          spacing: { after: 150 },
        }));
      });
    }

    // Activities
    if (activities.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: 'In-Class Activities', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }));
      activities.forEach((a, i) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${a.title}`, bold: true, size: 24 }),
            new TextRun({ text: `  (${a.duration})`, color: '888888', size: 20 }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 100 },
        }));
        children.push(new Paragraph({
          children: [new TextRun({ text: a.description, size: 22 })],
          spacing: { after: 100 },
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Materials: ', bold: true, size: 20 }),
            new TextRun({ text: a.materials, size: 20 }),
          ],
          spacing: { after: 50 },
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Learning Goal: ', bold: true, size: 20 }),
            new TextRun({ text: a.learningGoal, size: 20 }),
          ],
          spacing: { after: 50 },
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Scaling: ', bold: true, size: 20 }),
            new TextRun({ text: a.scalingNotes, size: 20 }),
          ],
          spacing: { after: 100 },
        }));

        // Expanded guide if available
        const detail = details[i];
        if (detail) {
          children.push(new Paragraph({
            children: [new TextRun({ text: 'Step-by-Step Guide', bold: true, size: 22, underline: {} })],
            spacing: { before: 150, after: 100 },
          }));
          detail.steps.forEach(s => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `[${s.timing}] `, bold: true, size: 20 }),
                new TextRun({ text: s.instruction, size: 20 }),
              ],
              spacing: { after: 30 },
              indent: { left: 360 },
            }));
            if (s.studentAction) {
              children.push(new Paragraph({
                children: [new TextRun({ text: `Students: ${s.studentAction}`, italics: true, color: '666666', size: 18 })],
                indent: { left: 720 },
                spacing: { after: 80 },
              }));
            }
          });
          if (detail.facilitationTips.length > 0) {
            children.push(new Paragraph({
              children: [new TextRun({ text: 'Facilitation Tips', bold: true, size: 20 })],
              spacing: { before: 100, after: 50 },
            }));
            detail.facilitationTips.forEach(t => {
              children.push(new Paragraph({
                children: [new TextRun({ text: `• ${t}`, size: 20 })],
                indent: { left: 360 },
                spacing: { after: 30 },
              }));
            });
          }
          if (detail.commonPitfalls.length > 0) {
            children.push(new Paragraph({
              children: [new TextRun({ text: 'Common Pitfalls', bold: true, size: 20 })],
              spacing: { before: 100, after: 50 },
            }));
            detail.commonPitfalls.forEach(p => {
              children.push(new Paragraph({
                children: [new TextRun({ text: `• ${p}`, size: 20 })],
                indent: { left: 360 },
                spacing: { after: 30 },
              }));
            });
          }
          children.push(new Paragraph({
            children: [
              new TextRun({ text: 'Debrief: ', bold: true, size: 20 }),
              new TextRun({ text: detail.debriefGuide, size: 20 }),
            ],
            spacing: { before: 100, after: 100 },
          }));
        }
      });
    }

    // Footer
    children.push(new Paragraph({
      children: [new TextRun({ text: `Generated by ClassBuild`, italics: true, color: '999999', size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }));

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    downloadFile(blob, `teaching-resources-${chapterNum}-${sanitizeFilename(chapter.title)}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }, [chapters, syllabus]);

  const buildCurriculumMapCsv = useCallback(() => {
    if (!curriculumMap || !syllabus) return null;
    const chapterNums = syllabus.chapters.map((ch) => ch.number);
    const header = ['Bloom Level', 'Learning Objective', ...chapterNums.map((n) => `Ch ${n}`)];
    const rows = curriculumMap.objectives.map((obj) => {
      const cells = chapterNums.map((n) => {
        const level = obj.alignments[n];
        if (!level) return '';
        return level === 'introduced' ? 'I' : level === 'developed' ? 'D' : 'M';
      });
      // Escape quotes in objective text for CSV
      const escapedText = obj.text.includes(',') || obj.text.includes('"')
        ? `"${obj.text.replace(/"/g, '""')}"`
        : obj.text;
      return [obj.bloomLevel, escapedText, ...cells];
    });
    return [header, ...rows].map((r) => r.join(',')).join('\n');
  }, [curriculumMap, syllabus]);

  const handleDownloadCurriculumMap = useCallback(() => {
    const csv = buildCurriculumMapCsv();
    if (!csv) return;
    downloadFile(csv, 'curriculum-alignment-matrix.csv', 'text/csv');
  }, [buildCurriculumMapCsv]);

  // --- Generate a single chapter from export page ---

  const generateSingleChapter = useCallback(async (chapterNum: number) => {
    if (!syllabus || isGenerating) return;
    const ch = syllabus.chapters.find(c => c.number === chapterNum);
    if (!ch) return;

    setIsGenerating(true);
    setGeneratingChapter(chapterNum);

    try {
      const dossier = researchDossiers.find(d => d.chapterNumber === chapterNum);
      const researchSources = dossier?.sources.map(s => ({
        title: s.title, authors: s.authors, year: s.year,
        summary: s.summary, url: s.url, doi: s.doi,
      }));

      // Generate chapter
      const fullText = await streamMessage(
        {
          apiKey: claudeApiKey,
          model: MODELS.opus,
          system: buildChapterPrompt(setup.themeId),
          messages: [{ role: 'user', content: buildChapterUserPrompt(syllabus.courseTitle, ch, setup.chapterLength, researchSources) }],
          thinkingBudget: 'high',
          maxTokens: 16000,
        },
        { onError: (err) => setError(err.message) }
      );

      const html = extractHtml(fullText);
      addChapter({ number: chapterNum, title: ch.title, htmlContent: html });

      // Generate practice quiz
      try {
        const quizText = await streamMessage(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildPracticeQuizPrompt(),
            messages: [{ role: 'user', content: buildPracticeQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)) }],
            thinkingBudget: 'high',
            maxTokens: 8000,
          },
          { onError: (err) => setError(err.message) }
        );
        updateChapter(chapterNum, { practiceQuizData: quizText });
      } catch { /* continue */ }

      // Generate in-class quiz
      try {
        const inClassText = await streamMessage(
          {
            apiKey: claudeApiKey,
            model: MODELS.opus,
            system: buildInClassQuizPrompt(),
            messages: [{ role: 'user', content: buildInClassQuizUserPrompt(ch.title, ch.narrative, ch.keyConcepts, html.slice(0, 3000)) }],
            thinkingBudget: 'high',
            maxTokens: 8000,
          },
          { onError: (err) => setError(err.message) }
        );
        try {
          let jsonStr = inClassText;
          const codeMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
          if (codeMatch) jsonStr = codeMatch[1];
          const fb = jsonStr.indexOf('[');
          const lb = jsonStr.lastIndexOf(']');
          if (fb !== -1 && lb !== -1) jsonStr = jsonStr.slice(fb, lb + 1);
          jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');
          for (let attempt = 0; attempt < 10; attempt++) {
            try {
              const parsed = JSON.parse(jsonStr) as InClassQuizQuestion[];
              updateChapter(chapterNum, { inClassQuizData: parsed });
              break;
            } catch (e) {
              if (e instanceof SyntaxError) {
                const posMatch = e.message.match(/position (\d+)/);
                if (posMatch) {
                  const pos = parseInt(posMatch[1]);
                  if (pos > 0 && pos < jsonStr.length && jsonStr[pos] === '"') {
                    jsonStr = jsonStr.slice(0, pos) + '\\"' + jsonStr.slice(pos + 1);
                    continue;
                  }
                }
              }
              break;
            }
          }
        } catch { /* parse failed */ }
      } catch { /* continue */ }
    } catch (err) {
      setError(`Failed to generate Chapter ${chapterNum}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGenerating(false);
      setGeneratingChapter(null);
    }
  }, [syllabus, chapters, claudeApiKey, researchDossiers, setup.chapterLength, addChapter, updateChapter, isGenerating, setIsGenerating, setError]);

  // --- Download All ---

  const handleDownloadAll = useCallback(async () => {
    const { default: JSZip } = await import('jszip');
    const { saveAs } = await import('file-saver');

    const courseName = sanitizeFilename(syllabus?.courseTitle || 'course');
    const zip = new JSZip();
    const courseFolder = zip.folder(courseName);

    for (const chapter of chapters) {
      const chapterName = sanitizeFilename(chapter.title);

      courseFolder?.file(`chapter-${chapter.number}-${chapterName}.html`, chapter.htmlContent);

      if (chapter.practiceQuizData && syllabus) {
        try {
          const { buildQuizHtml } = await import('../templates/quizTemplate');
          const quizHtml = buildQuizHtml(`${chapter.title} — Practice Quiz`, chapter.practiceQuizData, syllabus.courseTitle, setup.themeId);
          courseFolder?.file(`quiz-${chapter.number}-${chapterName}.html`, quizHtml);
        } catch {
          courseFolder?.file(`quiz-${chapter.number}-${chapterName}.txt`, chapter.practiceQuizData);
        }
      }

      if (chapter.inClassQuizData && chapter.inClassQuizData.length > 0 && syllabus) {
        try {
          const { generateQuizDocPackage } = await import('../services/export/quizDocExporter');
          const quizZip = await generateQuizDocPackage(chapter.inClassQuizData, syllabus.courseTitle, chapter.title);
          courseFolder?.file(`in-class-quiz-${chapter.number}-${chapterName}.zip`, quizZip);
        } catch {
          courseFolder?.file(`in-class-quiz-${chapter.number}-${chapterName}.json`, JSON.stringify(chapter.inClassQuizData, null, 2));
        }
      }

      if (chapter.slidesJson && syllabus) {
        try {
          const { generatePptx } = await import('../services/export/pptxExporter');
          const pptxBlob = await generatePptx(chapter.slidesJson, syllabus.courseTitle, chapter.title, setup.themeId);
          courseFolder?.file(`slides-${chapter.number}-${chapterName}.pptx`, pptxBlob);
        } catch {
          courseFolder?.file(`slides-${chapter.number}-${chapterName}.json`, JSON.stringify(chapter.slidesJson, null, 2));
        }
      }

      // Audio blob URLs can't be included in ZIP (lost on reload), skip audio in ZIP

      if (chapter.infographicDataUri) {
        // Convert data URI to binary for ZIP
        const base64Match = chapter.infographicDataUri.match(/^data:[^;]+;base64,(.+)$/);
        if (base64Match) {
          courseFolder?.file(`infographic-${chapter.number}-${chapterName}.jpg`, base64Match[1], { base64: true });
        }
      }
    }

    // Curriculum alignment matrix CSV
    const csv = buildCurriculumMapCsv();
    if (csv) {
      courseFolder?.file('curriculum-alignment-matrix.csv', csv);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${courseName}.zip`);
  }, [syllabus, chapters, setup.themeId, buildCurriculumMapCsv]);

  const handlePublish = useCallback(async () => {
    if (!syllabus || chapters.length === 0) return;
    setIsPublishing(true);
    try {
      const { assemblePublishHtml } = await import('../services/export/publishExporter');
      const html = await assemblePublishHtml(syllabus, chapters, setup.themeId);
      const courseName = sanitizeFilename(syllabus.courseTitle) || 'course';
      downloadFile(html, `${courseName}-published.html`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
  }, [syllabus, chapters, setup.themeId, setError]);

  // --- Derived data ---

  if (!syllabus) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary">No course data available.</p>
      </div>
    );
  }

  const totalChapters = syllabus.chapters.length;
  const readyCount = chapters.length;
  const allReady = readyCount === totalChapters;

  // Count downloadable files per chapter and totals
  const FILES_PER_CHAPTER = 7; // HTML, practice quiz, in-class quiz, slides, audio, teaching resources, infographic
  const totalPossibleFiles = totalChapters * FILES_PER_CHAPTER;

  function countFiles(c: typeof chapters[number]): number {
    let n = 1; // chapter HTML always
    if (c.practiceQuizData) n++;
    if (c.inClassQuizData && c.inClassQuizData.length > 0) n++;
    if (c.slidesJson) n++;
    if (c.audioUrl) n++;
    if ((c.discussionData && c.discussionData.length > 0) || (c.activityData && c.activityData.length > 0)) n++;
    if (c.infographicDataUri) n++;
    return n;
  }

  const fileCount = chapters.reduce((acc, c) => acc + countFiles(c), 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto py-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Export Course</h1>
          <p className="text-text-secondary">{syllabus.courseTitle}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handlePublish}
            disabled={chapters.length === 0 || isPublishing}
            isLoading={isPublishing}
          >
            <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Publish Course
          </Button>
          <Button onClick={handleDownloadAll} disabled={chapters.length === 0 || isGenerating}>
            <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {allReady
              ? `Download All (ZIP)`
              : `Download ${readyCount} of ${totalChapters} Classes (ZIP)`}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">{error}</div>
      )}

      {/* Summary bar — files only */}
      <div className="bg-bg-card border border-violet-500/10 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Course Overview</span>
          {!allReady && (
            <span className="text-xs text-amber-400">{totalChapters - readyCount} class{totalChapters - readyCount > 1 ? 'es' : ''} not yet generated</span>
          )}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-sm font-bold">{readyCount}</div>
            <div className="text-xs"><span className="text-text-primary font-medium">Classes</span><span className="text-text-muted"> / {totalChapters}</span></div>
          </div>
          <div className="w-px h-6 bg-violet-500/10" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 text-sm font-bold">{fileCount}</div>
            <div className="text-xs"><span className="text-text-primary font-medium">Files</span><span className="text-text-muted"> / {totalPossibleFiles}</span></div>
          </div>
          {fileCount === totalPossibleFiles && (
            <>
              <div className="w-px h-6 bg-violet-500/10" />
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span className="text-xs text-success font-medium">All files ready</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Curriculum map export */}
      {curriculumMap && (
        <div className="bg-bg-card border border-violet-500/10 rounded-xl p-5 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-medium text-text-primary">Curriculum Alignment Matrix</span>
              <p className="text-xs text-text-muted">
                {curriculumMap.objectives.length} learning objectives &middot; {syllabus.chapters.length} chapters
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={handleDownloadCurriculumMap}>
            <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </Button>
        </div>
      )}

      {/* Chapter cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {syllabus.chapters.map((ch) => {
          const generated = chapters.find(c => c.number === ch.number);
          const isCurrentlyGenerating = generatingChapter === ch.number;

          if (!generated) {
            // --- Not generated card ---
            return (
              <motion.div
                key={ch.number}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ch.number * 0.03 }}
                className="bg-bg-card border border-dashed border-violet-500/15 rounded-xl p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-text-muted">Class {ch.number}</span>
                </div>
                <h3 className="text-sm font-semibold mb-4 line-clamp-2 text-text-muted">{ch.title}</h3>
                <div className="mt-auto">
                  {isCurrentlyGenerating ? (
                    <div className="flex items-center gap-2 justify-center py-2">
                      <motion.div
                        className="w-2 h-2 rounded-full bg-violet-500"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-xs text-violet-400">Generating...</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={isGenerating}
                      onClick={() => generateSingleChapter(ch.number)}
                    >
                      <svg className="mr-1.5 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Generate Class
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          }

          // --- Generated chapter card ---
          const hasQuiz = !!generated.practiceQuizData;
          const hasInClassQuiz = !!generated.inClassQuizData && generated.inClassQuizData.length > 0;
          const hasSlides = !!generated.slidesJson;
          const hasAudio = !!generated.audioUrl;
          const hasTeachingResources = (generated.discussionData && generated.discussionData.length > 0) || (generated.activityData && generated.activityData.length > 0);
          const hasInfographic = !!generated.infographicDataUri;
          const chapterFileCount = countFiles(generated);
          const isComplete = chapterFileCount === FILES_PER_CHAPTER;

          return (
            <motion.div
              key={ch.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ch.number * 0.03 }}
              className="bg-bg-card border border-violet-500/20 rounded-xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-medium text-violet-400">Class {ch.number}</span>
                {isComplete ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success">Ready</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400">{chapterFileCount} / {FILES_PER_CHAPTER} files</span>
                )}
              </div>
              <h3 className="text-sm font-semibold mb-4 line-clamp-2">{ch.title}</h3>

              {/* Download links — only show available ones */}
              <div className="space-y-1 mt-auto">
                <DownloadRow
                  label="Reading (.html)"
                  icon={<DocIcon />}
                  onClick={() => handleDownloadChapter(ch.number)}
                />
                {hasQuiz && (
                  <DownloadRow
                    label="Practice Quiz"
                    icon={<QuizIcon />}
                    onClick={() => handleDownloadQuiz(ch.number)}
                  />
                )}
                {hasInClassQuiz && (
                  <DownloadRow
                    label="In-Class Quiz (.zip)"
                    icon={<DocIcon />}
                    onClick={() => handleDownloadInClassQuiz(ch.number)}
                  />
                )}
                {hasSlides && (
                  <DownloadRow
                    label="Slides (.pptx)"
                    icon={<SlidesIcon />}
                    onClick={() => handleDownloadSlides(ch.number)}
                  />
                )}
                {hasAudio && (
                  <DownloadRow
                    label="Audiobook (.mp3)"
                    icon={<AudioIcon />}
                    onClick={() => handleDownloadAudio(ch.number)}
                  />
                )}
                {hasTeachingResources && (
                  <DownloadRow
                    label="Teaching Resources (.docx)"
                    icon={<ResourcesIcon />}
                    onClick={() => handleDownloadTeachingResources(ch.number)}
                  />
                )}
                {hasInfographic && (
                  <DownloadRow
                    label="Infographic (.jpg)"
                    icon={<DocIcon />}
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = generated.infographicDataUri!;
                      a.download = `infographic-${ch.number}-${sanitizeFilename(ch.title)}.jpg`;
                      a.click();
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- Small download row component ---

function DownloadRow({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-violet-500/5 transition-colors cursor-pointer text-left bg-transparent border-0"
    >
      <span className="text-text-muted shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
      <svg className="w-3.5 h-3.5 ml-auto text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  );
}

// --- Icons ---

function DocIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ResourcesIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
