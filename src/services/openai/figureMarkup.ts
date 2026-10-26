/**
 * Markup for the box inside a rendered chapter figure, shared by the image
 * placer (first render) and Build's per-figure refine (every later render),
 * so a figure whose first render failed can take its image in place.
 */

/**
 * Box holding a rendered image. Theme CSS gives .ch-figbox a fixed height for
 * the empty state; with an image inside it's unset so the image keeps its
 * natural aspect ratio, capped so portrait crops don't dominate the scroll.
 * `alt` must already be escaped for an attribute value.
 */
export function figureImageBox(src: string, alt: string, idx: number): string {
  return `<div class="ch-figbox" style="height:auto;overflow:visible;"><img src="${src}" alt="${alt}" data-image-idx="${idx}" style="display:block;max-width:100%;max-height:75vh;height:auto;width:auto;margin:0 auto;cursor:pointer;"></div>`;
}

/** Box left where a render failed (scripts/lib/node-image-placer.ts writes the same). */
export const FIGURE_UNAVAILABLE_BOX =
  '<div class="ch-figbox" style="display:flex;align-items:center;justify-content:center;"><span class="ch-figbox-tag">image unavailable</span></div>';
