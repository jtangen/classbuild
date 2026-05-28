import type { CurriculumMap, Syllabus, BloomLevel, AlignmentLevel } from '../types/course';
import { getTheme, FONTS_URL } from '../themes';

/**
 * Render the learning-outcomes table as themed HTML, CSV, and as a
 * standalone HTML document. Three flavours:
 *
 *   - buildOutcomesTableFragment — table + minimal scoped styles. Used by the
 *     Export page iframe preview and embedded inside the publish viewer.
 *   - buildOutcomesPage — full <!doctype>…</html> document, themed, with the
 *     same fonts and palette as the publish viewer. The downloadable HTML.
 *   - buildOutcomesCsv — single string, header row + one row per objective.
 *
 * The matrix is objectives × chapters: rows are learning objectives (with a
 * Bloom-level pill), columns are chapters as Roman numerals, cells show
 * Introduced / Developed / Mastered when the objective aligns to that chapter.
 */

const ROMAN_UPPER = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

/** Stable colour set for the six Bloom levels. Theme-independent. */
const BLOOM_PALETTE: Record<BloomLevel, { bg: string; fg: string; label: string }> = {
  remember:   { bg: '#dde7f6', fg: '#1e3a6b', label: 'remember' },
  understand: { bg: '#d8eae3', fg: '#1f4a3a', label: 'understand' },
  apply:      { bg: '#e2ecd1', fg: '#3d5418', label: 'apply' },
  analyze:    { bg: '#f3e6c9', fg: '#5c3f10', label: 'analyze' },
  evaluate:   { bg: '#f1d9c4', fg: '#6b3010', label: 'evaluate' },
  create:     { bg: '#e8d4e0', fg: '#5a1d4a', label: 'create' },
};

function alignmentLabel(level: AlignmentLevel): string {
  return level === 'introduced' ? 'I' : level === 'developed' ? 'D' : 'M';
}

