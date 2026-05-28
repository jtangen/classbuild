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
  let block = m[1];
  if (/data-prompt="[^"]*"/i.test(block)) {
    block = block.replace(/data-prompt="[^"]*"/i, `data-prompt="${escapedPrompt}"`);
  } else {
    block = block.replace(
      /(<figure[^>]*?)>/i,
      `$1 data-prompt="${escapedPrompt}">`,
    );
  }
  block = block.replace(/(<img[^>]*?\bsrc=)"[^"]*"/i, `$1"${newDataUri}"`);
  return html.replace(m[1], block);
}

/** Tiny script appended to the chapter iframe srcdoc on BuildPage so that
 *  clicks on rendered images bubble to the parent as postMessages. */
export const CHAPTER_IMAGE_CLICK_SHIM = `<script>(function(){
  function onClick(e){
    var t = e.target;
    if (!t || !t.closest) return;
    var img = t.closest('img[data-image-idx]');
    if (!img) return;
    var fig = img.closest('figure.ch-figure');
    if (!fig) return;
    var idxStr = fig.getAttribute('data-image-idx');
    var idx = idxStr == null ? NaN : parseInt(idxStr, 10);
    if (isNaN(idx)) return;
    e.preventDefault();
    try {
      parent.postMessage({
        __cbImageClick: 1,
        idx: idx,
        prompt: fig.getAttribute('data-prompt') || '',
        aspect: fig.getAttribute('data-aspect') || 'landscape'
      }, '*');
    } catch(err) {}
  }
  document.addEventListener('click', onClick);
  var s = document.createElement('style');
  s.textContent = 'figure.ch-figure img[data-image-idx]{transition:outline 160ms ease, box-shadow 160ms ease;outline:2px solid transparent;outline-offset:4px;}figure.ch-figure img[data-image-idx]:hover{outline-color:#6e1f24;box-shadow:0 0 0 1px rgba(110,31,36,0.15);}figure.ch-figure img[data-image-idx]::after{}figure.ch-figure{position:relative;}figure.ch-figure:hover::after{content:"✎ refine";position:absolute;top:8px;right:8px;background:#6e1f24;color:#fff;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 7px;border-radius:2px;opacity:0.92;pointer-events:none;}';
  document.head && document.head.appendChild(s);
})();</script>`;

export function withImageClickShim(html: string): string {
  if (html.includes('</body>')) {
    return html.replace('</body>', `${CHAPTER_IMAGE_CLICK_SHIM}</body>`);
  }
  return html + CHAPTER_IMAGE_CLICK_SHIM;
}

/** Does this chapter contain at least one rendered image with `data-image-idx`?
 *  Used to decide whether the "Hover any image to refine it" hint is relevant. */
export function chapterHasRefinableImages(html: string): boolean {
  return /<figure[^>]*\bdata-image-idx="\d+"/i.test(html);
}
