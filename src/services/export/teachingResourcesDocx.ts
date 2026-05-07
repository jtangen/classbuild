import type { GeneratedChapter, Syllabus } from '../../types/course';

/**
 * Build a teacher-facing DOCX bundling discussion starters and in-class
 * activities (with their step-by-step guides if expanded). Returns null when
 * the chapter has neither — callers can then skip the file entirely.
 */
export async function generateTeachingResourcesDocx(
  chapter: GeneratedChapter,
  syllabus: Syllabus,
): Promise<Blob | null> {
  const discussions = chapter.discussionData || [];
  const activities = chapter.activityData || [];
  const details = chapter.activityDetails || {};
  if (discussions.length === 0 && activities.length === 0) return null;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');
  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Teaching Resources — ${chapter.title}`, bold: true, size: 32 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: syllabus.courseTitle, italics: true, color: '666666', size: 22 })],
      spacing: { after: 400 },
    }),
  );

  if (discussions.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Conversation Starters', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      }),
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Display these on a slide as students arrive.', italics: true, color: '888888', size: 20 })],
        spacing: { after: 200 },
      }),
    );
    discussions.forEach((d, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: `[${d.hook}] `, bold: true, color: '8b5cf6', size: 22 }),
            new TextRun({ text: d.prompt, size: 22 }),
          ],
          spacing: { after: 150 },
        }),
      );
    });
  }

  if (activities.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'In-Class Activities', bold: true, size: 28 })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }),
    );
    activities.forEach((a, i) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${a.title}`, bold: true, size: 24 }),
            new TextRun({ text: `  (${a.duration})`, color: '888888', size: 20 }),
          ],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 100 },
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: a.description, size: 22 })],
          spacing: { after: 100 },
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Materials: ', bold: true, size: 20 }),
            new TextRun({ text: a.materials, size: 20 }),
          ],
          spacing: { after: 50 },
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Learning Goal: ', bold: true, size: 20 }),
            new TextRun({ text: a.learningGoal, size: 20 }),
          ],
          spacing: { after: 50 },
        }),
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Scaling: ', bold: true, size: 20 }),
            new TextRun({ text: a.scalingNotes, size: 20 }),
          ],
          spacing: { after: 100 },
        }),
      );

      const detail = details[i];
      if (detail) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Step-by-Step Guide', bold: true, size: 22, underline: {} })],
            spacing: { before: 150, after: 100 },
          }),
        );
        detail.steps.forEach((s) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `[${s.timing}] `, bold: true, size: 20 }),
                new TextRun({ text: s.instruction, size: 20 }),
              ],
              spacing: { after: 30 },
              indent: { left: 360 },
            }),
          );
          if (s.studentAction) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `Students: ${s.studentAction}`, italics: true, color: '666666', size: 18 })],
                indent: { left: 720 },
                spacing: { after: 80 },
              }),
            );
          }
        });
        if (detail.facilitationTips.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: 'Facilitation Tips', bold: true, size: 20 })],
              spacing: { before: 100, after: 50 },
            }),
          );
          detail.facilitationTips.forEach((t) => {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${t}`, size: 20 })],
                indent: { left: 360 },
                spacing: { after: 30 },
              }),
            );
          });
        }
        if (detail.commonPitfalls.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: 'Common Pitfalls', bold: true, size: 20 })],
              spacing: { before: 100, after: 50 },
            }),
          );
          detail.commonPitfalls.forEach((p) => {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `• ${p}`, size: 20 })],
                indent: { left: 360 },
                spacing: { after: 30 },
              }),
            );
          });
        }
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Debrief: ', bold: true, size: 20 }),
              new TextRun({ text: detail.debriefGuide, size: 20 }),
            ],
            spacing: { before: 100, after: 100 },
          }),
        );
      }
    });
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated by ClassBuild`, italics: true, color: '999999', size: 18 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }),
  );

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
