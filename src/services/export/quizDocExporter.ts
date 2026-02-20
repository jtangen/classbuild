import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Packer,
  HeadingLevel,
  ShadingType,
  TableLayoutType,
} from 'docx';
import type { InClassQuizQuestion } from '../../types/course';

const VERSION_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
const OPTION_LETTERS = ['a', 'b', 'c', 'd'] as const;

/** Simple seeded PRNG (mulberry32) for deterministic shuffling */
function seededRng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle with seeded RNG */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface ShuffledQuestion {
  originalIndex: number;
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  correctLetterIndex: number; // which position (0-3) the correct answer landed in
}

interface QuizVersion {
  label: string;
  questions: ShuffledQuestion[];
}

function generateVersions(questions: InClassQuizQuestion[]): QuizVersion[] {
  return VERSION_LABELS.map((label, versionIndex) => {
    const rng = seededRng(versionIndex * 1000 + 42);

    // Shuffle question order
    const questionIndices = shuffle(
      questions.map((_, i) => i),
      rng
    );

    const shuffledQuestions: ShuffledQuestion[] = questionIndices.map((origIdx) => {
      const q = questions[origIdx];
      const allOptions = [
        { text: q.correctAnswer, isCorrect: true },
        ...q.distractors.map((d) => ({ text: d.text, isCorrect: false })),
      ];
      const shuffledOptions = shuffle(allOptions, rng);
      const correctLetterIndex = shuffledOptions.findIndex((o) => o.isCorrect);

      return {
        originalIndex: origIdx,
        question: q.question,
        options: shuffledOptions,
        correctLetterIndex,
      };
    });

    return { label, questions: shuffledQuestions };
  });
}

