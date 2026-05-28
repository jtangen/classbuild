import PptxGenJS from 'pptxgenjs';
import type { SlideData } from '../../types/course';
import { generateImageWithRetry } from '../openai/imageGen';
import { withSafetyClause } from '../openai/safetyClause';

/**
 * Slide generation now renders each slide as a single 4K (3840×2160)
 * editorial image via gpt-image-2 — the image carries the slide's title,
 * key text, and visuals together. pptxgenjs is used as the container: each
 * slide is a 16:9 frame with the rendered image filling the full bleed, and
 * the AI-written speaker notes attached natively.
 *
 * The slides themselves contain no native PowerPoint text — the image *is*
 * the slide. Speaker notes remain native pptx notes so the presenter can
 * read them in slide-show view.
 */

export type SlideImageProgress = (slideIndex: number, total: number, phase: 'rendering' | 'packing') => void;

interface GeneratePptxOptions {
  /** Image quality for each rendered slide. Defaults to 'high'. */
  imageQuality?: 'low' | 'medium' | 'high' | 'auto';
  /** Pixel size requested from gpt-image-2 per slide. Defaults to 4K landscape. */
  imageSize?: string;
  /**
   * Number of gpt-image-2 requests in flight at once. Defaults to 6. The
   * Image API tolerates concurrent calls well; setting too high risks
   * hitting per-minute rate limits, but the retry layer handles that
   * gracefully with exponential backoff.
   */
  concurrency?: number;
  /** Notified for every step so the UI can show progress. */
  onProgress?: SlideImageProgress;
  /**
   * Fires as soon as each slide image is rendered. Callers use this to
   * persist `imageDataUri` to the course store incrementally — so navigating
   * away mid-render (or a crash) doesn't lose finished work.
   */
  onSlideRendered?: (slideIndex: number, dataUri: string) => void;
  /**
   * If the caller already has rendered image data URIs (e.g. cached from a
   * prior render), pass them here keyed by slide index — they're used as-is
   * and OpenAI isn't called for those slides.
   */
  preRendered?: Record<number, string>;
}

/**
 * Render every slide image via gpt-image-2 (or reuse cached ones), then pack
 * everything into a .pptx where each slide is a full-bleed 16:9 image with
 * the AI-written notes attached.
 */
export async function generatePptx(
  slides: SlideData[],
  courseTitle: string,
  chapterTitle: string,
  _themeId: string | undefined,
  apiKey: string,
  options: GeneratePptxOptions = {},
): Promise<{ blob: Blob; renderedImages: Record<number, string> }> {
  if (!slides || slides.length === 0) {
    throw new Error('Cannot build a deck from zero slides.');
  }
  if (!apiKey?.trim()) {
    throw new Error('OpenAI API key is required to render slide images.');
  }

  const renderedImages: Record<number, string> = { ...(options.preRendered ?? {}) };
  const size = options.imageSize ?? '3840x2160';
  const quality = options.imageQuality ?? 'high';

  // Render images with bounded concurrency (3 in flight) so a 12-slide deck
  // finishes in a few minutes rather than a few minutes per slide.
  const todo: number[] = [];
  for (let i = 0; i < slides.length; i++) {
    if (renderedImages[i]) continue;
    if (!slides[i].imagePrompt?.trim()) continue;
    todo.push(i);
  }

  let completed = 0;
  const concurrency = Math.min(options.concurrency ?? 6, todo.length);
  let cursor = 0;
  options.onProgress?.(0, slides.length, 'rendering');

  async function worker() {
    while (true) {
      const next = cursor++;
      if (next >= todo.length) return;
      const i = todo[next];
      const prompt = withSafetyClause(slides[i].imagePrompt!.trim());
      try {
        const dataUri = await generateImageWithRetry(prompt, apiKey, {
          size,
          quality,
          compression: 88,
        });
        renderedImages[i] = dataUri;
        // Persist immediately so a tab-switch or refresh doesn't lose work.
        options.onSlideRendered?.(i, dataUri);
      } catch (err) {
        // Surface failure but keep going — packing logic falls back to a
        // text-only slide so the deck still ships.
        console.error(`Slide ${i + 1} image gen failed:`, err);
      }
      completed++;
      options.onProgress?.(completed, slides.length, 'rendering');
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  options.onProgress?.(slides.length, slides.length, 'packing');

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.333" × 7.5", standard 16:9
  pptx.title = `${chapterTitle} — ${courseTitle}`;
  pptx.author = 'ClassBuild';

  const slideWidth = 13.333;
  const slideHeight = 7.5;

  slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    const dataUri = renderedImages[i];

    if (dataUri) {
      // Full-bleed image, sized to the entire slide.
      s.addImage({
        data: dataUri,
        x: 0,
        y: 0,
        w: slideWidth,
        h: slideHeight,
        sizing: { type: 'cover', w: slideWidth, h: slideHeight },
      });
    } else {
      // Fallback: text-only slide if image generation failed for this slide.
      s.background = { color: 'F1EBDD' }; // parchment, theme-neutral
      s.addText(slide.title ?? `Slide ${i + 1}`, {
        x: 0.8,
        y: 0.8,
        w: slideWidth - 1.6,
        h: 1.2,
        fontSize: 36,
        fontFace: 'Georgia',
        color: '14110D',
        bold: false,
      });
      if (slide.bodyText || slide.bullets?.length) {
        const body =
          slide.bodyText ??
          (slide.bullets ?? []).map((b) => `• ${b}`).join('\n');
        s.addText(body, {
          x: 0.8,
          y: 2.4,
          w: slideWidth - 1.6,
          h: slideHeight - 3.6,
          fontSize: 20,
          fontFace: 'Georgia',
          color: '3A342C',
          valign: 'top',
        });
      }
    }

    // Speaker notes attach natively — visible in slide-show view.
    if (slide.speakerNotes?.trim()) {
      s.addNotes(slide.speakerNotes);
    }
  });

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return { blob, renderedImages };
}
