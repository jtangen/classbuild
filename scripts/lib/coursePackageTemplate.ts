/**
 * Course Package HTML template for static-site publish.
 *
 * Generates a single index.html that references external chapter/quiz HTML
 * via iframe src (not srcdoc), embeds structured data (discussion, activities,
 * slides, in-class quiz, research) as inline JSON, and links to binary assets
 * (audio, images, downloads) via relative paths.
 */

import type {
  Syllabus,
  ResearchDossier,
  InClassQuizQuestion,
  SlideData,
} from '../../src/types/course';
import { getTheme } from '../../src/themes';

export interface ChapterPackageData {
  number: number;
  title: string;
  narrative: string;
  chapterHtmlPath?: string;    // relative: chapters/01.html
  quizHtmlPath?: string;       // relative: quizzes/01.html
  audioPath?: string;          // relative: audio/01.mp3
  infographicPath?: string;    // relative: img/01.ext
  discussion?: Array<{ prompt: string; hook: string }>;
  activities?: Array<{ title: string; duration: string; description: string; materials: string; learningGoal: string; scalingNotes: string }>;
  slides?: SlideData[];
  inClassQuiz?: InClassQuizQuestion[];
  transcript?: string;
  research?: ResearchDossier;
  downloadLinks: Array<{ label: string; path: string }>;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCoursePackageHtml(
  syllabus: Syllabus,
  chapters: ChapterPackageData[],
  themeId?: string,
): string {
  const t = getTheme(themeId);
  const sorted = [...chapters].sort((a, b) => a.number - b.number);

  // Build COURSE_DATA JSON for embedding
  const courseData = {
    title: syllabus.courseTitle,
    overview: syllabus.courseOverview,
    chapters: sorted.map(ch => ({
      number: ch.number,
      title: ch.title,
      narrative: ch.narrative,
      chapterHtmlPath: ch.chapterHtmlPath || null,
      quizHtmlPath: ch.quizHtmlPath || null,
      audioPath: ch.audioPath || null,
      infographicPath: ch.infographicPath || null,
      discussion: ch.discussion || null,
      activities: ch.activities || null,
      slides: ch.slides || null,
      inClassQuiz: ch.inClassQuiz || null,
      transcript: ch.transcript || null,
      research: ch.research || null,
      downloadLinks: ch.downloadLinks,
    })),
  };

  const courseDataJson = JSON.stringify(courseData);

  // Stats
  const totalSources = sorted.reduce((sum, ch) => sum + (ch.research?.sources.length || 0), 0);
  const materialsCount = sorted.reduce((sum, ch) => {
    let n = 0;
    if (ch.chapterHtmlPath) n++;
    if (ch.quizHtmlPath) n++;
    if (ch.discussion) n++;
    if (ch.activities) n++;
    if (ch.slides) n++;
    if (ch.audioPath) n++;
    if (ch.infographicPath) n++;
    if (ch.inClassQuiz) n++;
    if (ch.research) n++;
    return sum + n;
  }, 0);

  // Sidebar nav items — now with chapter numbers
  const sidebarItems = sorted.map(ch =>
    `<button class="nav-item" data-chapter="${ch.number}" onclick="showChapter(${ch.number})"><span class="nav-num">${ch.number}</span><span class="nav-label">${escapeHtml(ch.title)}</span></button>`
  ).join('\n          ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(syllabus.courseTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: ${t.pageBg};
      --card: ${t.cardBg};
      --elevated: ${t.elevated};
      --accent: ${t.accent};
      --accent-light: ${t.accentLight};
      --warm: ${t.warmAccent};
      --text: ${t.textPrimary};
      --text-sec: ${t.textSecondary};
      --text-muted: ${t.textMuted};
      --success: ${t.success};
      --font: 'Inter', ${t.headingFont};
      --body-font: 'Inter', ${t.bodyFont};
      --border: ${t.isDark ? 'rgba(6,182,212,0.08)' : 'rgba(0,0,0,0.08)'};
      --border-strong: ${t.isDark ? 'rgba(6,182,212,0.18)' : 'rgba(0,0,0,0.12)'};
      --hover: ${t.isDark ? 'rgba(6,182,212,0.06)' : 'rgba(0,0,0,0.04)'};
      --active-bg: ${t.isDark ? 'rgba(6,182,212,0.12)' : 'rgba(30,58,95,0.1)'};
      --glow: ${t.isDark ? '0 0 40px rgba(6,182,212,0.08)' : '0 2px 12px rgba(0,0,0,0.06)'};
      --card-shadow: ${t.isDark ? '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(6,182,212,0.06)' : '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)'};
      --card-hover-shadow: ${t.isDark ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(6,182,212,0.12)' : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)'};
      --sidebar-w: 300px;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ── Sidebar ─────────────────────────── */
    .sidebar {
      width: var(--sidebar-w);
      min-height: 100vh;
      background: ${t.isDark ? 'linear-gradient(180deg, rgba(19,35,55,0.97) 0%, rgba(12,25,41,0.99) 100%)' : 'var(--card)'};
      backdrop-filter: blur(20px);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      overflow-y: auto;
      z-index: 10;
    }

    .sidebar::-webkit-scrollbar { width: 4px; }
    .sidebar::-webkit-scrollbar-track { background: transparent; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }

    .sidebar-header {
      padding: 1.75rem 1.5rem 1.25rem;
      border-bottom: 1px solid var(--border);
    }

    .sidebar-header h1 {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
      letter-spacing: -0.01em;
    }

    .sidebar-header p {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.6rem;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .nav-list { flex: 1; padding: 0.75rem 0.6rem; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.65rem 0.85rem;
      text-align: left;
      background: none;
      border: none;
      border-radius: 10px;
      color: var(--text-sec);
      font-size: 0.8rem;
      font-family: var(--font);
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 2px;
      position: relative;
    }

    .nav-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 8px;
      background: var(--elevated);
      color: var(--text-muted);
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .nav-item:hover { background: var(--hover); color: var(--text); }
    .nav-item:hover .nav-num { background: var(--active-bg); color: var(--accent); }

    .nav-item.active {
      background: var(--active-bg);
      color: var(--accent);
      font-weight: 600;
    }
    .nav-item.active .nav-num {
      background: var(--accent);
      color: ${t.isDark ? '#0c1929' : 'white'};
    }

    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.68rem;
      color: var(--text-muted);
      text-align: center;
    }
    .sidebar-footer a { color: var(--accent); text-decoration: none; transition: color 0.15s; }
    .sidebar-footer a:hover { color: var(--accent-light); }

    /* ── Main ─────────────────────────────── */
    .main {
      flex: 1;
      margin-left: var(--sidebar-w);
      min-height: 100vh;
    }

    /* ── Welcome / Hero ───────────────────── */
    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 92vh;
      text-align: center;
      padding: 3rem 2rem;
      position: relative;
      overflow: hidden;
    }

    .welcome::before {
      content: '';
      position: absolute;
      top: -30%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, ${t.isDark ? 'rgba(6,182,212,0.06)' : 'rgba(6,182,212,0.04)'} 0%, transparent 70%);
      pointer-events: none;
    }