function buildQuizVersionDoc(
  version: QuizVersion,
  courseTitle: string,
  chapterTitle: string,
): Document {
  const children: Paragraph[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: courseTitle, bold: true, size: 28, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `${chapterTitle} — In-Class Quiz`, size: 24, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Version ${version.label}`, bold: true, size: 28, font: 'Calibri' })],
    }),
  );

  // Name / Date line
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: 'Name: ', size: 22, font: 'Calibri' }),
        new TextRun({ text: '____________________________________', size: 22, font: 'Calibri' }),
        new TextRun({ text: '          Date: ', size: 22, font: 'Calibri' }),
        new TextRun({ text: '________________', size: 22, font: 'Calibri' }),
      ],
    }),
  );

  // Separator
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } },
      children: [],
    }),
  );

  // Questions
  version.questions.forEach((q, i) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 22, font: 'Calibri' }),
          new TextRun({ text: q.question, size: 22, font: 'Calibri' }),
        ],
      }),
    );

    q.options.forEach((opt, j) => {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 480 },
          children: [
            new TextRun({ text: `${OPTION_LETTERS[j]})  `, size: 22, font: 'Calibri' }),
            new TextRun({ text: opt.text, size: 22, font: 'Calibri' }),
          ],
        }),
      );
    });
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{ children }],
  });
}

function buildAnswerKeyDoc(
  questions: InClassQuizQuestion[],
  versions: QuizVersion[],
  courseTitle: string,
  chapterTitle: string,
): Document {
  const children: (Paragraph | Table)[] = [];

  // Header
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: courseTitle, bold: true, size: 28, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `${chapterTitle} — Answer Key`, bold: true, size: 26, font: 'Calibri' })],
    }),
  );

  // Quick reference table
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: 'Quick Reference', bold: true, size: 24, font: 'Calibri' })],
    }),
  );

  const noBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const cellBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  // Build header row
  const headerCells = [
    new TableCell({
      width: { size: 1200, type: WidthType.DXA },
      borders: cellBorders,
      shading: { type: ShadingType.SOLID, color: '4B3F8F', fill: '4B3F8F' },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Q#', bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })] })],
    }),
    ...versions.map(
      (v) =>
        new TableCell({
          width: { size: 1200, type: WidthType.DXA },
          borders: cellBorders,
          shading: { type: ShadingType.SOLID, color: '4B3F8F', fill: '4B3F8F' },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Ver ${v.label}`, bold: true, color: 'FFFFFF', size: 20, font: 'Calibri' })] })],
        })
    ),
  ];

  // Build data rows — one per question (in original order)
  const dataRows = questions.map((_, qIdx) => {
    const cells = [
      new TableCell({
        borders: cellBorders,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${qIdx + 1}`, bold: true, size: 20, font: 'Calibri' })] })],
      }),
      ...versions.map((v) => {
        // Find where original question qIdx appears in this version
        const versionQ = v.questions.find((q) => q.originalIndex === qIdx);
        const correctLetter = versionQ ? OPTION_LETTERS[versionQ.correctLetterIndex] : '?';
        // Also show which question number it is in this version
        const versionQNum = versionQ ? v.questions.indexOf(versionQ) + 1 : '?';
        return new TableCell({
          borders: cellBorders,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Q${versionQNum}: ${correctLetter}`, size: 20, font: 'Calibri' })] })],
        });
      }),
    ];
    return new TableRow({ children: cells });
  });

  children.push(
    new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: headerCells }), ...dataRows],
    }),
  );

  // Detailed feedback
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: 'Detailed Feedback', bold: true, size: 24, font: 'Calibri' })],
    }),
  );

  questions.forEach((q, i) => {
    // Question
    children.push(
      new Paragraph({
        spacing: { before: 300, after: 120 },
        children: [
          new TextRun({ text: `${i + 1}. `, bold: true, size: 22, font: 'Calibri' }),
          new TextRun({ text: q.question, bold: true, size: 22, font: 'Calibri' }),
        ],
      }),
    );

    // Correct answer
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        indent: { left: 360 },
        shading: { type: ShadingType.SOLID, color: 'E8F5E9', fill: 'E8F5E9' },
        children: [
          new TextRun({ text: 'Correct: ', bold: true, color: '2E7D32', size: 21, font: 'Calibri' }),
          new TextRun({ text: q.correctAnswer, size: 21, font: 'Calibri' }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [new TextRun({ text: q.correctFeedback, size: 20, font: 'Calibri', italics: true })],
      }),
    );

    // Distractors
    q.distractors.forEach((d) => {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          shading: { type: ShadingType.SOLID, color: 'FFEBEE', fill: 'FFEBEE' },
          children: [
            new TextRun({ text: 'Incorrect: ', bold: true, color: 'C62828', size: 21, font: 'Calibri' }),
            new TextRun({ text: d.text, size: 21, font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          indent: { left: 360 },
          children: [new TextRun({ text: d.feedback, size: 20, font: 'Calibri', italics: true })],
        }),
      );
    });

    // Separator
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } },
        children: [],
      }),
    );
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{ children }],
  });
}

/**
 * Generate a ZIP blob containing 5 quiz versions (A-E) + answer key as .docx files.
 */
export async function generateQuizDocPackage(
  questions: InClassQuizQuestion[],
  courseTitle: string,
  chapterTitle: string,
): Promise<Blob> {
  const versions = generateVersions(questions);

  // Dynamic import JSZip (already a project dependency)
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const folderName = `quiz-${chapterTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
  const folder = zip.folder(folderName)!;

  // Generate each version .docx
  // Use toBuffer() in Node.js, toBlob() in browser — JSZip accepts both
  const packDoc = async (doc: Document): Promise<Buffer | Blob> => {
    try {
      return await Packer.toBuffer(doc);
    } catch {
      return await Packer.toBlob(doc);
    }
  };

  for (const version of versions) {
    const doc = buildQuizVersionDoc(version, courseTitle, chapterTitle);
    const buffer = await packDoc(doc);
    folder.file(`quiz-version-${version.label}.docx`, buffer);
  }

  // Generate answer key .docx
  const answerKeyDoc = buildAnswerKeyDoc(questions, versions, courseTitle, chapterTitle);
  const answerKeyBuffer = await packDoc(answerKeyDoc);
  folder.file('answer-key.docx', answerKeyBuffer);

  return zip.generateAsync({ type: 'blob' });
}
