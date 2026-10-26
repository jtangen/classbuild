import pressCss from './press.css?raw';
import notebookCss from './notebook.css?raw';
import almanacCss from './almanac.css?raw';
import storybookCss from './storybook.css?raw';
import studioCss from './studio.css?raw';
import terminalCss from './terminal.css?raw';

export type ChapterThemeId =
  | 'press'
  | 'notebook'
  | 'almanac'
  | 'storybook'
  | 'studio'
  | 'terminal';

export type ThemeMode = 'light' | 'dark';

/**
 * 5-role palette per the brief: bg · text · accent · muted · surface
 */
export type ThemePalette = readonly [
  bg: string,
  text: string,
  accent: string,
  muted: string,
  surface: string,
];

export interface ChapterTheme {
  id: ChapterThemeId;
  name: string;
  pitch: string;
  pairing: string;
  palette: ThemePalette;
  mode: ThemeMode;
  sample: { eyebrow: string; title: string };
  /** Display family — drives the card preview's title and the chapter title. */
  displayFont: string;
  /** Body family — drives the card preview's body and chapter prose. */
  bodyFont: string;
  /** Mono family — drives meta strips, eyebrows, captions. */
  monoFont: string;
  /** Raw CSS, scoped to `.theme-{id}`. */
  css: string;
}

export const CHAPTER_THEMES: readonly ChapterTheme[] = [
  {
    id: 'press',
    name: 'Press',
    pitch: 'Sunday broadsheet. Humanities, history, journalism.',
    pairing: 'Libre Caslon · Source Serif 4 · JetBrains Mono',
    palette: ['#f4efe3', '#14110d', '#b1342a', '#3a342c', '#d5c7a8'],
    mode: 'light',
    sample: { eyebrow: 'Chapter 3', title: 'A Brief History of the Estate System' },
    displayFont: "'Libre Caslon Text', Georgia, serif",
    bodyFont: "'Source Serif 4', Georgia, serif",
    monoFont: "'JetBrains Mono', ui-monospace, monospace",
    css: pressCss,
  },
  {
    id: 'notebook',
    name: 'Notebook',
    pitch: "Engineer's graph paper. STEM, math, problem sets.",
    pairing: 'IBM Plex Mono · IBM Plex Serif',
    palette: ['#fbf9f3', '#1a2238', '#c93b2a', '#fff3cf', '#cad7e3'],
    mode: 'light',
    sample: { eyebrow: 'Lecture 5', title: 'Linear Maps and the Rank-Nullity Theorem' },
    displayFont: "'IBM Plex Mono', ui-monospace, monospace",
    bodyFont: "'IBM Plex Serif', Georgia, serif",
    monoFont: "'IBM Plex Mono', ui-monospace, monospace",
    css: notebookCss,
  },
  {
    id: 'almanac',
    name: 'Almanac',
    pitch: "Naturalist's field guide. Biology, geography, food, crafts.",
    pairing: 'Cormorant Garamond · Lora · JetBrains Mono',
    palette: ['#f0e6cf', '#3a2a1c', '#b8662a', '#5e7148', '#f7eed5'],
    mode: 'light',
    sample: { eyebrow: 'Field Note 2', title: 'Identifying the Eastern Hardwoods' },
    displayFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Lora', Georgia, serif",
    monoFont: "'JetBrains Mono', ui-monospace, monospace",
    css: almanacCss,
  },
  {
    id: 'storybook',
    name: 'Storybook',
    pitch: 'Bold and friendly. Languages, intros, K-12.',
    pairing: 'DM Serif Display · DM Sans · DM Mono',
    palette: ['#fff8e7', '#1c2f4a', '#d94f4f', '#f4c645', '#4a8a6f'],
    mode: 'light',
    sample: { eyebrow: 'Lesson 4', title: 'Verbs that Move' },
    displayFont: "'DM Serif Display', Georgia, serif",
    bodyFont: "'DM Sans', system-ui, sans-serif",
    monoFont: "'DM Mono', ui-monospace, monospace",
    css: storybookCss,
  },
  {
    id: 'studio',
    name: 'Studio',
    pitch: 'Modernist monograph. Art, architecture, design.',
    pairing: 'Instrument Serif · Manrope · JetBrains Mono',
    palette: ['#fafaf7', '#0a0a0a', '#c9a382', '#4a4a4a', '#ecebe6'],
    mode: 'light',
    sample: { eyebrow: 'Module 1', title: 'The Bauhaus and After' },
    displayFont: "'Instrument Serif', Georgia, serif",
    bodyFont: "'Manrope', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', ui-monospace, monospace",
    css: studioCss,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    pitch: 'Dark dev docs. Programming, CS, sysadmin, ML.',
    pairing: 'JetBrains Mono · IBM Plex Sans',
    palette: ['#0d1117', '#e8edf2', '#6ee7b7', '#e8b87d', '#2a3a4a'],
    mode: 'dark',
    sample: { eyebrow: 'Day 6', title: 'Async Patterns and the Event Loop' },
    displayFont: "'JetBrains Mono', ui-monospace, monospace",
    bodyFont: "'IBM Plex Sans', system-ui, sans-serif",
    monoFont: "'JetBrains Mono', ui-monospace, monospace",
    css: terminalCss,
  },
] as const;