    .welcome-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 1rem;
      border-radius: 999px;
      background: var(--active-bg);
      border: 1px solid var(--border-strong);
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--accent);
      margin-bottom: 1.5rem;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      position: relative;
    }

    .welcome h2 {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 1rem;
      max-width: 680px;
      line-height: 1.15;
      letter-spacing: -0.025em;
      position: relative;
    }

    .welcome .overview {
      font-size: 0.95rem;
      font-family: var(--body-font);
      color: var(--text-sec);
      max-width: 580px;
      line-height: 1.7;
      margin-bottom: 2.5rem;
      position: relative;
    }

    .stats-grid {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      position: relative;
    }

    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem 2rem;
      text-align: center;
      min-width: 140px;
      box-shadow: var(--card-shadow);
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--card-hover-shadow);
    }

    .stat-num {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }

    .welcome-cta {
      margin-top: 2.5rem;
      position: relative;
    }

    .welcome-cta button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.75rem;
      border-radius: 12px;
      border: none;
      background: var(--accent);
      color: ${t.isDark ? '#0c1929' : 'white'};
      font-family: var(--font);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 16px ${t.isDark ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.3)'};
    }

    .welcome-cta button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px ${t.isDark ? 'rgba(6,182,212,0.35)' : 'rgba(6,182,212,0.4)'};
    }

    /* ── Chapter panel ───────────────────── */
    .chapter-panel { display: none; }

    .chapter-header {
      padding: 1.25rem 2.5rem 1rem;
      border-bottom: 1px solid var(--border);
      position: relative;
    }

    .chapter-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 2.5rem;
      width: 60px;
      height: 2px;
      background: var(--accent);
      border-radius: 1px;
    }

    .chapter-label {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }

    .chapter-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
      letter-spacing: -0.015em;
    }

    .chapter-desc {
      font-size: 0.82rem;
      font-family: var(--body-font);
      color: var(--text-sec);
      margin-top: 0.5rem;
      line-height: 1.55;
      max-width: 720px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .chapter-desc.expanded {
      display: block;
      -webkit-line-clamp: unset;
    }

    .desc-toggle {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 0.72rem;
      font-family: var(--font);
      font-weight: 600;
      cursor: pointer;
      padding: 0.2rem 0;
      margin-top: 0.2rem;
      opacity: 0.8;
      transition: opacity 0.15s;
    }

    .desc-toggle:hover { opacity: 1; }

    /* ── Tab bar ──────────────────────────── */
    .tab-bar {
      display: flex;
      gap: 0.2rem;
      padding: 0.6rem 2.5rem;
      border-bottom: 1px solid var(--border);
      background: ${t.isDark ? 'rgba(19,35,55,0.5)' : 'var(--card)'};
      backdrop-filter: blur(8px);
      flex-wrap: wrap;
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .tab-btn {
      padding: 0.5rem 1rem;
      font-size: 0.76rem;
      font-family: var(--font);
      font-weight: 500;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: none;
      color: var(--text-muted);
      white-space: nowrap;
      position: relative;
    }

    .tab-btn:hover { color: var(--text-sec); background: var(--hover); }

    .tab-btn.active {
      background: var(--accent);
      color: ${t.isDark ? '#0c1929' : 'white'};
      font-weight: 600;
      box-shadow: 0 2px 8px ${t.isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.25)'};
    }

    /* ── Tab content ──────────────────────── */
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* iframes */
    .content-frame {
      width: 100%;
      border: none;
      min-height: 80vh;
    }

    /* ── Cards (discussion, activities, slides, research, quiz) ── */
    .card-list {
      padding: 2rem 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 900px;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      box-shadow: var(--card-shadow);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .card:hover {
      transform: translateY(-1px);
      box-shadow: var(--card-hover-shadow);
    }

    .card-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.7rem;
      height: 1.7rem;
      border-radius: 8px;
      background: var(--active-bg);
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 700;
      margin-right: 0.75rem;
      flex-shrink: 0;
      vertical-align: middle;
    }

    .card h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
      display: inline;
      vertical-align: middle;
    }

    .card p, .card li {
      font-size: 0.86rem;
      font-family: var(--body-font);
      color: var(--text-sec);
      line-height: 1.65;
    }

    .card .meta {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    .card .meta span {
      display: inline-block;
      margin-right: 1rem;
    }

    .card .badge {
      display: inline-block;
      padding: 0.2rem 0.7rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 600;
      background: var(--active-bg);
      color: var(--accent);
      margin-right: 0.5rem;
    }

    .card ul {
      list-style: none;
      padding-left: 0;
      margin-top: 0.5rem;
    }

    .card ul li {
      position: relative;
      padding-left: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .card ul li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.55em;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent);
      opacity: 0.5;
    }

    .card .speaker-notes {
      margin-top: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--elevated);
      border-radius: 8px;
      border-left: 2px solid var(--accent);
      font-size: 0.8rem;
      font-style: italic;
      color: var(--text-muted);
      line-height: 1.6;
    }

    /* Correct answer highlight */
    .correct-answer {
      color: var(--success);
      font-weight: 600;
    }

    .distractor { color: var(--text-sec); }

    .feedback {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
      padding-left: 1.5rem;
      line-height: 1.45;
    }

    /* ── Audio player ────────────────────── */
    .audio-section {
      padding: 2rem 2.5rem;
      max-width: 900px;
    }

    .audio-player-wrap {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--card-shadow);
    }

    .audio-player-wrap audio {
      width: 100%;
      border-radius: 8px;
    }

    .transcript-text {
      font-family: var(--body-font);
      font-size: 0.86rem;
      color: var(--text-sec);
      line-height: 1.85;
      white-space: pre-wrap;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 1.5rem 2rem;
      box-shadow: var(--card-shadow);
    }

    .transcript-label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    /* ── Infographic ─────────────────────── */
    .infographic-section {
      padding: 2rem 2.5rem;
      text-align: center;
    }

    .infographic-section img {
      max-width: 100%;
      max-height: 80vh;
      border-radius: 14px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
    }

    .infographic-section img:hover { transform: scale(1.01); }

    /* ── Download pills ──────────────────── */
    .download-pills {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
      padding: 0.4rem 2.5rem 0.5rem;
    }

    .download-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 1rem;
      border-radius: 10px;
      background: var(--elevated);
      color: var(--accent);
      font-size: 0.72rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid var(--border);
    }

    .download-pill:hover {
      background: var(--active-bg);
      border-color: var(--accent);
      transform: translateY(-1px);
    }

    .download-pill::before { content: '\\2B07 '; }

    /* ── Research sources ────────────────── */
    .source-card {
      border-left: 3px solid var(--accent);
    }

    .source-card .doi {
      font-size: 0.73rem;
      color: var(--accent-light);
      word-break: break-all;
    }

    .source-card .doi a { color: var(--accent-light); text-decoration: none; }
    .source-card .doi a:hover { text-decoration: underline; }

    /* ── Mobile ───────────────────────────── */
    .menu-toggle {
      display: none;
      position: fixed;
      top: 0.75rem; left: 0.75rem;
      z-index: 20;
      background: var(--card);
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      padding: 0.55rem 0.75rem;
      color: var(--text);
      font-size: 1.1rem;
      cursor: pointer;
      box-shadow: var(--card-shadow);
      transition: all 0.2s ease;
    }

    .menu-toggle:hover { box-shadow: var(--card-hover-shadow); }

    .overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 9;
      backdrop-filter: blur(4px);
    }

    @media (max-width: 768px) {
      .menu-toggle { display: block; }
      .sidebar {
        width: 300px;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }
      .sidebar.open { transform: translateX(0); }
      .sidebar.open ~ .overlay { display: block; }
      .main { margin-left: 0; }
      .chapter-header, .tab-bar, .card-list, .audio-section, .infographic-section, .download-pills {
        padding-left: 1.25rem;
        padding-right: 1.25rem;
      }
      .welcome { padding: 2rem 1.25rem; }
      .welcome h2 { font-size: 1.6rem; }
      .stat-card { min-width: 100px; padding: 1rem 1.25rem; }
      .stat-num { font-size: 1.6rem; }
    }

    /* ── Fade-in animation ────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chapter-panel { animation: fadeUp 0.3s ease; }
    .welcome > * { animation: fadeUp 0.5s ease backwards; }
    .welcome > *:nth-child(1) { animation-delay: 0s; }
    .welcome > *:nth-child(2) { animation-delay: 0.05s; }
    .welcome > *:nth-child(3) { animation-delay: 0.1s; }
    .welcome > *:nth-child(4) { animation-delay: 0.15s; }
    .welcome > *:nth-child(5) { animation-delay: 0.2s; }
    .welcome > *:nth-child(6) { animation-delay: 0.25s; }
  </style>
</head>
<body>
  <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">&#9776;</button>
  <div class="overlay" onclick="document.querySelector('.sidebar').classList.remove('open')"></div>

  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>${escapeHtml(syllabus.courseTitle)}</h1>
      <p>${escapeHtml(syllabus.courseOverview)}</p>
    </div>
    <div class="nav-list">
      ${sidebarItems}
    </div>
    <div class="sidebar-footer">
      Built with <a href="https://github.com/jtangen/classbuild" target="_blank">ClassBuild</a>
    </div>
  </nav>

  <main class="main">
    <div class="welcome" id="welcome">
      <div class="welcome-badge">${sorted.length} Chapters &middot; ${totalSources} Sources</div>
      <h2>${escapeHtml(syllabus.courseTitle)}</h2>
      <p class="overview">${escapeHtml(syllabus.courseOverview.slice(0, 500))}${syllabus.courseOverview.length > 500 ? '...' : ''}</p>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-num">${sorted.length}</div>
          <div class="stat-label">Classes</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${totalSources}</div>
          <div class="stat-label">Sources</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">${materialsCount}</div>
          <div class="stat-label">Materials</div>
        </div>
      </div>
      <div class="welcome-cta">
        <button onclick="showChapter(1)">Start with Class 1 &rarr;</button>
      </div>
    </div>
    <div id="chapter-container"></div>
  </main>

  <script>
    var COURSE_DATA = ${courseDataJson};
  </script>
  <script>
    (function() {
      var container = document.getElementById('chapter-container');
      var data = COURSE_DATA;

      // Build chapter panels dynamically
      data.chapters.forEach(function(ch) {
        var panel = document.createElement('div');
        panel.className = 'chapter-panel';
        panel.setAttribute('data-chapter', ch.number);

        // Header — narrative truncated to 2 lines with toggle
        var header = '<div class="chapter-header">' +
          '<span class="chapter-label">Class ' + ch.number + '</span>' +
          '<h2 class="chapter-title">' + esc(ch.title) + '</h2>' +
          '<p class="chapter-desc" id="desc-' + ch.number + '">' + esc(ch.narrative) + '</p>' +
          '<button class="desc-toggle" onclick="toggleDesc(' + ch.number + ',this)">Show more</button>' +
          '</div>';

        // Determine available tabs
        var tabs = [];
        if (ch.chapterHtmlPath) tabs.push({ id: 'reading', label: 'Reading' });
        if (ch.quizHtmlPath) tabs.push({ id: 'quiz', label: 'Practice Quiz' });
        if (ch.discussion) tabs.push({ id: 'discussion', label: 'Discussion' });
        if (ch.activities) tabs.push({ id: 'activities', label: 'Activities' });
        if (ch.slides) tabs.push({ id: 'slides', label: 'Slides' });
        if (ch.audioPath) tabs.push({ id: 'audio', label: 'Audio' });
        if (ch.research && ch.research.sources && ch.research.sources.length > 0) tabs.push({ id: 'research', label: 'Research' });
        if (ch.infographicPath) tabs.push({ id: 'infographic', label: 'Infographic' });
        if (ch.inClassQuiz) tabs.push({ id: 'inclass', label: 'In-Class Quiz' });

        // Tab bar
        var tabBar = '';
        if (tabs.length > 1) {
          tabBar = '<div class="tab-bar">';
          tabs.forEach(function(tab, i) {
            tabBar += '<button class="tab-btn' + (i === 0 ? ' active' : '') + '" data-tab="' + tab.id + '" onclick="switchTab(this,\\'' + tab.id + '\\')">' + tab.label + '</button>';
          });
          tabBar += '</div>';
        }

        // Downloads
        var downloads = '';
        if (ch.downloadLinks && ch.downloadLinks.length > 0) {
          downloads = '<div class="download-pills">';
          ch.downloadLinks.forEach(function(dl) {
            downloads += '<a class="download-pill" href="' + dl.path + '" download>' + esc(dl.label) + '</a>';
          });
          downloads += '</div>';
        }

        // Tab contents
        var contents = '';

        // Reading
        if (ch.chapterHtmlPath) {
          contents += '<div class="tab-content' + (tabs[0] && tabs[0].id === 'reading' ? ' active' : '') + '" data-tab-content="reading">' +
            '<iframe class="content-frame" src="' + ch.chapterHtmlPath + '" sandbox="allow-scripts allow-same-origin" onload="autoResize(this)"></iframe></div>';
        }

        // Practice Quiz
        if (ch.quizHtmlPath) {
          contents += '<div class="tab-content' + (tabs[0] && tabs[0].id === 'quiz' ? ' active' : '') + '" data-tab-content="quiz">' +
            '<iframe class="content-frame" src="' + ch.quizHtmlPath + '" sandbox="allow-scripts allow-same-origin" onload="autoResize(this)"></iframe></div>';
        }

        // Discussion
        if (ch.discussion) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'discussion' ? ' active' : '') + '" data-tab-content="discussion"><div class="card-list">';
          ch.discussion.forEach(function(d, i) {
            html += '<div class="card"><span class="card-num">' + (i + 1) + '</span><h3>' + esc(d.hook) + '</h3><p style="margin-top:0.5rem">' + esc(d.prompt) + '</p></div>';
          });
          html += '</div></div>';
          contents += html;
        }

        // Activities
        if (ch.activities) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'activities' ? ' active' : '') + '" data-tab-content="activities"><div class="card-list">';
          ch.activities.forEach(function(a, i) {
            html += '<div class="card"><span class="card-num">' + (i + 1) + '</span><h3>' + esc(a.title) + '</h3>' +
              '<div class="meta"><span class="badge">' + esc(a.duration) + '</span></div>' +
              '<p style="margin-top:0.5rem">' + esc(a.description) + '</p>';
            if (a.materials) html += '<p class="meta"><strong>Materials:</strong> ' + esc(a.materials) + '</p>';
            if (a.learningGoal) html += '<p class="meta"><strong>Goal:</strong> ' + esc(a.learningGoal) + '</p>';
            if (a.scalingNotes) html += '<p class="meta"><strong>Scaling:</strong> ' + esc(a.scalingNotes) + '</p>';
            html += '</div>';
          });
          html += '</div></div>';
          contents += html;
        }

        // Slides
        if (ch.slides) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'slides' ? ' active' : '') + '" data-tab-content="slides"><div class="card-list">';
          ch.slides.forEach(function(s, i) {
            html += '<div class="card"><span class="card-num">' + (i + 1) + '</span><h3>' + esc(s.title) + '</h3>';
            if (s.layout) html += '<span class="badge">' + s.layout + '</span>';
            if (s.bodyText) html += '<p style="margin-top:0.5rem;font-weight:500">' + esc(s.bodyText) + '</p>';
            if (s.bullets && s.bullets.length > 0) {
              html += '<ul>';
              s.bullets.forEach(function(b) { html += '<li>' + esc(b) + '</li>'; });
              html += '</ul>';
            }
            if (s.speakerNotes) html += '<div class="speaker-notes">' + esc(s.speakerNotes) + '</div>';
            html += '</div>';
          });
          html += '</div></div>';
          contents += html;
        }

        // Audio
        if (ch.audioPath) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'audio' ? ' active' : '') + '" data-tab-content="audio"><div class="audio-section">' +
            '<div class="audio-player-wrap"><audio controls preload="none" src="' + ch.audioPath + '"></audio></div>';
          if (ch.transcript) {
            html += '<p class="transcript-label">Transcript</p>' +
              '<div class="transcript-text">' + esc(ch.transcript) + '</div>';
          }
          html += '</div></div>';
          contents += html;
        }

        // Research
        if (ch.research && ch.research.sources && ch.research.sources.length > 0) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'research' ? ' active' : '') + '" data-tab-content="research"><div class="card-list">';
          if (ch.research.synthesisNotes) {
            html += '<div class="card"><p>' + esc(ch.research.synthesisNotes) + '</p></div>';
          }
          ch.research.sources.forEach(function(s, i) {
            html += '<div class="card source-card"><span class="card-num">' + (i + 1) + '</span><h3>' + esc(s.title) + '</h3>' +
              '<p class="meta">' + esc(s.authors) + ' (' + esc(s.year) + ')</p>';
            if (s.doi) html += '<p class="doi"><a href="https://doi.org/' + esc(s.doi) + '" target="_blank" rel="noopener">DOI: ' + esc(s.doi) + '</a></p>';
            html += '<p style="margin-top:0.5rem">' + esc(s.summary) + '</p></div>';
          });
          html += '</div></div>';
          contents += html;
        }

        // Infographic
        if (ch.infographicPath) {
          contents += '<div class="tab-content' + (tabs[0] && tabs[0].id === 'infographic' ? ' active' : '') + '" data-tab-content="infographic">' +
            '<div class="infographic-section"><img src="' + ch.infographicPath + '" alt="Infographic for ' + esc(ch.title) + '" /></div></div>';
        }

        // In-Class Quiz
        if (ch.inClassQuiz) {
          var html = '<div class="tab-content' + (tabs[0] && tabs[0].id === 'inclass' ? ' active' : '') + '" data-tab-content="inclass"><div class="card-list">';
          ch.inClassQuiz.forEach(function(q, i) {
            html += '<div class="card"><span class="card-num">' + (i + 1) + '</span><h3>Question ' + (i + 1) + '</h3>' +
              '<p style="margin-top:0.5rem;font-weight:500">' + esc(q.question) + '</p>' +
              '<div style="margin-top:0.75rem">' +
              '<p class="correct-answer">&#10003; ' + esc(q.correctAnswer) + '</p>';
            if (q.correctFeedback) html += '<p class="feedback">' + esc(q.correctFeedback) + '</p>';
            q.distractors.forEach(function(d) {
              html += '<p class="distractor" style="margin-top:0.4rem">&#10007; ' + esc(d.text) + '</p>';
              if (d.feedback) html += '<p class="feedback">' + esc(d.feedback) + '</p>';
            });
            html += '</div></div>';
          });
          html += '</div></div>';
          contents += html;
        }

        panel.innerHTML = header + tabBar + downloads + contents;
        container.appendChild(panel);
      });

      // Escape helper
      function esc(s) {
        if (!s) return '';
        var el = document.createElement('span');
        el.textContent = s;
        return el.innerHTML;
      }

      // Description expand/collapse
      window.toggleDesc = function(num, btn) {
        var desc = document.getElementById('desc-' + num);
        if (desc.classList.contains('expanded')) {
          desc.classList.remove('expanded');
          btn.textContent = 'Show more';
        } else {
          desc.classList.add('expanded');
          btn.textContent = 'Show less';
        }
      };

      // Tab switching
      window.switchTab = function(btn, tabId) {
        var panel = btn.closest('.chapter-panel');
        panel.querySelectorAll('.tab-btn').forEach(function(t) { t.classList.remove('active'); });
        panel.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        btn.classList.add('active');
        var target = panel.querySelector('[data-tab-content="' + tabId + '"]');
        if (target) {
          target.classList.add('active');
          target.querySelectorAll('iframe').forEach(function(f) { autoResize(f); });
        }
      };

      // Show chapter
      window.showChapter = function(num) {
        document.getElementById('welcome').style.display = 'none';
        document.querySelectorAll('.chapter-panel').forEach(function(el) { el.style.display = 'none'; });
        var target = document.querySelector('.chapter-panel[data-chapter="' + num + '"]');
        if (target) target.style.display = 'block';

        document.querySelectorAll('.nav-item').forEach(function(el) {
          el.classList.toggle('active', el.getAttribute('data-chapter') == num);
        });

        document.querySelector('.sidebar').classList.remove('open');
        window.location.hash = 'chapter-' + num;
        window.scrollTo({ top: 0 });
      };

      // Iframe auto-resize
      window.autoResize = function(frame) {
        try {
          var h = frame.contentDocument.documentElement.scrollHeight;
          frame.style.height = Math.max(h + 20, 400) + 'px';
        } catch(e) {}
      };

      // Hash-based deep linking
      function checkHash() {
        var hash = window.location.hash;
        var m = hash.match(/^#chapter-(\\d+)$/);
        if (m) showChapter(parseInt(m[1]));
      }
      window.addEventListener('hashchange', checkHash);
      checkHash();
    })();
  </script>
</body>
</html>`;
}
