import type { Syllabus, GeneratedChapter, CurriculumMap } from '../types/course';
import { getTheme, renderChapterHtml, FONTS_URL } from '../themes';
import { buildOutcomesTableFragment } from './outcomesTableTemplate';

interface ChapterWithQuiz extends GeneratedChapter {
  quizHtml?: string;
  challengeHtml?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Hex → "r, g, b" for use inside `rgba(var(--accent-rgb), 0.XX)`. */
function hexToRgbCsv(hex: string): string {
  const v = hex.replace('#', '');
  const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/** Pick #fff or #1a1a1a as readable text over a given hex background (WCAG-ish). */
function contrastTextOn(hex: string): string {
  const v = hex.replace('#', '');
  const s = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  // Relative luminance per WCAG 2.1
  const channel = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  // Contrast ratio against pure white (L=1) and near-black (L≈0.0103).
  const ratioWhite = (1 + 0.05) / (L + 0.05);
  const ratioDark = (L + 0.05) / (0.0103 + 0.05);
  return ratioDark >= ratioWhite ? '#1a1a1a' : '#ffffff';
}

function escapeSrcdoc(html: string): string {
  // For srcdoc attribute: escape quotes and ampersands
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Injected into every sandboxed iframe payload so the parent can size it via
// postMessage. Required because the iframes drop `allow-same-origin`, which
// means the parent can no longer touch `contentDocument` directly.
const RESIZE_SHIM = '<script>(function(){function p(){try{parent.postMessage({__cbResize:1,h:document.documentElement.scrollHeight},"*")}catch(e){}}window.addEventListener("load",p);if(window.ResizeObserver){try{new ResizeObserver(p).observe(document.documentElement)}catch(e){}}})();</script>';

function withResizeShim(html: string): string {
  return html + RESIZE_SHIM;
}

/**
 * Builds a complete, self-contained HTML course viewer.
 * Renders each class reading in an iframe (srcdoc) for CSS/JS isolation.
 * Includes: readings, practice quizzes, discussion questions, infographics.
 */
export function buildCourseViewerHtml(
  syllabus: Syllabus,
  chapters: ChapterWithQuiz[],
  themeId?: string,
  curriculumMap?: CurriculumMap | null,
): string {
  const t = getTheme(themeId);
  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  const sidebarItems = sortedChapters.map((ch) => {
    return `<button class="nav-item" data-chapter="${ch.number}" onclick="showChapter(${ch.number})">${escapeHtml(`Class ${ch.number}: ${ch.title}`)}</button>`;
  }).join('\n          ');

  // Course-level "Learning outcomes" nav item — sits above the chapter list when present.
  const hasOutcomes = !!curriculumMap && curriculumMap.objectives.length > 0;
  const outcomesNav = hasOutcomes
    ? `<button class="nav-item nav-item-course" data-course-view="outcomes" onclick="showCourseView('outcomes')">Learning outcomes</button>`
    : '';
  const outcomesPanel = hasOutcomes
    ? `<div class="course-panel" data-course-view="outcomes" style="display:none">${buildOutcomesTableFragment(curriculumMap, syllabus, themeId)}</div>`
    : '';

  const chapterSections = sortedChapters.map((ch) => {
    const syllCh = syllabus.chapters.find(sc => sc.number === ch.number);
    const sections: string[] = [];

    // Sub-tabs for this chapter
    const subTabs: string[] = ['<button class="sub-tab active" data-subtab="reading" onclick="showSubTab(this, \'reading\')">Reading</button>'];
    if (ch.quizHtml) {
      subTabs.push('<button class="sub-tab" data-subtab="quiz" onclick="showSubTab(this, \'quiz\')">Practice Quiz</button>');
    }
    if (ch.discussionData && ch.discussionData.length > 0) {
      subTabs.push('<button class="sub-tab" data-subtab="discussion" onclick="showSubTab(this, \'discussion\')">Discussion</button>');
    }
    if (ch.challengeHtml) {
      subTabs.push('<button class="sub-tab" data-subtab="challenge" onclick="showSubTab(this, \'challenge\')">Weekly Challenge</button>');
    }

    // Reading iframe — wrap the stored fragment in the chosen theme.
    const readingHtml = renderChapterHtml(ch.htmlContent, themeId, ch.title);
    sections.push(`
        <div class="sub-content active" data-subcontent="reading">
          <iframe class="reading-frame" srcdoc="${escapeSrcdoc(withResizeShim(readingHtml))}" sandbox="allow-scripts"></iframe>
        </div>`);

    // Practice quiz iframe
    if (ch.quizHtml) {
      sections.push(`
        <div class="sub-content" data-subcontent="quiz">
          <iframe class="quiz-frame" srcdoc="${escapeSrcdoc(withResizeShim(ch.quizHtml))}" sandbox="allow-scripts"></iframe>
        </div>`);
    }

    // Weekly challenge iframe
    if (ch.challengeHtml) {
      sections.push(`
        <div class="sub-content" data-subcontent="challenge">
          <iframe class="quiz-frame" srcdoc="${escapeSrcdoc(withResizeShim(ch.challengeHtml))}" sandbox="allow-scripts"></iframe>
        </div>`);
    }

    // Discussion questions
    if (ch.discussionData && ch.discussionData.length > 0) {
      const items = ch.discussionData.map((d, i) =>
        `<div class="discussion-card">
            <div class="discussion-num">${i + 1}</div>
            <div>
              <p class="discussion-prompt">${escapeHtml(d.prompt)}</p>
              <p class="discussion-hook">${escapeHtml(d.hook)}</p>
            </div>
          </div>`
      ).join('\n          ');
      sections.push(`
        <div class="sub-content" data-subcontent="discussion">
          <div class="discussion-list">${items}</div>
        </div>`);
    }

    return `
      <div class="chapter-panel" data-chapter="${ch.number}" style="display:none">
        <div class="chapter-header">
          <span class="chapter-label">Class ${ch.number}</span>
          <h2 class="chapter-title">${escapeHtml(ch.title)}</h2>
          ${syllCh ? `<p class="chapter-desc">${escapeHtml(syllCh.narrative)}</p>` : ''}
        </div>
        ${subTabs.length > 1 ? `<div class="sub-tabs">${subTabs.join('')}</div>` : ''}
        ${sections.join('')}
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(syllabus.courseTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${FONTS_URL}">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: ${t.pageBg};
      --card: ${t.cardBg};
      --elevated: ${t.elevated};
      --accent: ${t.accent};
      --accent-rgb: ${hexToRgbCsv(t.accent)};
      --accent-light: ${t.accentLight};
      --text: ${t.textPrimary};
      --text-rgb: ${hexToRgbCsv(t.textPrimary)};
      --text-sec: ${t.textSecondary};
      --text-muted: ${t.textMuted};
      --success: ${t.success};
      --on-accent: ${contrastTextOn(t.accent)};
      --font-display: ${t.headingFont}, Georgia, serif;
      --font-body: ${t.bodyFont}, system-ui, sans-serif;
      --rule: rgba(var(--text-rgb), ${t.isDark ? '0.10' : '0.08'});
      --rule-strong: rgba(var(--text-rgb), ${t.isDark ? '0.16' : '0.12'});
      --hover-tint: rgba(var(--text-rgb), ${t.isDark ? '0.06' : '0.04'});
      --active-tint: rgba(var(--accent-rgb), ${t.isDark ? '0.14' : '0.10'});
    }

    html { background: var(--bg); }
    body {
      font-family: var(--font-body);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* ── Sidebar ─────────────────────────────────────────────────────── */
    .sidebar {
      width: 296px;
      min-height: 100vh;
      background: var(--card);
      border-right: 1px solid var(--rule);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      overflow-y: auto;
      z-index: 10;
    }

    .sidebar-header {
      padding: 1.75rem 1.5rem 1.5rem;
      border-bottom: 1px solid var(--rule);
    }

    .sidebar-eyebrow {
      font-family: var(--font-body);
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 0.6rem;
      display: block;
    }

    .sidebar-header h1 {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.25;
      letter-spacing: -0.005em;
    }

    .sidebar-header p {
      font-family: var(--font-body);
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 0.65rem;
      line-height: 1.55;
    }

    .nav-list {
      flex: 1;
      padding: 0.65rem 0.5rem;
    }

    .nav-list-label {
      font-family: var(--font-body);
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--text-muted);
      padding: 0.25rem 0.85rem 0.5rem;
      font-weight: 600;
    }

    .nav-item {
      position: relative;
      display: block;
      width: 100%;
      padding: 0.65rem 0.85rem 0.65rem 1rem;
      text-align: left;
      background: none;
      border: none;
      border-radius: 6px;
      color: var(--text-sec);
      font-size: 0.86rem;
      line-height: 1.4;
      font-family: var(--font-body);
      font-weight: 400;
      cursor: pointer;
      transition: background-color 0.18s ease, color 0.18s ease;
      margin-bottom: 1px;
    }

    .nav-item:hover {
      background: var(--hover-tint);
      color: var(--text);
    }

    .nav-item.active {
      background: var(--active-tint);
      color: var(--text);
      font-weight: 600;
    }

    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
    }

    /* Course-level nav items (Learning outcomes, etc.) — distinguished from
       chapter list by a leading bullet glyph. */
    .nav-item-course {
      font-weight: 500;
    }
    .nav-item-course::after {
      content: '§';
      position: absolute;
      right: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--accent);
      font-family: var(--font-display);
      font-style: italic;
      font-size: 0.9rem;
      opacity: 0.7;
    }
    .nav-list-divider {
      height: 1px;
      background: var(--rule);
      margin: 0.6rem 0.85rem 0.45rem;
    }

    /* Course-level content panels (outcomes table, etc.) */
    .course-panel {
      padding: 0;
    }

    .sidebar-footer {
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid var(--rule);
      font-size: 0.7rem;
      color: var(--text-muted);
      text-align: center;
      letter-spacing: 0.02em;
    }

    .sidebar-footer a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .sidebar-footer a:hover { text-decoration: underline; }

    /* ── Main content ────────────────────────────────────────────────── */
    .main {
      flex: 1;
      margin-left: 296px;
      min-height: 100vh;
    }

    .chapter-panel { padding: 0; }

    .chapter-header {
      padding: 2.25rem 2.75rem 1.75rem;
      border-bottom: 1px solid var(--rule);
      max-width: 1100px;
    }

    .chapter-label {
      display: inline-block;
      font-family: var(--font-body);
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: var(--accent);
      margin-bottom: 0.65rem;
    }

    .chapter-title {
      font-family: var(--font-display);
      font-size: 2rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.18;
      letter-spacing: -0.01em;
    }

    .chapter-desc {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text-sec);
      margin-top: 0.85rem;
      line-height: 1.55;
      max-width: 64ch;
    }

    /* ── Sub-tabs ────────────────────────────────────────────────────── */
    .sub-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.85rem 2.75rem;
      border-bottom: 1px solid var(--rule);
      background: var(--card);
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .sub-tab {
      padding: 0.5rem 0.95rem;
      font-size: 0.82rem;
      font-family: var(--font-body);
      font-weight: 500;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background-color 0.18s ease, color 0.18s ease;
      background: none;
      color: var(--text-muted);
    }

    .sub-tab:hover {
      color: var(--text);
      background: var(--hover-tint);
    }

    .sub-tab.active {
      background: var(--accent);
      color: var(--on-accent);
    }

    .sub-content { display: none; }
    .sub-content.active { display: block; }

    /* ── Iframes ─────────────────────────────────────────────────────── */
    .reading-frame, .quiz-frame {
      width: 100%;
      border: none;
      min-height: 80vh;
      display: block;
      background: var(--bg);
    }

    /* ── Discussion ──────────────────────────────────────────────────── */
    .discussion-list {
      padding: 2.25rem 2.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-width: 880px;
    }

    .discussion-card {
      display: flex;
      gap: 1.1rem;
      padding: 1.35rem 1.4rem;
      background: var(--card);
      border-radius: 8px;
      border: 1px solid var(--rule-strong);
    }

    .discussion-num {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: var(--active-tint);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-body);
      font-size: 0.82rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .discussion-prompt {
      font-family: var(--font-body);
      font-size: 0.97rem;
      color: var(--text);
      line-height: 1.55;
      font-weight: 500;
    }

    .discussion-hook {
      font-family: var(--font-body);
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 0.55rem;
      line-height: 1.5;
      font-style: italic;
    }

    /* ── Welcome screen ──────────────────────────────────────────────── */
    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 2rem;
    }

    .welcome-eyebrow {
      font-family: var(--font-body);
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.5rem;
      font-weight: 600;
    }

    .welcome h2 {
      font-family: var(--font-display);
      font-size: 2.4rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 1rem;
      max-width: 22ch;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }

    .welcome p {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text-sec);
      max-width: 44ch;
      line-height: 1.6;
    }

    .welcome-rule {
      width: 48px;
      height: 1px;
      background: var(--accent);
      margin: 1.75rem 0 0;
    }

    /* ── Mobile ──────────────────────────────────────────────────────── */
    .menu-toggle {
      display: none;
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 20;
      background: var(--card);
      border: 1px solid var(--rule-strong);
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      color: var(--text);
      font-size: 1.2rem;
      cursor: pointer;
    }

    @media (max-width: 900px) {
      .menu-toggle { display: block; }
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 0 0 24px rgba(0,0,0,0.18);
      }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .chapter-header { padding: 4rem 1.5rem 1.5rem; }
      .sub-tabs { padding: 0.75rem 1.5rem; overflow-x: auto; }
      .discussion-list { padding: 1.5rem; }
    }
  </style>
</head>
<body>
  <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">&#9776;</button>

  <nav class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-eyebrow">Course</span>
      <h1>${escapeHtml(syllabus.courseTitle)}</h1>
      <p>${escapeHtml(syllabus.courseOverview.slice(0, 150))}${syllabus.courseOverview.length > 150 ? '...' : ''}</p>
    </div>
    <div class="nav-list">
      ${hasOutcomes ? `<div class="nav-list-label">Course</div>${outcomesNav}<div class="nav-list-divider"></div>` : ''}
      <div class="nav-list-label">Classes</div>
      ${sidebarItems}
    </div>
    <div class="sidebar-footer">
      Built with <a href="https://classbuild.app" target="_blank" rel="noopener">ClassBuild</a>
    </div>
  </nav>

  <main class="main">
    <div class="welcome" id="welcome">
      <span class="welcome-eyebrow">${syllabus.chapters.length} ${syllabus.chapters.length === 1 ? 'class' : 'classes'}</span>
      <h2>${escapeHtml(syllabus.courseTitle)}</h2>
      <p>${escapeHtml(syllabus.courseOverview.slice(0, 220))}${syllabus.courseOverview.length > 220 ? '…' : ''}</p>
      <div class="welcome-rule"></div>
    </div>
    ${outcomesPanel}
    ${chapterSections}
  </main>

  <script>
    // Sandboxed iframes post their scrollHeight here; the parent has no
    // same-origin access into them and must rely on this message channel.
    window.addEventListener('message', function(e) {
      if (!e || !e.data || !e.data.__cbResize) return;
      var iframes = document.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        if (iframes[i].contentWindow === e.source) {
          iframes[i].style.height = Math.max(e.data.h, 400) + 'px';
          return;
        }
      }
    });

    function showChapter(num) {
      // Hide welcome
      var welcome = document.getElementById('welcome');
      if (welcome) welcome.style.display = 'none';

      // Hide all chapters + course-level panels
      document.querySelectorAll('.chapter-panel, .course-panel').forEach(function(el) {
        el.style.display = 'none';
      });
      var target = document.querySelector('.chapter-panel[data-chapter="' + num + '"]');
      if (target) target.style.display = 'block';

      // Update nav active state — match the chapter button, clear course-view buttons
      document.querySelectorAll('.nav-item').forEach(function(el) {
        var isMatch = el.getAttribute('data-chapter') == num;
        el.classList.toggle('active', isMatch);
      });

      // Close mobile menu
      document.querySelector('.sidebar').classList.remove('open');

      // Reset sub-tabs to first tab
      var tabs = target && target.querySelectorAll('.sub-tab');
      var contents = target && target.querySelectorAll('.sub-content');
      if (tabs && tabs.length > 0) {
        tabs.forEach(function(t) { t.classList.remove('active'); });
        contents.forEach(function(c) { c.classList.remove('active'); });
        tabs[0].classList.add('active');
        contents[0].classList.add('active');
      }
    }

    function showSubTab(btn, tabName) {
      var panel = btn.closest('.chapter-panel');
      panel.querySelectorAll('.sub-tab').forEach(function(t) { t.classList.remove('active'); });
      panel.querySelectorAll('.sub-content').forEach(function(c) { c.classList.remove('active'); });
      btn.classList.add('active');
      var target = panel.querySelector('.sub-content[data-subcontent="' + tabName + '"]');
      if (target) target.classList.add('active');
    }

    function showCourseView(view) {
      var welcome = document.getElementById('welcome');
      if (welcome) welcome.style.display = 'none';
      document.querySelectorAll('.chapter-panel, .course-panel').forEach(function(el) {
        el.style.display = 'none';
      });
      var target = document.querySelector('.course-panel[data-course-view="' + view + '"]');
      if (target) target.style.display = 'block';
      document.querySelectorAll('.nav-item').forEach(function(el) {
        var isMatch = el.getAttribute('data-course-view') === view;
        el.classList.toggle('active', isMatch);
      });
      document.querySelector('.sidebar').classList.remove('open');
    }

    // Auto-show first chapter if only one
    ${sortedChapters.length === 1 ? `showChapter(${sortedChapters[0].number});` : ''}
  </script>
</body>
</html>`;
}