function alignmentTitle(level: AlignmentLevel): string {
  return level === 'introduced' ? 'Introduced' : level === 'developed' ? 'Developed' : 'Mastered';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hexToRgbCsv(hex: string): string {
  const v = hex.replace('#', '');
  const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

function contrastTextOn(hex: string): string {
  const v = hex.replace('#', '');
  const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const channel = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratioWhite = (1 + 0.05) / (L + 0.05);
  const ratioDark = (L + 0.05) / (0.0103 + 0.05);
  return ratioDark >= ratioWhite ? '#1a1a1a' : '#ffffff';
}

/**
 * Returns the table HTML plus a scoped `<style>` block. Self-contained — drop
 * inside an iframe srcdoc, the publish viewer body, or a full page wrapper.
 */
export function buildOutcomesTableFragment(
  map: CurriculumMap,
  syllabus: Syllabus,
  themeId?: string,
): string {
  const t = getTheme(themeId);
  const accentRgb = hexToRgbCsv(t.accent);
  const textRgb = hexToRgbCsv(t.textPrimary);
  const onAccent = contrastTextOn(t.accent);

  const chapters = [...syllabus.chapters].sort((a, b) => a.number - b.number);
  const objectives = [...map.objectives].sort((a, b) => a.id - b.id);

  const headerCells = chapters
    .map((ch, i) => {
      const roman = ROMAN_UPPER[i] ?? String(i + 1);
      const safeTitle = escapeHtml(ch.title);
      return `<th class="lo-ch-head" title="Chapter ${ch.number} — ${safeTitle}"><span class="lo-ch-rom">${roman}</span><span class="lo-ch-title">${safeTitle}</span></th>`;
    })
    .join('');

  const bodyRows = objectives
    .map((obj) => {
      const bloom = BLOOM_PALETTE[obj.bloomLevel];
      const pill = `<span class="lo-bloom" style="background:${bloom.bg};color:${bloom.fg};">${bloom.label}</span>`;
      const cells = chapters
        .map((ch) => {
          const level = obj.alignments[ch.number];
          if (!level) return '<td class="lo-cell lo-cell-empty"><span aria-hidden="true">·</span></td>';
          const label = alignmentLabel(level);
          const title = alignmentTitle(level);
          return `<td class="lo-cell"><span class="lo-mark lo-mark-${level}" title="${title}">${label}</span></td>`;
        })
        .join('');
      return `<tr><td class="lo-obj"><div class="lo-obj-text">${escapeHtml(obj.text)}</div>${pill}</td>${cells}</tr>`;
    })
    .join('');

  return `<style>
.lo-wrap {
  --lo-accent: ${t.accent};
  --lo-accent-rgb: ${accentRgb};
  --lo-text-rgb: ${textRgb};
  --lo-bg: ${t.pageBg};
  --lo-card: ${t.cardBg};
  --lo-text: ${t.textPrimary};
  --lo-text-muted: ${t.textMuted};
  --lo-on-accent: ${onAccent};
  --lo-rule: rgba(var(--lo-text-rgb), ${t.isDark ? '0.12' : '0.09'});
  --lo-rule-soft: rgba(var(--lo-text-rgb), ${t.isDark ? '0.07' : '0.05'});
  background: var(--lo-bg);
  color: var(--lo-text);
  padding: 2.5rem 2.75rem;
  font-family: ${t.bodyFont}, system-ui, sans-serif;
  font-size: 14.5px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.lo-wrap * { box-sizing: border-box; }
.lo-eyebrow {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lo-accent);
  font-weight: 600;
  margin-bottom: 0.65rem;
}
.lo-title {
  font-family: ${t.headingFont}, Georgia, serif;
  font-size: 1.85rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.18;
  margin: 0 0 0.65rem;
  max-width: 36ch;
}
.lo-subtitle {
  font-size: 0.95rem;
  color: var(--lo-text-muted);
  margin: 0 0 2rem;
  max-width: 64ch;
  line-height: 1.55;
}
.lo-table-wrap {
  border: 1px solid var(--lo-rule);
  border-radius: 4px;
  background: var(--lo-card);
  overflow-x: auto;
  margin-bottom: 1.75rem;
}
.lo-table {
  width: 100%;
  border-collapse: collapse;
  font-feature-settings: 'tnum' 1;
}
.lo-table th, .lo-table td {
  text-align: left;
  vertical-align: top;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--lo-rule-soft);
}
.lo-table tr:last-child td { border-bottom: none; }
.lo-table thead th {
  background: rgba(var(--lo-text-rgb), ${t.isDark ? '0.04' : '0.025'});
  border-bottom: 1px solid var(--lo-rule);
  font-weight: 600;
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--lo-text-muted);
  position: sticky;
  top: 0;
}
.lo-th-obj {
  width: 38%;
  min-width: 280px;
}
.lo-ch-head {
  text-align: center !important;
  min-width: 54px;
  padding: 0.6rem 0.4rem !important;
}
.lo-ch-rom {
  display: block;
  font-family: ${t.headingFont}, Georgia, serif;
  font-style: italic;
  font-size: 1.15rem;
  color: var(--lo-accent);
  letter-spacing: 0;
  text-transform: none;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 4px;
}
.lo-ch-title {
  display: block;
  font-size: 9.5px;
  letter-spacing: 0.02em;
  color: var(--lo-text-muted);
  font-weight: 400;
  text-transform: none;
  line-height: 1.3;
  max-width: 90px;
  margin: 0 auto;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.lo-obj {
  width: 38%;
  min-width: 280px;
}
.lo-obj-text {
  font-family: ${t.bodyFont}, system-ui, sans-serif;
  font-size: 14.5px;
  color: var(--lo-text);
  line-height: 1.5;
  margin-bottom: 0.45rem;
}
.lo-bloom {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 3px;
  line-height: 1.5;
}
.lo-cell {
  text-align: center;
  min-width: 54px;
}
.lo-cell-empty {
  color: rgba(var(--lo-text-rgb), 0.18);
  font-size: 14px;
}
.lo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0;
  font-family: ${t.bodyFont}, system-ui, sans-serif;
}
.lo-mark-introduced {
  background: rgba(var(--lo-accent-rgb), 0.18);
  color: var(--lo-accent);
}
.lo-mark-developed {
  background: rgba(var(--lo-accent-rgb), 0.45);
  color: var(--lo-on-accent);
}
.lo-mark-mastered {
  background: var(--lo-accent);
  color: var(--lo-on-accent);
}
.lo-legend {
  display: flex;
  gap: 1.75rem;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--lo-text-muted);
  padding: 0.85rem 1rem;
  border: 1px solid var(--lo-rule);
  background: var(--lo-card);
  border-radius: 4px;
}
.lo-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}
.lo-legend-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 10.5px;
  font-weight: 700;
}
.lo-foot {
  margin-top: 1.5rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--lo-rule-soft);
  font-size: 12px;
  color: var(--lo-text-muted);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  letter-spacing: 0.04em;
}
@media (max-width: 720px) {
  .lo-wrap { padding: 1.5rem 1rem; }
  .lo-title { font-size: 1.5rem; }
}
</style>
<div class="lo-wrap">
  <div class="lo-eyebrow">Learning outcomes</div>
  <h1 class="lo-title">${escapeHtml(syllabus.courseTitle)}</h1>
  <p class="lo-subtitle">${objectives.length} measurable learning objectives mapped across ${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'} — Introduced, Developed, and Mastered.</p>

  <div class="lo-table-wrap">
    <table class="lo-table">
      <thead>
        <tr>
          <th class="lo-th-obj">Learning objective</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>

  <div class="lo-legend">
    <span class="lo-legend-item"><span class="lo-legend-mark lo-mark-introduced">I</span>Introduced</span>
    <span class="lo-legend-item"><span class="lo-legend-mark lo-mark-developed">D</span>Developed</span>
    <span class="lo-legend-item"><span class="lo-legend-mark lo-mark-mastered">M</span>Mastered</span>
  </div>

  <div class="lo-foot">
    <span>${objectives.length} objectives</span>
    <span>${chapters.length} chapters</span>
    <span>Generated ${formatDate(map.generatedAt)}</span>
  </div>
</div>`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

/** Full standalone HTML document — themed, font-loaded, ready to download. */
export function buildOutcomesPage(
  map: CurriculumMap,
  syllabus: Syllabus,
  themeId?: string,
): string {
  const fragment = buildOutcomesTableFragment(map, syllabus, themeId);
  const t = getTheme(themeId);
  const title = `${syllabus.courseTitle} — Learning Outcomes`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS_URL}">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: ${t.pageBg}; }
  </style>
</head>
<body>
${fragment}
</body>
</html>`;
}

/** CSV: header row + one row per objective. Wide format (chapters as columns). */
export function buildOutcomesCsv(map: CurriculumMap, syllabus: Syllabus): string {
  const chapters = [...syllabus.chapters].sort((a, b) => a.number - b.number);
  const objectives = [...map.objectives].sort((a, b) => a.id - b.id);
  const header = ['Bloom Level', 'Learning Objective', ...chapters.map((ch) => `Ch ${ch.number}: ${ch.title}`)];
  const rows = objectives.map((obj) => {
    const cells = chapters.map((ch) => {
      const level = obj.alignments[ch.number];
      return level ? alignmentLabel(level) : '';
    });
    return [obj.bloomLevel, obj.text, ...cells];
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function csvEscape(s: string): string {
  if (s == null) return '';
  const needsQuoting = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

/**
 * Deterministic short hash of the syllabus fields that affect the learning
 * outcomes prompt. Used for staleness detection: if the hash at render time
 * differs from the hash stored on `curriculumMap.syllabusHash`, the map was
 * built against an older syllabus and the user should regenerate.
 *
 * Includes course title, overview, and each chapter's title + key concepts +
 * narrative — the exact inputs the prompt sees.
 */
export function hashSyllabus(syllabus: Syllabus): string {
  const parts: string[] = [];
  parts.push(syllabus.courseTitle.trim());
  parts.push(syllabus.courseOverview.trim());
  for (const ch of [...syllabus.chapters].sort((a, b) => a.number - b.number)) {
    parts.push(`${ch.number}|${ch.title.trim()}|${(ch.keyConcepts ?? []).join(',')}|${ch.narrative.trim()}`);
  }
  const input = parts.join('');
  // FNV-1a 32-bit — fast, no crypto dependency, plenty for change detection.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
