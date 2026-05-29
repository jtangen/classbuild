/**
 * Codex course-site viewer — the published per-course index.html.
 *
 * This mirrors the viewer used for the example courses at courses.classbuild.ai
 * (classbuild-cli/scripts/lib/codexViewerTemplate.ts), so a course published
 * from the app looks identical to the showcase. Chrome (sidebar, tab bar, cards,
 * welcome) is the ClassBuild "Codex" Parchment design system: cream ground, ink
 * prose in Newsreader, maroon + gilt accents, JetBrains Mono metadata. Reading /
 * Practice Quiz / Weekly Challenge load the already-themed course HTML in
 * sandboxed iframes (so each course keeps its own Terminal/Studio/Almanac/… look).
 * Slides, Audio, Discussion and Activities are rendered natively in Codex.
 *
 * Tab order: Reading · Practice · Challenge · Discussion · Activities · Audio ·
 * Slides. A tab appears only when its data exists.
 *
 * The assembler in services/export/publishExporter.ts writes the referenced
 * files (chapters/NN.html, quizzes/NN.html, challenges/NN.html, audio/NN.mp3,
 * slides/chNN/slide-MM.jpg) into the zip alongside this index.
 */

export interface SlideMeta { title?: string; }
export interface DiscussionItem { prompt: string; hook: string; }
export interface ActivityItem {
  title: string; duration?: string; description?: string;
  materials?: string; learningGoal?: string; scalingNotes?: string;
}
export interface DownloadLink { label: string; path: string; }

export interface CodexChapterData {
  number: number;
  title: string;
  narrative?: string;
  chapterHtmlPath?: string;   // chapters/NN.html
  quizHtmlPath?: string;      // quizzes/NN.html
  challengeHtmlPath?: string; // challenges/NN.html
  audioPath?: string;         // audio/NN.mp3
  transcript?: string;
  slides?: SlideMeta[];       // for captions; images by convention slides/chNN/slide-MM.jpg
  discussion?: DiscussionItem[];
  activities?: ActivityItem[];
  downloadLinks?: DownloadLink[];
}

export interface CodexCourseMeta {
  courseTitle: string;
  courseOverview: string;
  audience?: string;
  themeLabel?: string; // e.g. "Terminal" — the chapter theme, for the sidebar tag
}

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600&family=JetBrains+Mono:wght@400;500;600&display=swap';

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pad2(n: number): string { return String(n).padStart(2, '0'); }

