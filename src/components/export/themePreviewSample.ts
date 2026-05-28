/**
 * Sample chapter fragment used by the ExportPage theme picker overlay. Same
 * content across all six themes — only the wrapping body class changes — so a
 * reviewer can see what their actual export will feel like at full length.
 *
 * Sourced from the brief's reference chapter-template.html and stripped of
 * the dev theme switcher.
 */
export const PREVIEW_CHAPTER_FRAGMENT = `
<article class="ch">
  <header class="ch-head">
    <div class="ch-eyebrow">Class 1 · Module One</div>
    <h1 class="ch-title">One Leaf, <em>a Thousand</em> Mountains</h1>
    <p class="ch-subtitle">How a single species became every tea on Earth — and why the mountain where it grows matters as much as the hands that shape it.</p>
    <div class="ch-meta">
      <span>12 min read</span>
      <span class="ch-meta-dot"></span>
      <span>8 cited sources</span>
    </div>
  </header>

  <section class="ch-hook">
    <p><span class="ch-dropcap">D</span>eep in the Xishuangbanna Prefecture of southern Yunnan, there are tea trees that were already old when the Ming Dynasty fell. Their trunks are thick enough that a person cannot wrap their arms around them, and their canopies stretch ten meters skyward — a far cry from the waist-high hedgerows most people picture when they think of a tea garden.</p>
    <p>Now fly six thousand kilometers east to Shizuoka, where the same species — the very same <em>Camellia sinensis</em> — has been pruned into immaculate green rows along volcanic hillsides. Same species. Radically different cup. How is this possible?</p>
  </section>

  <section class="ch-section">
    <h2>The Plant Behind the Cup</h2>
    <p>Every tea you have ever tasted — every jasmine pearl, every smoky Lapsang Souchong, every frothy bowl of matcha — comes from the same botanical species: <span class="ch-key">Camellia sinensis</span>. The genus <em>Camellia</em> contains some 200-plus species, but only one has been cultivated for drinking on a global scale.</p>

    <h3>Two Varieties, One Species</h3>
    <p>Within this single species, two major botanical varieties dominate the world's tea gardens. <span class="ch-key">var. sinensis</span> — the &ldquo;Chinese variety&rdquo; — is a smaller-leafed, cold-tolerant bush that thrives at higher elevations. <span class="ch-key">var. assamica</span> — the &ldquo;Assam variety&rdquo; — is larger-leafed, heat-loving, and built the British tea industry in India.</p>

    <aside class="ch-callout">
      <div class="ch-callout-label">Think About It</div>
      <p>If all tea comes from the same species, why did such different traditions emerge in China and India? Consider the variety available in each region, the climate, and the colonial history.</p>
    </aside>
  </section>

  <hr class="ch-divider">

  <section class="ch-section">
    <h2>Terroir: The Taste of Place</h2>
    <p>Wine lovers have long spoken of <span class="ch-key">terroir</span> — the French concept that a product's flavor reflects its environment in ways that cannot be replicated elsewhere. Tea drinkers deserve the same vocabulary.</p>

    <div class="ch-widget">
      <div class="ch-widget-head">
        <div class="ch-widget-label">Interactive</div>
        <div class="ch-widget-title">Terroir Explorer</div>
      </div>
      <p class="ch-widget-sub">Select a region to see how altitude, rainfall, and soil shape the cup.</p>
      <div class="ch-widget-row">
        <div class="ch-widget-field">
          <span class="ch-widget-fieldlabel">Region</span>
          <select class="ch-widget-select"><option>Darjeeling, India</option></select>
        </div>
        <div class="ch-widget-field">
          <span class="ch-widget-fieldlabel">Compare with</span>
          <select class="ch-widget-select"><option>Uji, Japan</option></select>
        </div>
      </div>
      <div class="ch-widget-meters">
        <div class="ch-meter">
          <span class="ch-meter-label">Sweetness</span>
          <span class="ch-meter-bar"><span style="width:70%"></span></span>
          <span class="ch-meter-num">7</span>
        </div>
        <div class="ch-meter">
          <span class="ch-meter-label">Astringency</span>
          <span class="ch-meter-bar"><span style="width:40%"></span></span>
          <span class="ch-meter-num">4</span>
        </div>
        <div class="ch-meter">
          <span class="ch-meter-label">Aroma</span>
          <span class="ch-meter-bar"><span style="width:90%"></span></span>
          <span class="ch-meter-num">9</span>
        </div>
        <div class="ch-meter">
          <span class="ch-meter-label">Umami</span>
          <span class="ch-meter-bar"><span style="width:30%"></span></span>
          <span class="ch-meter-num">3</span>
        </div>
      </div>
      <button class="ch-widget-btn">Why does this matter?</button>
    </div>
  </section>

  <figure class="ch-figure">
    <div class="ch-figbox">
      <span class="ch-figbox-tag">photograph · two cultivars, side by side</span>
    </div>
    <figcaption>
      <span class="ch-fig-num">Fig. 1</span> <em>Camellia sinensis</em> var. <em>sinensis</em> (left) shows smaller, glossy leaves; var. <em>assamica</em> (right) has the long, soft leaves of the lowland tropics.
    </figcaption>
  </figure>

  <blockquote class="ch-quote">
    <p>The leaf does not decide what it will become. The mountain, the weather, and the tea maker's hands decide together.</p>
    <cite>Traditional saying — Wuyi Mountain tea producers</cite>
  </blockquote>

  <section class="ch-takeaways">
    <h2>Key Takeaways</h2>
    <ul>
      <li>All tea comes from a single species, <em>Camellia sinensis</em>, whose genetic flexibility produces enormous diversity in the cup.</li>
      <li>The two major varieties — <em>sinensis</em> and <em>assamica</em> — represent two poles of a continuum, with many cultivars blending traits from both.</li>
      <li>Terroir shapes which compounds a leaf produces and in what concentration; geography is a determinant of flavor.</li>
    </ul>
  </section>

  <section class="ch-lookahead">
    <div class="ch-lookahead-label">Looking Ahead</div>
    <p>In <em>Chapter 2 — From Garden to Withering Trough</em>, we follow the freshly plucked leaf through its first transformation, and ask why the first hours of processing set the trajectory for everything that follows.</p>
  </section>

  <section class="ch-refs">
    <h2>References</h2>
    <p>Banerjee, B. (1992). Botanical classification of tea. In K. C. Willson &amp; M. N. Clifford (Eds.), <em>Tea: Cultivation to consumption</em> (pp. 25–51). Springer.</p>
    <p>Zhang, X. et al. (2021). Haplotype-resolved genome assembly provides insights into evolutionary history of the tea plant <em>Camellia sinensis</em>. <em>Nature Genetics, 53</em>(8), 1250–1259.</p>
  </section>

  <footer class="ch-foot">
    <span class="ch-foot-mark">¶</span>
    <span class="ch-foot-meta">ClassBuild · Chapter 1 of 4</span>
  </footer>
</article>
`;

/**
 * The card mini-preview shows only the header, using each theme's sample
 * eyebrow + title from CHAPTER_THEMES so the six cards aren't confusable at
 * thumbnail size. This builds that header fragment.
 */
export function buildPreviewHeaderFragment(eyebrow: string, title: string): string {
  // Allow <em>...</em> mid-title in the sample data for themes that lean on
  // partial-italic display.
  return `
<article class="ch">
  <header class="ch-head">
    <div class="ch-eyebrow">${eyebrow}</div>
    <h1 class="ch-title">${title}</h1>
    <p class="ch-subtitle">A sample subtitle — short enough to fit a thumbnail.</p>
    <div class="ch-meta">
      <span>12 min read</span>
      <span class="ch-meta-dot"></span>
      <span>8 cited sources</span>
    </div>
  </header>
  <section class="ch-hook">
    <p><span class="ch-dropcap">A</span> one-paragraph opener so the dropcap and body face come through in the thumbnail.</p>
  </section>
</article>
`;
}
