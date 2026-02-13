import type { Syllabus, GeneratedChapter } from '../types/course';
import { getTheme } from '../themes';

interface ChapterWithQuiz extends GeneratedChapter {
  quizHtml?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeSrcdoc(html: string): string {
  // For srcdoc attribute: escape quotes and ampersands
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
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
): string {
  const t = getTheme(themeId);
  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  const sidebarItems = sortedChapters.map((ch) => {
    return `<button class="nav-item" data-chapter="${ch.number}" onclick="showChapter(${ch.number})">${escapeHtml(`Class ${ch.number}: ${ch.title}`)}</button>`;
  }).join('\n          ');

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
    if (ch.infographicDataUri) {
      subTabs.push('<button class="sub-tab" data-subtab="infographic" onclick="showSubTab(this, \'infographic\')">Infographic</button>');
    }

    // Reading iframe
    sections.push(`
        <div class="sub-content active" data-subcontent="reading">
          <iframe class="reading-frame" srcdoc="${escapeSrcdoc(ch.htmlContent)}" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>`);

    // Practice quiz iframe
    if (ch.quizHtml) {
      sections.push(`
        <div class="sub-content" data-subcontent="quiz">
          <iframe class="quiz-frame" srcdoc="${escapeSrcdoc(ch.quizHtml)}" sandbox="allow-scripts allow-same-origin"></iframe>
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

    // Infographic
    if (ch.infographicDataUri) {
      sections.push(`
        <div class="sub-content" data-subcontent="infographic">
          <img src="${ch.infographicDataUri}" alt="Infographic for ${escapeHtml(ch.title)}" class="infographic-img" />
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
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: ${t.pageBg};
      --card: ${t.cardBg};
      --elevated: ${t.elevated};
      --accent: ${t.accent};
      --accent-light: ${t.accentLight};
      --text: ${t.textPrimary};
      --text-sec: ${t.textSecondary};
      --text-muted: ${t.textMuted};
      --success: ${t.success};
      --font: ${t.headingFont};
    }

    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
    }

    /* Sidebar */
    .sidebar {
      width: 280px;
      min-height: 100vh;
      background: var(--card);
      border-right: 1px solid ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.1)'};
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
      padding: 1.5rem;
      border-bottom: 1px solid ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.08)'};
    }

    .sidebar-header h1 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.3;
    }

    .sidebar-header p {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      line-height: 1.4;
    }

    .nav-list {
      flex: 1;
      padding: 0.5rem;
    }

    .nav-item {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      text-align: left;
      background: none;
      border: none;
      border-radius: 8px;
      color: var(--text-sec);
      font-size: 0.85rem;
      font-family: var(--font);
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 2px;
    }

    .nav-item:hover {
      background: ${t.isDark ? 'rgba(139,92,246,0.08)' : 'rgba(0,0,0,0.04)'};
      color: var(--text);
    }

    .nav-item.active {
      background: ${t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(30,58,95,0.1)'};
      color: var(--accent);
      font-weight: 600;
    }

    .sidebar-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.08)'};
      font-size: 0.7rem;
      color: var(--text-muted);
      text-align: center;
    }

    .sidebar-footer a {
      color: var(--accent);
      text-decoration: none;
    }

    /* Main content */
    .main {
      flex: 1;
      margin-left: 280px;
      min-height: 100vh;
    }

    .chapter-panel { padding: 0; }

    .chapter-header {
      padding: 2rem 2.5rem;
      border-bottom: 1px solid ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.08)'};
    }

    .chapter-label {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .chapter-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }

    .chapter-desc {
      font-size: 0.9rem;
      color: var(--text-sec);
      margin-top: 0.75rem;
      line-height: 1.5;
    }

    /* Sub-tabs */
    .sub-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.75rem 2.5rem;
      border-bottom: 1px solid ${t.isDark ? 'rgba(139,92,246,0.08)' : 'rgba(0,0,0,0.06)'};
      background: var(--card);
    }

    .sub-tab {
      padding: 0.5rem 1rem;
      font-size: 0.8rem;
      font-family: var(--font);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      background: none;
      color: var(--text-muted);
    }

    .sub-tab:hover { color: var(--text-sec); }
    .sub-tab.active {
      background: var(--accent);
      color: white;
    }

    .sub-content { display: none; }
    .sub-content.active { display: block; }

    /* Iframes */
    .reading-frame, .quiz-frame {
      width: 100%;
      border: none;
      min-height: 80vh;
    }

    /* Discussion */
    .discussion-list {
      padding: 2rem 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .discussion-card {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--card);
      border-radius: 10px;
      border: 1px solid ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.08)'};
    }

    .discussion-num {
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      background: ${t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(30,58,95,0.1)'};
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .discussion-prompt {
      font-size: 0.95rem;
      color: var(--text);
      line-height: 1.5;
      font-weight: 500;
    }

    .discussion-hook {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
      line-height: 1.4;
      font-style: italic;
    }

    /* Infographic */
    .infographic-img {
      width: 100%;
      max-width: 900px;
      display: block;
      margin: 2rem auto;
      border-radius: 10px;
    }

    /* Welcome screen */
    .welcome {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      text-align: center;
      padding: 2rem;
    }

    .welcome h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 0.75rem;
    }

    .welcome p {
      font-size: 0.9rem;
      color: var(--text-sec);
      max-width: 400px;
      line-height: 1.5;
    }

    /* Mobile */
    .menu-toggle {
      display: none;
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 20;
      background: var(--card);
      border: 1px solid ${t.isDark ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.1)'};
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      color: var(--text);
      font-size: 1.2rem;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .menu-toggle { display: block; }
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s;
      }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
    }
  </style>