/** Clamp to ~n chars at a word boundary, adding an ellipsis when cut. */
function clamp(s: string, n: number): string {
  const str = s.trim();
  if (str.length <= n) return str;
  const cut = str.slice(0, n);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

function transcriptToHtml(md: string): string {
  // Light rendering: split on blank lines into paragraphs; strip basic md marks.
  return md
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${esc(para.replace(/^#+\s*/, '').replace(/[*_`]/g, ''))}</p>`)
    .join('\n');
}

export function buildCodexViewerHtml(course: CodexCourseMeta, chapters: CodexChapterData[]): string {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);

  const navItems = sorted
    .map(
      (ch) =>
        `<button class="nav-item" data-chapter="${ch.number}" onclick="showChapter(${ch.number})"><span class="nav-num">${pad2(ch.number)}</span><span class="nav-text">${esc(ch.title)}</span></button>`,
    )
    .join('\n          ');

  const panels = sorted
    .map((ch) => {
      const tabs: Array<{ id: string; label: string }> = [];
      const contents: string[] = [];

      // Tab order mirrors the ClassBuild app: Reading · Practice · Challenge ·
      // Discussion · Activities · Audio · Slides.

      // Reading
      if (ch.chapterHtmlPath) {
        tabs.push({ id: 'reading', label: 'Reading' });
        contents.push(
          `<div class="tab-pane" data-pane="reading"><iframe class="frame" src="${ch.chapterHtmlPath}" sandbox="allow-scripts allow-same-origin" loading="lazy" onload="fit(this)"></iframe></div>`,
        );
      }
      // Practice
      if (ch.quizHtmlPath) {
        tabs.push({ id: 'quiz', label: 'Practice' });
        contents.push(
          `<div class="tab-pane" data-pane="quiz"><iframe class="frame" src="${ch.quizHtmlPath}" sandbox="allow-scripts allow-same-origin" loading="lazy" onload="fit(this)"></iframe></div>`,
        );
      }
      // Challenge
      if (ch.challengeHtmlPath) {
        tabs.push({ id: 'challenge', label: 'Challenge' });
        contents.push(
          `<div class="tab-pane" data-pane="challenge"><iframe class="frame" src="${ch.challengeHtmlPath}" sandbox="allow-scripts allow-same-origin" loading="lazy" onload="fit(this)"></iframe></div>`,
        );
      }
      // Discussion
      if (ch.discussion && ch.discussion.length > 0) {
        tabs.push({ id: 'discussion', label: 'Discussion' });
        const cards = ch.discussion
          .map(
            (d, i) =>
              `<div class="card discussion-card"><div class="card-num">${i + 1}</div><div><p class="card-lead">${esc(d.prompt)}</p><p class="card-sub">${esc(d.hook)}</p></div></div>`,
          )
          .join('\n');
        contents.push(`<div class="tab-pane" data-pane="discussion"><div class="card-list">${cards}</div></div>`);
      }
      // Activities
      if (ch.activities && ch.activities.length > 0) {
        tabs.push({ id: 'activities', label: 'Activities' });
        const cards = ch.activities
          .map((a) => {
            const meta: string[] = [];
            if (a.materials) meta.push(`<div class="act-row"><span class="act-key">Materials</span><span>${esc(a.materials)}</span></div>`);
            if (a.learningGoal) meta.push(`<div class="act-row"><span class="act-key">Learning goal</span><span>${esc(a.learningGoal)}</span></div>`);
            if (a.scalingNotes) meta.push(`<div class="act-row"><span class="act-key">Scaling</span><span>${esc(a.scalingNotes)}</span></div>`);
            return `<div class="card activity-card"><div class="activity-head"><h3>${esc(a.title)}</h3>${a.duration ? `<span class="badge">${esc(a.duration)}</span>` : ''}</div>${a.description ? `<p class="card-lead">${esc(a.description)}</p>` : ''}${meta.length ? `<div class="act-meta">${meta.join('')}</div>` : ''}</div>`;
          })
          .join('\n');
        contents.push(`<div class="tab-pane" data-pane="activities"><div class="card-list">${cards}</div></div>`);
      }
      // Audio
      if (ch.audioPath) {
        const transcript = ch.transcript
          ? `<details class="transcript"><summary>Transcript</summary><div class="transcript-body">${transcriptToHtml(ch.transcript)}</div></details>`
          : '';
        tabs.push({ id: 'audio', label: 'Audio' });
        contents.push(
          `<div class="tab-pane" data-pane="audio"><div class="audio-wrap"><div class="audio-card"><div class="audio-eyebrow">Audiobook narration</div><audio controls preload="none" src="${ch.audioPath}"></audio></div>${transcript}</div></div>`,
        );
      }
      // Slides
      if (ch.slides && ch.slides.length > 0) {
        tabs.push({ id: 'slides', label: 'Slides' });
        const cards = ch.slides
          .map((s, i) => {
            const src = `slides/ch${pad2(ch.number)}/slide-${pad2(i + 1)}.jpg`;
            return `<figure class="slide-card"><img loading="lazy" src="${src}" alt="${esc(s.title || `Slide ${i + 1}`)}" onerror="this.closest('.slide-card').style.display='none'"><figcaption><span class="slide-n">${pad2(i + 1)}</span>${esc(s.title || '')}</figcaption></figure>`;
          })
          .join('\n');
        contents.push(`<div class="tab-pane" data-pane="slides"><div class="slide-grid">${cards}</div></div>`);
      }

      const downloads =
        ch.downloadLinks && ch.downloadLinks.length > 0
          ? `<div class="downloads">${ch.downloadLinks.map((d) => `<a class="pill" href="${d.path}" download>${esc(d.label)}</a>`).join('')}</div>`
          : '';

      const tabBar =
        tabs.length > 1
          ? `<div class="tab-bar">${tabs.map((t, i) => `<button class="tab${i === 0 ? ' active' : ''}" data-tab="${t.id}" onclick="showTab(this,'${t.id}')">${t.label}</button>`).join('')}</div>`
          : '';

      // Mark first pane active
      const firstId = tabs[0]?.id;
      const renderedContents = contents
        .map((c) => (firstId && c.includes(`data-pane="${firstId}"`) ? c.replace('class="tab-pane"', 'class="tab-pane active"') : c))
        .join('\n');

      return `<section class="panel" data-chapter="${ch.number}" hidden>
        <header class="panel-head">
          <span class="eyebrow">Class ${pad2(ch.number)}</span>
          <h2>${esc(ch.title)}</h2>
          ${ch.narrative ? `<p class="panel-desc">${esc(clamp(ch.narrative, 220))}</p>` : ''}
          ${downloads}
        </header>
        ${tabBar}
        <div class="panes">${renderedContents}</div>
      </section>`;
    })
    .join('\n');

  const tag = course.themeLabel ? `<span class="tag">${esc(course.themeLabel)}</span>` : '';
  const overview = course.courseOverview || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(course.courseTitle)} — ClassBuild</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --page:#f1ebdd; --canvas:#f8f3e6; --raised:#f8f3e6; --sunken:#e8dfc7;
    --n1:#e8dfc7; --n2:#cfc6ad; --n3:#a89f88; --n4:#7c7464;
    --ink:#1a1814; --muted:#5d574a; --subtle:#7c7464;
    --maroon:#6e1f24; --maroon-hv:#842830; --gilt:#a8854a; --link:#1f2e4a;
    --serif:"Newsreader","Source Serif 4",Georgia,serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,monospace;
    --rule:rgba(26,24,20,0.10); --rule-2:rgba(26,24,20,0.16);
    --shadow:0 1px 2px rgba(26,24,20,.05),0 8px 24px rgba(26,24,20,.06);
  }
  html{background:var(--page)}
  body{font-family:var(--serif);background:var(--page);color:var(--ink);min-height:100vh;display:flex;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-size:17px;line-height:1.6}

  /* Sidebar */
  .sidebar{width:312px;min-height:100vh;background:var(--canvas);border-right:1px solid var(--rule);display:flex;flex-direction:column;position:fixed;inset:0 auto 0 0;overflow-y:auto;z-index:10}
  .side-head{padding:1.9rem 1.6rem 1.4rem;border-bottom:1px solid var(--rule)}
  .brand{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--maroon);display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem;text-decoration:none;transition:color .16s}
  .brand::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gilt)}
  .brand:hover{color:var(--maroon-hv)}
  .brand-ext{font-size:.9em;opacity:.5;font-weight:500}
  .side-head h1{font-family:var(--serif);font-weight:600;font-size:1.4rem;line-height:1.2;letter-spacing:-.01em}
  .side-head .tag{display:inline-block;margin-top:.85rem;font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--n4);border:1px solid var(--n2);border-radius:999px;padding:.2rem .6rem}
  .side-head p{font-size:.82rem;color:var(--muted);margin-top:.85rem;line-height:1.55;font-style:italic}
  .nav{flex:1;padding:.9rem .6rem}
  .nav-label{font-family:var(--mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--subtle);padding:.4rem .85rem .55rem;font-weight:600}
  .nav-item{position:relative;display:flex;gap:.7rem;align-items:baseline;width:100%;padding:.6rem .85rem;text-align:left;background:none;border:none;border-radius:7px;color:var(--muted);font-family:var(--serif);font-size:.95rem;line-height:1.35;cursor:pointer;transition:background .16s,color .16s;margin-bottom:1px}
  .nav-num{font-family:var(--mono);font-size:.72rem;color:var(--gilt);font-weight:600;flex-shrink:0}
  .nav-item:hover{background:rgba(26,24,20,.04);color:var(--ink)}
  .nav-item.active{background:rgba(110,31,36,.08);color:var(--ink);font-weight:600}
  .nav-item.active::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:2px;background:var(--maroon);border-radius:0 2px 2px 0}
  .side-foot{padding:1rem 1.5rem 1.25rem;border-top:1px solid var(--rule);font-family:var(--mono);font-size:.66rem;letter-spacing:.04em;color:var(--subtle);text-align:center}
  .side-foot a{color:var(--maroon);text-decoration:none;font-weight:500}

  /* Main */
  .main{flex:1;margin-left:312px;min-height:100vh}
  .panel-head{padding:2.6rem 3rem 1.7rem;border-bottom:1px solid var(--rule);max-width:1180px}
  .eyebrow{display:inline-block;font-family:var(--mono);font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.18em;color:var(--maroon);margin-bottom:.7rem}
  .panel-head h2{font-family:var(--serif);font-size:2.5rem;font-weight:600;line-height:1.12;letter-spacing:-.015em}
  .panel-desc{font-size:1.02rem;color:var(--muted);margin-top:.9rem;line-height:1.55;max-width:66ch}
  .downloads{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1.2rem}
  .pill{font-family:var(--mono);font-size:.72rem;letter-spacing:.04em;color:var(--link);text-decoration:none;border:1px solid var(--n2);border-radius:999px;padding:.35rem .8rem;transition:background .16s,border-color .16s}
  .pill:hover{background:var(--sunken);border-color:var(--n3)}

  /* Tab bar */
  .tab-bar{display:flex;gap:.2rem;flex-wrap:wrap;padding:.9rem 3rem;border-bottom:1px solid var(--rule);background:var(--canvas);position:sticky;top:0;z-index:5}
  .tab{padding:.5rem 1rem;font-family:var(--mono);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;font-weight:500;border:none;border-radius:6px;cursor:pointer;background:none;color:var(--muted);transition:background .16s,color .16s}
  .tab:hover{color:var(--ink);background:rgba(26,24,20,.04)}
  .tab.active{background:var(--maroon);color:var(--canvas)}
  .tab-pane{display:none}
  .tab-pane.active{display:block}

  /* Iframes */
  .frame{width:100%;border:none;min-height:82vh;display:block;background:#fff}

  /* Cards */
  .card-list{padding:2.4rem 3rem;display:flex;flex-direction:column;gap:.9rem;max-width:920px}
  .card{background:var(--raised);border:1px solid var(--n1);border-radius:10px;padding:1.4rem 1.5rem;box-shadow:var(--shadow)}
  .discussion-card{display:flex;gap:1.1rem}
  .card-num{width:2.1rem;height:2.1rem;border-radius:50%;background:rgba(110,31,36,.08);color:var(--maroon);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.82rem;font-weight:600;flex-shrink:0}
  .card-lead{font-size:1.02rem;color:var(--ink);line-height:1.55;font-weight:500}
  .card-sub{font-size:.9rem;color:var(--muted);margin-top:.55rem;line-height:1.5;font-style:italic}
  .activity-head{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:.5rem}
  .activity-head h3{font-family:var(--serif);font-size:1.25rem;font-weight:600}
  .badge{font-family:var(--mono);font-size:.68rem;letter-spacing:.05em;text-transform:uppercase;color:var(--gilt);border:1px solid var(--n2);border-radius:999px;padding:.2rem .6rem;white-space:nowrap}
  .act-meta{margin-top:.9rem;border-top:1px solid var(--rule);padding-top:.8rem;display:flex;flex-direction:column;gap:.5rem}
  .act-row{display:grid;grid-template-columns:128px 1fr;gap:.8rem;font-size:.9rem;color:var(--muted);line-height:1.5}
  .act-key{font-family:var(--mono);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--subtle);padding-top:.15rem}

  /* Slides */
  .slide-grid{padding:2.4rem 3rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:1.4rem;max-width:1180px}
  .slide-card{background:var(--raised);border:1px solid var(--n1);border-radius:10px;overflow:hidden;box-shadow:var(--shadow)}
  .slide-card img{display:block;width:100%;height:auto;background:var(--sunken)}
  .slide-card figcaption{padding:.7rem .9rem;font-size:.85rem;color:var(--muted);display:flex;gap:.5rem;align-items:baseline;border-top:1px solid var(--rule)}
  .slide-n{font-family:var(--mono);font-size:.7rem;color:var(--gilt);font-weight:600}

  /* Audio */
  .audio-wrap{padding:2.4rem 3rem;max-width:880px}
  .audio-card{background:var(--raised);border:1px solid var(--n1);border-radius:10px;padding:1.6rem;box-shadow:var(--shadow)}
  .audio-eyebrow{font-family:var(--mono);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--maroon);margin-bottom:.9rem}
  .audio-card audio{width:100%}
  .transcript{margin-top:1.3rem;border-top:1px solid var(--rule);padding-top:1rem}
  .transcript summary{font-family:var(--mono);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);cursor:pointer}
  .transcript-body{margin-top:.9rem;color:var(--muted)}
  .transcript-body p{margin-bottom:.8rem;line-height:1.65;font-size:.98rem}

  /* Welcome */
  .welcome{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:2rem}
  .welcome .eyebrow{margin-bottom:1.4rem}
  .welcome h2{font-family:var(--serif);font-size:2.7rem;font-weight:600;max-width:20ch;line-height:1.14;letter-spacing:-.015em;margin-bottom:1rem}
  .welcome p{font-size:1.05rem;color:var(--muted);max-width:48ch;line-height:1.6;font-style:italic}
  .welcome .rule{width:52px;height:2px;background:var(--gilt);margin-top:1.8rem}

  .menu-toggle{display:none;position:fixed;top:1rem;left:1rem;z-index:20;background:var(--canvas);border:1px solid var(--n2);border-radius:7px;padding:.5rem .75rem;color:var(--ink);font-size:1.1rem;cursor:pointer}
  @media(max-width:920px){
    .menu-toggle{display:block}
    .sidebar{transform:translateX(-100%);transition:transform .3s ease;box-shadow:0 0 30px rgba(26,24,20,.2)}
    .sidebar.open{transform:translateX(0)}
    .main{margin-left:0}
    .panel-head{padding:4rem 1.4rem 1.4rem}
    .tab-bar{padding:.75rem 1.4rem;overflow-x:auto}
    .card-list,.slide-grid,.audio-wrap{padding:1.6rem 1.4rem}
    .slide-grid{grid-template-columns:1fr}
  }
