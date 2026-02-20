import PptxGenJS from 'pptxgenjs';
import type { SlideData } from '../../types/course';
import { getTheme } from '../../themes';

// Strip '#' prefix from hex color for pptxgenjs
function hex(color: string): string {
  return color.replace(/^#/, '');
}

// Build PPTX theme constants from a visual theme
function buildPptxTheme(themeId?: string) {
  const t = getTheme(themeId);
  return {
    bg: hex(t.pageBg),
    title: hex(t.textPrimary),
    body: hex(t.textSecondary),
    accent: hex(t.accent),
    accentLight: hex(t.accentLight),
    muted: hex(t.textMuted),
    cardBg: hex(t.cardBg),
    amber: hex(t.warmAccent),
    font: 'Segoe UI',
  };
}

// Default theme for module-level references
let THEME = buildPptxTheme();

/**
 * Adds a slide number label in the bottom-right corner.
 */
function addSlideNumber(slide: PptxGenJS.Slide, num: number, total: number): void {
  slide.addText(`${num} / ${total}`, {
    x: 8.2,
    y: 5.2,
    w: 1.5,
    h: 0.3,
    fontSize: 9,
    color: THEME.muted,
    fontFace: THEME.font,
    align: 'right',
  });
}

/**
 * Title slide: large centered chapter title with hook subtitle.
 */
function buildTitleSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  courseTitle: string,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.bg };

  // Chapter title
  slide.addText(slideData.title, {
    x: 1.0,
    y: 1.2,
    w: 8.0,
    h: 1.8,
    fontSize: 36,
    bold: true,
    color: THEME.title,
    fontFace: THEME.font,
    align: 'center',
    valign: 'bottom',
  });

  // Accent bar
  slide.addShape('rect', {
    x: 4.0,
    y: 3.2,
    w: 2.0,
    h: 0.06,
    fill: { color: THEME.accent },
    rectRadius: 0.03,
  });

  // Hook / subtitle
  if (slideData.bodyText) {
    slide.addText(slideData.bodyText, {
      x: 1.0,
      y: 3.5,
      w: 8.0,
      h: 0.8,
      fontSize: 16,
      italic: true,
      color: THEME.body,
      fontFace: THEME.font,
      align: 'center',
      valign: 'top',
    });
  }

  // Course name
  slide.addText(courseTitle, {
    x: 1.0,
    y: 4.6,
    w: 8.0,
    h: 0.5,
    fontSize: 12,
    color: THEME.muted,
    fontFace: THEME.font,
    align: 'center',
  });

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Section divider: large bold title with subtle subtitle.
 */
function buildSectionSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.cardBg };

  // Left accent bar
  slide.addShape('rect', {
    x: 0.6,
    y: 1.5,
    w: 0.08,
    h: 2.5,
    fill: { color: THEME.accent },
    rectRadius: 0.04,
  });

  // Section title
  slide.addText(slideData.title, {
    x: 1.1,
    y: 1.5,
    w: 8.0,
    h: 1.4,
    fontSize: 32,
    bold: true,
    color: THEME.title,
    fontFace: THEME.font,
    align: 'left',
    valign: 'middle',
  });

  // Section subtitle
  if (slideData.bodyText) {
    slide.addText(slideData.bodyText, {
      x: 1.1,
      y: 3.0,
      w: 8.0,
      h: 0.8,
      fontSize: 16,
      color: THEME.body,
      fontFace: THEME.font,
      align: 'left',
      valign: 'top',
    });
  }

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Content slide: title + bullet points.
 */
function buildContentSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.bg };

  // Title
  slide.addText(slideData.title, {
    x: 0.7,
    y: 0.3,
    w: 8.6,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: THEME.title,
    fontFace: THEME.font,
    align: 'left',
    valign: 'middle',
  });

  // Accent underline
  slide.addShape('rect', {
    x: 0.7,
    y: 1.15,
    w: 8.6,
    h: 0.025,
    fill: { color: THEME.accent },
  });

  // Bullets
  if (slideData.bullets && slideData.bullets.length > 0) {
    const bulletRows: PptxGenJS.TextProps[] = slideData.bullets.map((bullet) => ({
      text: bullet,
      options: {
        fontSize: 16,
        color: THEME.body,
        fontFace: THEME.font,
        bullet: {
          code: '25CF',
          color: THEME.accent,
          fontSize: 10,
        },
        paraSpaceBefore: 8,
        paraSpaceAfter: 4,
        lineSpacing: 22,
      },
    }));

    slide.addText(bulletRows, {
      x: 0.9,
      y: 1.4,
      w: 8.2,
      h: 3.8,
      valign: 'top',
    });
  }

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Big-idea slide: single large statement centered on screen.
 */
function buildBigIdeaSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.bg };

  // Small label at top
  slide.addText(slideData.title, {
    x: 1.0,
    y: 0.8,
    w: 8.0,
    h: 0.5,
    fontSize: 12,
    bold: true,
    color: THEME.accent,
    fontFace: THEME.font,
    align: 'center',
    charSpacing: 3,
  });

  // Big statement
  if (slideData.bodyText) {
    slide.addText(slideData.bodyText, {
      x: 1.0,
      y: 1.6,
      w: 8.0,
      h: 2.8,
      fontSize: 28,
      bold: true,
      color: THEME.title,
      fontFace: THEME.font,
      align: 'center',
      valign: 'middle',
      lineSpacing: 36,
    });
  }

  // Bottom accent dots
  for (let i = 0; i < 3; i++) {
    slide.addShape('ellipse', {
      x: 4.7 + i * 0.25,
      y: 4.8,
      w: 0.1,
      h: 0.1,
      fill: { color: i === 1 ? THEME.accent : THEME.muted },
    });
  }

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Quote slide: large italic quote with attribution.
 */
function buildQuoteSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.bg };

  // Large opening quote mark
  slide.addText('\u201C', {
    x: 0.8,
    y: 0.4,
    w: 1.0,
    h: 1.2,
    fontSize: 72,
    color: THEME.accent,
    fontFace: 'Georgia',
    align: 'left',
    bold: true,
  });

  // Quote body
  if (slideData.bodyText) {
    slide.addText(slideData.bodyText, {
      x: 1.2,
      y: 1.4,
      w: 7.6,
      h: 2.4,
      fontSize: 22,
      italic: true,
      color: THEME.title,
      fontFace: THEME.font,
      align: 'left',
      valign: 'middle',
      lineSpacing: 32,
    });
  }

  // Attribution line
  slide.addShape('rect', {
    x: 1.2,
    y: 4.0,
    w: 1.5,
    h: 0.04,
    fill: { color: THEME.accent },
    rectRadius: 0.02,
  });

  slide.addText(slideData.title, {
    x: 1.2,
    y: 4.2,
    w: 7.6,
    h: 0.5,
    fontSize: 14,
    color: THEME.accentLight,
    fontFace: THEME.font,
    align: 'left',
  });

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Two-column slide: left and right bullet lists for comparison.
 */
function buildTwoColumnSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  slideNum: number,
  totalSlides: number,
): void {
  const slide = pptx.addSlide();
  slide.background = { fill: THEME.bg };

  // Title
  slide.addText(slideData.title, {
    x: 0.7,
    y: 0.3,
    w: 8.6,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: THEME.title,
    fontFace: THEME.font,
    align: 'left',
    valign: 'middle',
  });

  slide.addShape('rect', {
    x: 0.7,
    y: 1.15,
    w: 8.6,
    h: 0.025,
    fill: { color: THEME.accent },
  });

  // Left column
  const leftItems = slideData.bullets || [];
  if (leftItems.length > 0) {
    const leftRows: PptxGenJS.TextProps[] = leftItems.map((item) => ({
      text: item,
      options: {
        fontSize: 14,
        color: THEME.body,
        fontFace: THEME.font,
        bullet: { code: '25CF', color: THEME.accent, fontSize: 8 },
        paraSpaceBefore: 6,
        paraSpaceAfter: 3,
        lineSpacing: 20,
      },
    }));
    slide.addText(leftRows, {
      x: 0.7,
      y: 1.4,
      w: 4.0,
      h: 3.8,
      valign: 'top',
    });
  }

  // Center divider
  slide.addShape('rect', {
    x: 4.95,
    y: 1.5,
    w: 0.03,
    h: 3.2,
    fill: { color: THEME.muted },
  });

  // Right column
  let rightItems: string[] = [];
  if (slideData.bodyText) {
    try {
      rightItems = JSON.parse(slideData.bodyText);
    } catch {
      rightItems = [slideData.bodyText];
    }
  }
  if (rightItems.length > 0) {
    const rightRows: PptxGenJS.TextProps[] = rightItems.map((item) => ({
      text: item,
      options: {
        fontSize: 14,
        color: THEME.body,
        fontFace: THEME.font,
        bullet: { code: '25CF', color: THEME.amber, fontSize: 8 },
        paraSpaceBefore: 6,
        paraSpaceAfter: 3,
        lineSpacing: 20,
      },
    }));
    slide.addText(rightRows, {
      x: 5.3,
      y: 1.4,
      w: 4.0,
      h: 3.8,
      valign: 'top',
    });
  }

  if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
  addSlideNumber(slide, slideNum, totalSlides);
}

/**
 * Generates a .pptx file from an array of SlideData objects.
 */
export async function generatePptx(
  slides: SlideData[],
  courseTitle: string,
  chapterTitle: string,
  themeId?: string,
): Promise<Blob> {
  THEME = buildPptxTheme(themeId);
  // Handle CJS/ESM interop: in some Node.js environments the default import
  // wraps the constructor in a { default: ... } object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = typeof PptxGenJS === 'function' ? PptxGenJS : (PptxGenJS as any).default;
  const pptx = new Ctor();

  pptx.author = 'ClassBuild';
  pptx.title = chapterTitle;
  pptx.subject = courseTitle;
  pptx.layout = 'LAYOUT_16x9';

  const totalSlides = slides.length;

  for (let i = 0; i < slides.length; i++) {
    const slideData = slides[i];
    const slideNum = i + 1;
    const layout = slideData.layout || 'content';

    switch (layout) {
      case 'title':
        buildTitleSlide(pptx, slideData, courseTitle, slideNum, totalSlides);
        break;
      case 'section':
        buildSectionSlide(pptx, slideData, slideNum, totalSlides);
        break;
      case 'big-idea':
        buildBigIdeaSlide(pptx, slideData, slideNum, totalSlides);
        break;
      case 'quote':
        buildQuoteSlide(pptx, slideData, slideNum, totalSlides);
        break;
      case 'two-column':
        buildTwoColumnSlide(pptx, slideData, slideNum, totalSlides);
        break;
      case 'content':
      default:
        buildContentSlide(pptx, slideData, slideNum, totalSlides);
        break;
    }
  }

  const output = await pptx.write({ outputType: 'blob' });
  return output as Blob;
}