</head>
<body>
  <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">&#9776;</button>

  <nav class="sidebar">
    <div class="sidebar-header">
      <h1>${escapeHtml(syllabus.courseTitle)}</h1>
      <p>${escapeHtml(syllabus.courseOverview.slice(0, 150))}${syllabus.courseOverview.length > 150 ? '...' : ''}</p>
    </div>
    <div class="nav-list">
      ${sidebarItems}
    </div>
    <div class="sidebar-footer">
      Built with <a href="#">ClassBuild</a>
    </div>
  </nav>

  <main class="main">
    <div class="welcome" id="welcome">
      <h2>${escapeHtml(syllabus.courseTitle)}</h2>
      <p>Select a class from the sidebar to begin.</p>
    </div>
    ${chapterSections}
  </main>

  <script>
    function showChapter(num) {
      // Hide welcome
      var welcome = document.getElementById('welcome');
      if (welcome) welcome.style.display = 'none';

      // Hide all chapters, show selected
      document.querySelectorAll('.chapter-panel').forEach(function(el) {
        el.style.display = 'none';
      });
      var target = document.querySelector('.chapter-panel[data-chapter="' + num + '"]');
      if (target) target.style.display = 'block';

      // Update nav active state
      document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-chapter') == num);
      });

      // Auto-resize iframes in this chapter
      target && target.querySelectorAll('iframe').forEach(function(frame) {
        frame.onload = function() {
          try {
            var h = frame.contentDocument.documentElement.scrollHeight;
            frame.style.height = Math.max(h, 400) + 'px';
          } catch(e) {}
        };
        // Trigger load if already loaded
        if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
          try {
            var h = frame.contentDocument.documentElement.scrollHeight;
            frame.style.height = Math.max(h, 400) + 'px';
          } catch(e) {}
        }
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
      if (target) {
        target.classList.add('active');
        // Resize iframes when tab becomes visible
        target.querySelectorAll('iframe').forEach(function(frame) {
          try {
            var h = frame.contentDocument.documentElement.scrollHeight;
            frame.style.height = Math.max(h, 400) + 'px';
          } catch(e) {}
        });
      }
    }

    // Auto-show first chapter if only one
    ${sortedChapters.length === 1 ? `showChapter(${sortedChapters[0].number});` : ''}
  </script>
</body>
</html>`;
}