</style>
</head>
<body>
<button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">&#9776;</button>
<nav class="sidebar">
  <div class="side-head">
    <a class="brand" href="https://classbuild.ai" target="_blank" rel="noopener">ClassBuild<span class="brand-ext" aria-hidden="true">↗</span></a>
    <h1>${esc(course.courseTitle)}</h1>
    ${tag}
    ${overview ? `<p>${esc(overview.slice(0, 150))}${overview.length > 150 ? '…' : ''}</p>` : ''}
  </div>
  <div class="nav">
    <div class="nav-label">Classes</div>
    ${navItems}
  </div>
  <div class="side-foot">Built with <a href="https://classbuild.ai" target="_blank" rel="noopener">ClassBuild</a></div>
</nav>
<main class="main">
  <div class="welcome" id="welcome">
    <span class="eyebrow">${sorted.length} ${sorted.length === 1 ? 'class' : 'classes'}</span>
    <h2>${esc(course.courseTitle)}</h2>
    ${overview ? `<p>${esc(overview.slice(0, 220))}${overview.length > 220 ? '…' : ''}</p>` : ''}
    <div class="rule"></div>
  </div>
  ${panels}
</main>
<script>
  function fit(f){try{var d=f.contentDocument||f.contentWindow.document;var h=d.documentElement.scrollHeight;if(h>200)f.style.height=h+'px';}catch(e){}}
  function showChapter(n){
    var w=document.getElementById('welcome'); if(w)w.style.display='none';
    document.querySelectorAll('.panel').forEach(function(p){p.hidden=(p.getAttribute('data-chapter')!=n);});
    document.querySelectorAll('.nav-item').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-chapter')==n);});
    document.querySelector('.sidebar').classList.remove('open');
    var panel=document.querySelector('.panel[data-chapter="'+n+'"]');
    if(panel){var tabs=panel.querySelectorAll('.tab');var panes=panel.querySelectorAll('.tab-pane');
      if(tabs.length){tabs.forEach(function(t,i){t.classList.toggle('active',i===0);});}
      panes.forEach(function(p,i){p.classList.toggle('active',i===0);});
      panel.querySelectorAll('.tab-pane.active iframe').forEach(function(f){fit(f);});
    }
    window.scrollTo(0,0);
  }
  function showTab(btn,id){
    var panel=btn.closest('.panel');
    panel.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active');});
    panel.querySelectorAll('.tab-pane').forEach(function(p){p.classList.remove('active');});
    btn.classList.add('active');
    var pane=panel.querySelector('.tab-pane[data-pane="'+id+'"]');
    if(pane){pane.classList.add('active');pane.querySelectorAll('iframe').forEach(function(f){fit(f);});}
  }
  ${sorted.length === 1 ? `showChapter(${sorted[0].number});` : ''}
</script>
</body>
</html>`;
}
