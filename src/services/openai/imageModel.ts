/**
 * The OpenAI image model behind every ClassBuild image (chapter figures, 4K
 * slides, the CLI's infographic), in the app and in the CLI scripts. Change
 * the model here and nowhere else.
 *
 * GPT Image 2.6 comes in two variants: Sunburst for detailed visual work and
 * Flare for fast iteration. ClassBuild uses Sunburst, because its figures and
 * slides are dense editorial compositions with set type.
 *
 * When the model changes, re-read what Claude is told about it in
 * src/prompts/chapter.ts, slides.ts and infographic.ts (its strengths, its
 * limits, the canvas sizes it takes) and the render-time notes in the UI.
 */
export const IMAGE_MODEL = 'gpt-image-2.6-sunburst';

/** The model's name as the UI and Claude's image-prompt instructions give it. */
export const IMAGE_MODEL_NAME = 'GPT Image 2.6';