export const DEFAULT_CHAPTER_THEME_ID: ChapterThemeId = 'press';

export function getChapterTheme(themeId?: string): ChapterTheme {
  return (
    CHAPTER_THEMES.find((t) => t.id === themeId) ??
    CHAPTER_THEMES.find((t) => t.id === DEFAULT_CHAPTER_THEME_ID)!
  );
}

/** Consolidated Google Fonts link for all six themes. ~18KB on the wire. */
export const FONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400' +
  '&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400' +
  '&family=JetBrains+Mono:wght@400;500;700' +
  '&family=IBM+Plex+Mono:wght@400;500;600;700' +
  '&family=IBM+Plex+Serif:ital,wght@0,400;0,600;0,700;1,400' +
  '&family=IBM+Plex+Sans:wght@400;500;600' +
  '&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' +
  '&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' +
  '&family=DM+Serif+Display:ital@0;1' +
  '&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400' +
  '&family=DM+Mono:wght@400;500' +
  '&family=Instrument+Serif:ital@0;1' +
  '&family=Manrope:wght@300;400;500;600;700;800' +
  '&display=swap';

/** Desktop size of a theme's chapter title in px, read from its CSS. */
function titleSizePx(css: string): number {
  const m = css.match(/\.ch-title\s*\{[^}]*?font-size:\s*([\d.]+)px/);
  return m ? parseFloat(m[1]) : 54;
}

/**
 * Phone layout shared by every theme (the theme CSS files are desktop-only):
 * narrow side padding, a title that scales with the screen (never larger than
 * on desktop), widget rows that wrap, one column of meters, figures without
 * side bleed, and long reference URLs that break. Desktop is untouched.
 */
function phoneCss(theme: ChapterTheme): string {
  const s = `.theme-${theme.id}`;
  const max = Math.min(54, titleSizePx(theme.css));
  const min = Math.min(34, max);
  return `@media (max-width: 600px) {
  ${s} { padding-left: 18px; padding-right: 18px; }
  ${s} .ch-title { font-size: clamp(${min}px, 10vw, ${max}px); max-width: 100%; overflow-wrap: break-word; }
  ${s} .ch-widget-row { flex-wrap: wrap; }
  ${s} .ch-widget-field { flex: 1 1 100%; min-width: 0; }
  ${s} .ch-widget-select { width: 100%; min-width: 0; max-width: 100%; }
  ${s} .ch-widget-meters { grid-template-columns: 1fr; }
  ${s} .ch-figure { margin-left: 0; margin-right: 0; }
  ${s} .ch-refs p, ${s} .ch-refs li { overflow-wrap: anywhere; }
}`;
}

/**
 * Wrap a chapter body fragment (`<article class="ch">…</article>` + any widget
 * scripts) into a self-contained HTML document styled by the chosen theme.
 *
 * Chapters are stored as fragments. This is the single source of truth for
 * how a fragment becomes a viewable document — used by the in-app iframe
 * preview, the .html download, and the publish/SCORM exporters.
 */
