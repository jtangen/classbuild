/**
 * Pure helpers + the in-iframe click shim for per-image chapter refine.
 * Pulled out of BuildPage.tsx so the ReadingTab component (and any future
 * consumer) can use them without dragging the whole page module.
 */

import { FIGURE_UNAVAILABLE_BOX, figureImageBox } from '../../services/openai/figureMarkup';

export const CHAPTER_ASPECT_TO_SIZE: Record<string, string> = {
  square: '1024x1024',
  portrait: '1024x1536',
  landscape: '1536x1024',
  'wide-landscape': '2048x1152',
};

/** Pull the `<img src>` for the chapter image at the given idx, so the
 *  refine drawer can show a thumbnail without round-tripping to the iframe. */
export function getChapterImageSrc(html: string, idx: number): string | null {
  const re = new RegExp(
    `<figure[^>]*\\bdata-image-idx="${idx}"[^>]*>[\\s\\S]*?<img[^>]*?\\bsrc="([^"]*)"`,
    'i',
  );
  const m = html.match(re);
  return m ? m[1] : null;
}

/** Replace one chapter image's prompt + src in place. Targets the figure
 *  by data-image-idx and rewrites just the figure's data-prompt attribute
 *  and the inner img's src attribute — leaves the rest of the chapter HTML
 *  untouched. A figure whose first render failed has no img yet: the image
 *  takes the place of its "image unavailable" box, with the caption as alt. */
export function swapChapterImage(
  html: string,
  idx: number,
  newPrompt: string,
  newDataUri: string,
): string {
  const figureRe = new RegExp(
    `(<figure[^>]*\\bdata-image-idx="${idx}"[^>]*>[\\s\\S]*?<\\/figure>)`,
    'i',
  );
  const m = html.match(figureRe);
  if (!m) return html;
  const escapedPrompt = newPrompt
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Replacer functions throughout: a replacement *string* would expand `$&`,
  // `$'`, `` $` `` and `$$` inside the user's prompt (e.g. "US$'000") and
  // splice chunks of the chapter into the attribute.
  let block = m[1];
  if (/data-prompt="[^"]*"/i.test(block)) {
    block = block.replace(/data-prompt="[^"]*"/i, () => `data-prompt="${escapedPrompt}"`);
  } else {
    block = block.replace(
      /(<figure[^>]*?)>/i,
      (_, open: string) => `${open} data-prompt="${escapedPrompt}">`,
    );
  }
  if (/<img\b/i.test(block)) {
    block = block.replace(/(<img[^>]*?\bsrc=)"[^"]*"/i, (_, pre: string) => `${pre}"${newDataUri}"`);
  } else {
    block = block.replace(FIGURE_UNAVAILABLE_BOX, () => figureImageBox(newDataUri, captionAlt(block), idx));
  }
  return html.replace(m[1], () => block);
}

/** A figure's caption as alt text: the figcaption without its "Fig. N" label,
 *  tags dropped, escaped for an attribute value. */
function captionAlt(figureHtml: string): string {
  const caption = /<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i.exec(figureHtml)?.[1] ?? '';
  return caption
    .replace(/<span class="ch-fig-num">[\s\S]*?<\/span>/i, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '&quot;');
}

/** Tiny script appended to the chapter iframe srcdoc on BuildPage so that
 *  clicking a rendered image (or focusing it and pressing Enter / Space) posts
 *  a message to the parent, which opens the refine drawer for that figure.
 *  A figure whose render failed has no image, so its "image unavailable" box
 *  takes the click instead and the drawer offers to try again. */
export const CHAPTER_IMAGE_CLICK_SHIM = `<script>(function(){
  function post(fig){
    var idxStr = fig.getAttribute('data-image-idx');
    var idx = idxStr == null ? NaN : parseInt(idxStr, 10);
    if (isNaN(idx)) return false;
    try {
      parent.postMessage({
        __cbImageClick: 1,
        idx: idx,
        prompt: fig.getAttribute('data-prompt') || '',
        aspect: fig.getAttribute('data-aspect') || 'landscape'
      }, '*');
    } catch(err) {}
    return true;
  }
  // What opens the drawer: a rendered image, or a failed figure's box.
  function control(el){
    if (!el || !el.closest) return null;
    return el.closest('img[data-image-idx]') || el.closest('figure.cb-fig-failed > .ch-figbox');
  }
  document.addEventListener('click', function(e){
    var c = control(e.target);
    var fig = c && c.closest('figure.ch-figure');
    if (fig && post(fig)) e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (!t || control(t) !== t) return;
    var fig = t.closest('figure.ch-figure');
    if (fig && post(fig)) e.preventDefault();
  });
  var figs = document.querySelectorAll('figure.ch-figure[data-image-idx]');
  for (var i = 0; i < figs.length; i++) {
    var n = parseInt(figs[i].getAttribute('data-image-idx'), 10);
    if (isNaN(n)) continue;
    var img = figs[i].querySelector('img[data-image-idx]');
    var box = figs[i].querySelector('.ch-figbox');
    if (img) {
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Refine figure ' + (n + 1) + (img.alt ? ': ' + img.alt : ''));
    } else if (box) {
      figs[i].classList.add('cb-fig-failed');
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'button');
      box.setAttribute('aria-label', 'Figure ' + (n + 1) + ' was not drawn. Try again');
    }
  }
  var s = document.createElement('style');
  s.textContent = 'figure.ch-figure img[data-image-idx],figure.cb-fig-failed > .ch-figbox{transition:outline 160ms ease, box-shadow 160ms ease;outline:2px solid transparent;outline-offset:4px;}figure.ch-figure img[data-image-idx]:hover,figure.ch-figure img[data-image-idx]:focus-visible,figure.cb-fig-failed > .ch-figbox:hover,figure.cb-fig-failed > .ch-figbox:focus-visible{outline-color:#6e1f24;box-shadow:0 0 0 1px rgba(110,31,36,0.15);}figure.cb-fig-failed > .ch-figbox{cursor:pointer;}figure.ch-figure{position:relative;}figure.ch-figure:hover::after,figure.ch-figure:focus-within::after{content:"✎ refine";position:absolute;top:8px;right:8px;background:#6e1f24;color:#fff;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 7px;border-radius:2px;opacity:0.92;pointer-events:none;}figure.ch-figure.cb-fig-failed:hover::after,figure.ch-figure.cb-fig-failed:focus-within::after{content:"↻ try again";}';
  document.head && document.head.appendChild(s);
})();</script>`;

export function withImageClickShim(html: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', () => `${CHAPTER_IMAGE_CLICK_SHIM}</body>`);
  }
  return html + CHAPTER_IMAGE_CLICK_SHIM;
}

/** Does this chapter contain at least one rendered image with `data-image-idx`?
 *  Used to decide whether the "click or tap any image to refine it" hint is relevant. */
export function chapterHasRefinableImages(html: string): boolean {
  return /<figure[^>]*\bdata-image-idx="\d+"/i.test(html);
}
