import type { ChapterTheme } from '../themes';

/**
 * ClassBuild's image house style — the one source of truth for every
 * gpt-image-2 prompt Claude writes: chapter figures, slide images and the
 * chapter infographic.
 *
 * Two registers only: clean editorial photography for anything a camera could
 * capture, and clean modern editorial information graphics for ideas a camera
 * can't. Painterly and "vintage" idioms rendered as recognisable AI pastiche
 * (the field-guide watercolours of the first example courses), so they're
 * ruled out. The chapter theme styles the page around an image, not the image.
 */

/** Information-graphic colours, shared by chapter figures and the infographic.
 *  Deliberately theme-independent: the graphic should read as clean editorial
 *  work whichever theme's page it sits on. */
export const INFOGRAPHIC_COLOURS =
  'flat dark navy (#1f2e4a) lines and labels on a clean off-white (#fbfaf7) ground, a single dark-coral (#d0533f) accent for the one thing that matters, and light warm grey (#d9d6cf) for supporting marks';

export const IMAGE_REGISTERS = `**Pick one of two registers for every image — nothing else.**

1. **Editorial photograph** — for anything a camera could capture: objects, materials, places, organisms, equipment, food, people at work, a process as it happens. Write it like a photo brief: the kind of shot (documentary, environmental, studio still life, overhead flat-lay, macro), the lens (16–24 mm for environments, 35 mm for flat-lays and scenes, 50 mm for single subjects, 85 mm for portraits and details, 100 mm macro for small things), the camera position and height, the light (soft diffused window light, overcast daylight, soft studio light), where focus falls, and end with "photoreal, true-to-life colour". For a comparison or a sequence, use a grid of frames that keeps the same subject, backdrop, lens and light in every frame, so only the thing being compared changes.
2. **Editorial information graphic** — for what a camera can't capture: the shape of data, mechanisms, processes, cycles, timelines, maps, cross-sections, comparisons. Style it like a New York Times, Bloomberg, Economist or Nature graphic: flat vector shapes, thin precise lines, generous white space, modern sans-serif labels (Inter or Helvetica style), and no texture, gradients, drop shadows or 3D.

Decide with one question: could a photographer take this picture today? If yes, photograph it. If not, draw it as an information graphic.`;

export const IMAGE_FORBIDDEN_IDIOMS = `**Never use these idioms** — they read as AI pastiche, not editorial work: watercolour, pen-and-ink, pencil sketch, woodcut, engraving or etching, scientific-plate or naturalist field-guide illustration, "vintage" or sepia illustration, risograph, hand-lettering, graph-paper or lab-notebook looks, taped notes, parchment or paper texture, ornate cartouches or roman-numeral plates, 3D renders, clip-art or icon sets, stock-photo composites. Don't describe colours as paints or paper ("cream paper ground", "umber linework") — that summons faux paper textures.`;

export const NAMED_SUBJECTS_RULE = `**Real people, past events and named things.** A photoreal image of a specific real person or a specific past event would be a fabricated photograph, so never stage one: no likeness of any named person, living or historical, and no "documentary" photograph of a historical scene. Show what truthfully exists instead: the place as it looks today, a surviving artefact or instrument photographed as a museum still life, a working replica (and say so in the caption), or an information graphic such as a timeline, map or annotated diagram. Generic, unnamed people are fine (a nurse taking a pulse, students in a seminar): show a realistic mix of ages, genders and backgrounds, and never imply they are a particular real person. No brand logos, readable branding, celebrities or copyrighted characters.`;

export const IMAGE_TEXT_RULE = `**Text inside an image.** Photographs are wordless by default. When labels are essential, set them in a slim dark-grey caption strip beneath each frame, in clean white sans-serif (Inter, all-caps). Information graphics may set short labels directly, in their sans-serif. Quote every label exactly in the prompt; keep each to four words or fewer and use at most six.`;

/** The closing clause every image prompt ends with. */
export const IMAGE_AVOID_CLAUSE =
  'No watermarks, no logos or readable branding, no stray text, no paper texture, no illustration or painterly styles.';

/** Plain colour names for each theme's accent, for slide prompts. */
const ACCENT_NAMES: Record<string, string> = {
  press: 'brick red',
  notebook: 'tomato red',
  almanac: 'burnt orange',
  storybook: 'cherry red',
  studio: 'warm taupe',
  terminal: 'mint green',
};

/**
 * Slide colours borrow only the ground and the accent from the chapter theme —
 * never a "look". Dark themes get a dark slide ground so the deck matches the
 * reading's mode.
 */
export function slideColours(theme: ChapterTheme): { ground: string; ink: string; accent: string } {
  const [bg, text, accent] = theme.palette;
  const accentName = ACCENT_NAMES[theme.id] ?? 'accent';
  return theme.mode === 'dark'
    ? { ground: `a deep near-black ground (${bg})`, ink: `off-white type (${text})`, accent: `${accentName} (${accent})` }
    : { ground: 'a clean off-white ground (#fafaf7)', ink: 'deep charcoal type (#1f1f1f)', accent: `${accentName} (${accent})` };
}
