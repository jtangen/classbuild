/**
 * Pure helpers + the in-iframe click shim for per-image chapter refine.
 * Pulled out of BuildPage.tsx so the ReadingTab component (and any future
 * consumer) can use them without dragging the whole page module.
 */

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
 *  untouched. */
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
  const escapedPrompt = newPrompt.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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
  block = block.replace(/(<img[^>]*?\bsrc=)"[^"]*"/i, (_, pre: string) => `${pre}"${newDataUri}"`);
  return html.replace(m[1], () => block);
}

/** Tiny script appended to the chapter iframe srcdoc on BuildPage so that
 *  clicking a rendered image (or focusing it and pressing Enter / Space) posts
 *  a message to the parent, which opens the refine drawer for that figure. */
export const CHAPTER_IMAGE_CLICK_SHIM = `<script>(function(){
  function post(img){
    var fig = img.closest('figure.ch-figure');
    if (!fig) return false;
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
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var img = t.closest('img[data-image-idx]');
    if (img && post(img)) e.preventDefault();
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (!t || !t.matches || !t.matches('img[data-image-idx]')) return;
    if (post(t)) e.preventDefault();
  });
  var imgs = document.querySelectorAll('figure.ch-figure img[data-image-idx]');
  for (var i = 0; i < imgs.length; i++) {
    var f = imgs[i].closest('figure.ch-figure');
    var n = parseInt(f ? f.getAttribute('data-image-idx') : '', 10);
    imgs[i].setAttribute('tabindex', '0');
    imgs[i].setAttribute('role', 'button');
    imgs[i].setAttribute('aria-label', 'Refine figure ' + (isNaN(n) ? '' : n + 1) + (imgs[i].alt ? ': ' + imgs[i].alt : ''));
  }
  var s = document.createElement('style');
  s.textContent = 'figure.ch-figure img[data-image-idx]{transition:outline 160ms ease, box-shadow 160ms ease;outline:2px solid transparent;outline-offset:4px;}figure.ch-figure img[data-image-idx]:hover,figure.ch-figure img[data-image-idx]:focus-visible{outline-color:#6e1f24;box-shadow:0 0 0 1px rgba(110,31,36,0.15);}figure.ch-figure{position:relative;}figure.ch-figure:hover::after,figure.ch-figure:focus-within::after{content:"✎ refine";position:absolute;top:8px;right:8px;background:#6e1f24;color:#fff;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 7px;border-radius:2px;opacity:0.92;pointer-events:none;}';
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