export function wrapChapterHtml(
  fragment: string,
  themeId?: string,
  title?: string,
): string {
  const theme = getChapterTheme(themeId);
  const safeTitle = (title ?? 'Chapter').replace(/[<&]/g, (c) =>
    c === '<' ? '&lt;' : '&amp;',
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<style>
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
${theme.css}
${phoneCss(theme)}
</style>
</head>
<body class="theme-${theme.id}">
${fragment}
</body>
</html>`;
}

/**
 * Some legacy chapters (generated before the .ch-* contract) are stored as
 * complete HTML documents with inlined theme CSS. Detect that case so we can
 * render them as-is instead of double-wrapping a fragment.
 */
export function isLegacyChapterHtml(html: string): boolean {
  const head = html.slice(0, 200).toLowerCase();
  return head.includes('<!doctype') || head.includes('<html');
}

/**
 * Render a chapter regardless of which storage format it's in. Use this at
 * every render point (BuildPage iframe srcDoc, .html download, publishExporter,
 * SCORM packager).
 */
export function renderChapterHtml(
  html: string,
  themeId?: string,
  title?: string,
): string {
  if (isLegacyChapterHtml(html)) return html;
  return wrapChapterHtml(html, themeId, title);
}

// ─── Back-compat: legacy Theme shape ──────────────────────────────────────
//
// The PPTX exporter, quiz template, weekly challenge template, course viewer
// chrome, and CLI all read `theme.pageBg / cardBg / accent / textPrimary /
// textSecondary / textMuted / accentLight / warmAccent / success / isDark`.
// Map those fields off the new 5-role palette so those call sites keep working
// without per-call site edits.

export interface Theme {
  id: string;
  name: string;
  pageBg: string;
  cardBg: string;
  elevated: string;
  accent: string;
  accentLight: string;
  warmAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  headingFont: string;
  bodyFont: string;
  isDark: boolean;
}

function deriveLegacy(t: ChapterTheme): Theme {
  const [bg, text, accent, muted, surface] = t.palette;
  const dark = t.mode === 'dark';
  // Cards: dark themes keep their surface. Light themes use a gentle tint of
  // the page toward the surface, because some palette surfaces are saturated
  // (Storybook's green) and make poor reading grounds.
  const cardBg = dark ? surface : mix(bg, surface, 0.22);
  // Raised panels (option cards, slider tracks, stat tiles) are one visible
  // step from the card, toward the text colour, in every theme.
  const elevated = mix(cardBg, text, 0.07);
  // Every role used for text must be readable on each ground it can sit on:
  // 4.5:1 (WCAG AA) or better, darkened (or lightened on dark themes) only as
  // far as needed, so each colour keeps its hue. The last ground is a step
  // past `elevated`, as margin for lightly tinted panels and badges.
  const grounds = [bg, cardBg, elevated, mix(cardBg, text, 0.12)];
  const readable = (color: string, min = 4.5) => readableOn(color, grounds, min, dark);
  return {
    id: t.id,
    name: t.name,
    pageBg: bg,
    cardBg,
    elevated,
    accent: readable(accent),
    accentLight: dark ? readable(lighten(accent, 0.18)) : readable(accent),
    warmAccent: readable(muted),
    textPrimary: readable(text, 7),
    textSecondary: readable(mix(text, cardBg, 0.3)),
    textMuted: readable(mix(text, cardBg, 0.45)),
    success: readable(dark ? '#6ee7b7' : '#3d5c33'),
    headingFont: stripQuotes(t.displayFont),
    bodyFont: stripQuotes(t.bodyFont),
    isDark: dark,
  };
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours (1 to 21). */
function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * `color` if it already reaches `min` contrast on every ground, otherwise the
 * first 5% step toward black (light grounds) or white (dark grounds) that does.
 */
function readableOn(color: string, grounds: string[], min: number, dark: boolean): string {
  const toward = dark ? '#ffffff' : '#000000';
  for (let step = 0; step <= 20; step++) {
    const c = mix(color, toward, step / 20);
    if (grounds.every((g) => contrastRatio(c, g) >= min)) return c;
  }
  return toward;
}

/**
 * Make a fixed colour (a status green, a tier gold) readable as text on a
 * legacy theme's page, card and raised surfaces.
 */
export function readableOnTheme(color: string, theme: Theme, min = 4.5): string {
  const deep = mix(theme.cardBg, theme.textPrimary, 0.12);
  return readableOn(color, [theme.pageBg, theme.cardBg, theme.elevated, deep], min, theme.isDark);
}

function stripQuotes(font: string): string {
  const first = font.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '');
  const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function mix(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(r1 * (1 - t) + r2 * t, g1 * (1 - t) + g2 * t, b1 * (1 - t) + b2 * t);
}

export const THEMES: readonly Theme[] = CHAPTER_THEMES.map(deriveLegacy);

export function getTheme(themeId?: string): Theme {
  return THEMES.find((t) => t.id === themeId) ?? deriveLegacy(getChapterTheme(themeId));
}

/**
 * Legacy prompt-block helper kept for any prompt that still wants color hints.
 * The chapter prompt no longer uses this — themes ship as separate CSS files —
 * but the infographic prompt still uses it for palette guidance.
 */
export function buildThemePromptBlock(theme: Theme): string {
  // The raw brand palette, not the contrast-adjusted text roles above.
  const [bg, text, accent, muted, surface] = getChapterTheme(theme.id).palette;
  return `## VISUAL DESIGN
Use these colors as a palette guide:
- Page background: ${bg}
- Surface: ${surface}
- Primary accent: ${accent}
- Primary text: ${text}
- Muted accent: ${muted}`;
}
