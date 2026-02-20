/**
 * DOCX builders for CLI course output.
 * Uses the `docx` package to produce Word documents for discussion prompts,
 * activities, audio transcripts, and research dossiers.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Packer,
} from 'docx';
import type { ResearchDossier, Syllabus } from '../../src/types/course';

// ─── Shared helpers ──────────────────────────────────────────────

function headerParagraphs(courseTitle: string, subtitle: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: courseTitle, bold: true, size: 28, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: subtitle, size: 24, font: 'Calibri' })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } },
      children: [],
    }),
  ];
}

function run(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number; color?: string }): TextRun {
  return new TextRun({
    text,
    font: 'Calibri',
    size: opts?.size ?? 22,
    bold: opts?.bold,
    italics: opts?.italic,
    color: opts?.color,
  });
}

function toBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc) as Promise<Buffer>;
}

// ─── Discussion DOCX ─────────────────────────────────────────────

export async function buildDiscussionDocx(
  discussions: Array<{ prompt: string; hook: string }>,
  courseTitle: string,
  chapterTitle: string,
): Promise<Buffer> {
  const children: Paragraph[] = [
    ...headerParagraphs(courseTitle, `${chapterTitle} — Conversation Starters`),
  ];

  discussions.forEach((d, i) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [run(`${i + 1}. ${d.hook}`, { bold: true, size: 24 })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [run(d.prompt)],
      }),
    );
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });

  return toBuffer(doc);
}

// ─── Activities DOCX ─────────────────────────────────────────────

export async function buildActivitiesDocx(
  activities: Array<{
    title: string;
    duration: string;
    description: string;
    materials: string;
    learningGoal: string;
    scalingNotes: string;
  }>,
  courseTitle: string,
  chapterTitle: string,
): Promise<Buffer> {
  const children: Paragraph[] = [
    ...headerParagraphs(courseTitle, `${chapterTitle} — Activities`),
  ];

  activities.forEach((a, i) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [run(`${i + 1}. ${a.title} (${a.duration})`, { bold: true, size: 24 })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [run(a.description)],
      }),
    );

    if (a.materials) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [run('Materials: ', { bold: true }), run(a.materials)],
      }));
    }
    if (a.learningGoal) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [run('Learning Goal: ', { bold: true }), run(a.learningGoal)],
      }));
    }
    if (a.scalingNotes) {
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [run('Scaling Notes: ', { bold: true }), run(a.scalingNotes)],
      }));
    }

    children.push(new Paragraph({
      spacing: { after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' } },
      children: [],
    }));
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });

  return toBuffer(doc);
}

// ─── Transcript DOCX ─────────────────────────────────────────────

export async function buildTranscriptDocx(
  transcript: string,
  courseTitle: string,
  chapterTitle: string,
): Promise<Buffer> {
  const children: Paragraph[] = [
    ...headerParagraphs(courseTitle, `${chapterTitle} — Audio Transcript`),
  ];

  // Split on double newlines for paragraphs
  const paragraphs = transcript.split(/\n\n+/).filter(p => p.trim());
  for (const para of paragraphs) {
    children.push(new Paragraph({
      spacing: { after: 120 },
      children: [run(para.trim())],
    }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });

  return toBuffer(doc);
}

// ─── Research Dossier DOCX ───────────────────────────────────────

export async function buildResearchDocx(
  dossier: ResearchDossier,
  courseTitle: string,
  chapterTitle: string,
): Promise<Buffer> {
  const children: Paragraph[] = [
    ...headerParagraphs(courseTitle, `${chapterTitle} — Research Dossier`),
  ];

  // Synthesis notes
  if (dossier.synthesisNotes) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [run('Synthesis Notes', { bold: true, size: 24 })],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [run(dossier.synthesisNotes)],
      }),
    );
  }

  // Sources
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 120 },
      children: [run(`Sources (${dossier.sources.length})`, { bold: true, size: 24 })],
    }),
  );

  dossier.sources.forEach((s, i) => {
    // Citation line
    const citeParts: TextRun[] = [
      run(`${i + 1}. `, { bold: true }),
      run(`${s.authors} (${s.year}). `, { bold: true }),
      run(s.title, { italic: true }),
    ];
    if (s.doi) citeParts.push(run(` DOI: ${s.doi}`, { size: 20, color: '666666' }));
    if (s.url) citeParts.push(run(` ${s.url}`, { size: 20, color: '336699' }));

    children.push(new Paragraph({
      spacing: { before: 200, after: 60 },
      children: citeParts,
    }));

    // Summary
    children.push(new Paragraph({
      spacing: { after: 40 },
      indent: { left: 360 },
      children: [run(s.summary)],
    }));

    // Relevance
    if (s.relevance) {
      children.push(new Paragraph({
        spacing: { after: 120 },
        indent: { left: 360 },
        children: [run('Relevance: ', { bold: true, size: 20 }), run(s.relevance, { size: 20, italic: true })],
      }));
    }
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });

  return toBuffer(doc);
}

// ─── Syllabus DOCX ───────────────────────────────────────────────

export async function buildSyllabusDocx(syllabus: Syllabus): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [run(syllabus.courseTitle, { bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [run('Course Syllabus', { size: 24, italic: true, color: '666666' })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } },
      children: [],
    }),
  ];

  // Course overview
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 120 },
      children: [run('Course Overview', { bold: true, size: 26 })],
    }),
  );
  for (const para of syllabus.courseOverview.split(/\n\n+/)) {
    if (para.trim()) {
      children.push(new Paragraph({
        spacing: { after: 120 },
        children: [run(para.trim())],
      }));
    }
  }

  // Chapters
  for (const ch of syllabus.chapters) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 120 },
        children: [run(`Chapter ${ch.number}: ${ch.title}`, { bold: true, size: 26 })],
      }),
    );

    // Narrative
    for (const para of ch.narrative.split(/\n\n+/)) {
      if (para.trim()) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [run(para.trim())],
        }));
      }
    }

    // Key concepts
    children.push(new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [run('Key Concepts: ', { bold: true }), run(ch.keyConcepts.join(', '))],
    }));

    // Widgets
    if (ch.widgets.length > 0) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
        children: [run('Interactive Widgets', { bold: true, size: 22 })],
      }));
      for (const w of ch.widgets) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [run(w.title, { bold: true }), run(` — ${w.description.slice(0, 200)}...`)],
          }),
        );
      }
    }

    // Learning science annotations
    if (ch.scienceAnnotations.length > 0) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 80 },
        children: [run('Learning Science Annotations', { bold: true, size: 22 })],
      }));
      for (const ann of ch.scienceAnnotations) {
        children.push(new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [
            run(`[${ann.principle}] `, { bold: true, color: '4B3F8F', size: 20 }),
            run(ann.description, { size: 20 }),
          ],
        }));
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
    sections: [{ children }],
  });

  return toBuffer(doc);
}
