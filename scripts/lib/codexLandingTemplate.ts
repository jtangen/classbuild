/**
 * Codex landing page for courses.classbuild.ai — the parchment index that
 * links to the six example courses. Matches the ClassBuild site design system
 * (Newsreader prose, JetBrains Mono metadata, cream ground, maroon + gilt).
 */

interface LandingCourse {
  slug: string;
  name: string;
  subtitle: string;
  desc: string;
  chapters: number;
  audience: string;
  theme: string; // chapter-theme label (Terminal, Almanac, …)
}

// Curated card copy (preserved from the prior landing), with correct theme tags.
const COURSES: LandingCourse[] = [
  { slug: 'raising-a-puppy', name: 'Puppy School', subtitle: 'Socialisation, House Training, and Surviving the First Year', desc: 'From the critical 3–16 week socialisation window to adolescent regression at 18 months — everything a first-time owner needs to know.', chapters: 8, audience: 'General public', theme: 'Almanac' },
  { slug: 'game-theory', name: 'The Strategy of Everything', subtitle: 'Nash Equilibria, Auctions, and the Mathematics of Trust', desc: 'Penalty kicks, arms races, spectrum auctions, and evolution — twelve chapters from the prisoner’s dilemma to Arrow’s impossibility theorem.', chapters: 12, audience: 'Advanced undergrad', theme: 'Terminal' },
  { slug: 'understanding-your-sleep', name: 'Understanding Your Sleep', subtitle: 'Circadian Rhythms, Sleep Architecture, and the Caffeine Equation', desc: 'Why morning light matters more than blue-light glasses, how sleep stages actually work, and where the evidence on eight hours gets overstated.', chapters: 7, audience: 'General public', theme: 'Notebook' },
  { slug: 'leadership-through-crisis', name: 'Leadership through Crisis', subtitle: 'Grenfell Tower, Fukushima, and the Thai Cave Rescue', desc: 'Real case studies in high-stakes decision-making — from initial mobilisation under pressure to building a post-incident learning culture.', chapters: 8, audience: 'Professional', theme: 'Studio' },
  { slug: 'science-and-art-of-tea', name: 'One Leaf, Ten Thousand Cups', subtitle: 'Chemistry, Culture, and Ceremony in Every Cup', desc: 'One plant becomes six types of tea. The oxidation science, brewing variables, and centuries of ritual behind the world’s most consumed drink.', chapters: 6, audience: 'General public', theme: 'Press' },
  { slug: 'training-for-your-first-marathon', name: 'From Couch to Finish Line', subtitle: 'Training Science, Nutrition, and the Psychology of 42.2 km', desc: 'Evidence-based periodisation, race-day fuelling, and injury prevention — for people who aren’t sure they’re “a runner” yet.', chapters: 8, audience: 'General public', theme: 'Storybook' },
];

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,500;1,6..72,600&family=JetBrains+Mono:wght@400;500;600&display=swap';

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildLandingHtml(): string {
  const cards = COURSES.map(
    (c, i) => `
      <a class="card" href="./${c.slug}/">
        <div class="card-thumb"><img src="./${c.slug}.jpg" alt="${esc(c.name)}"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}></div>
        <div class="card-body">
          <h2>${esc(c.name)}</h2>
          <p class="card-sub">${esc(c.subtitle)}</p>
          <p class="card-desc">${esc(c.desc)}</p>
          <div class="tags">
            <span class="tag tag-em">${c.chapters} chapters</span>
            <span class="tag">${esc(c.audience)}</span>
            <span class="tag">${esc(c.theme)}</span>
          </div>
          <span class="explore">Explore course <span aria-hidden="true">&rarr;</span></span>
        </div>
      </a>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#f1ebdd">
<meta name="description" content="Six real courses built end-to-end by ClassBuild — chapters, quizzes, slides, audiobooks, and teaching packs, each generated from a single topic description.">
<title>ClassBuild — Example Courses</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_URL}">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --page:#f1ebdd; --canvas:#f8f3e6; --sunken:#e8dfc7;
    --n1:#e8dfc7; --n2:#cfc6ad; --n3:#a89f88; --n4:#7c7464;
    --ink:#1a1814; --muted:#5d574a; --subtle:#7c7464;
    --maroon:#6e1f24; --maroon-hv:#842830; --gilt:#a8854a; --link:#1f2e4a;
    --serif:"Newsreader","Source Serif 4",Georgia,serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,monospace;
    --rule:rgba(26,24,20,.10);
    --shadow:0 1px 2px rgba(26,24,20,.05),0 10px 30px rgba(26,24,20,.07);
    --shadow-hv:0 2px 6px rgba(26,24,20,.08),0 20px 50px rgba(26,24,20,.12);
  }
  html{background:var(--page)}
  body{font-family:var(--serif);background:
    radial-gradient(900px 480px at 50% -8%, rgba(168,133,74,.10), transparent 60%),
    var(--page);color:var(--ink);min-height:100vh;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  .wrap{max-width:1080px;margin:0 auto;padding:5rem 2rem 6rem}

  header{text-align:center;margin-bottom:4rem}
  .eyebrow{display:inline-flex;align-items:center;gap:.55rem;font-family:var(--mono);font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--maroon);border:1px solid var(--n2);border-radius:999px;padding:.4rem .9rem;background:var(--canvas)}
  .eyebrow::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--gilt)}
  h1{font-family:var(--serif);font-weight:600;font-size:clamp(2.6rem,6vw,4.2rem);line-height:1.08;letter-spacing:-.02em;margin:1.6rem 0 0}
  h1 em{font-style:italic;color:var(--maroon)}
  .lede{font-size:1.18rem;color:var(--muted);max-width:42ch;margin:1.3rem auto 0;line-height:1.6;font-style:italic}
  .build-link{display:inline-block;margin-top:1.8rem;font-family:var(--mono);font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--link);text-decoration:none;border-bottom:1px solid var(--n2);padding-bottom:.2rem;transition:color .16s,border-color .16s}
  .build-link:hover{color:var(--maroon);border-color:var(--maroon)}

  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.6rem}
  .card{display:flex;flex-direction:column;background:var(--canvas);border:1px solid var(--n1);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:var(--shadow);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
  .card:hover{transform:translateY(-3px);box-shadow:var(--shadow-hv);border-color:var(--n2)}
  .card-thumb{aspect-ratio:16/9;overflow:hidden;background:var(--sunken);border-bottom:1px solid var(--rule)}
  .card-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .card-body{padding:1.5rem 1.6rem 1.7rem;display:flex;flex-direction:column;flex:1}
  .card-body h2{font-family:var(--serif);font-weight:600;font-size:1.5rem;line-height:1.2;letter-spacing:-.01em}
  .card-sub{font-style:italic;color:var(--gilt);font-size:1rem;margin-top:.3rem;line-height:1.4}
  .card-desc{color:var(--muted);font-size:.96rem;line-height:1.55;margin-top:.85rem}
  .tags{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:1.1rem}
  .tag{font-family:var(--mono);font-size:.68rem;letter-spacing:.05em;text-transform:uppercase;color:var(--n4);border:1px solid var(--n2);border-radius:999px;padding:.25rem .65rem}
  .tag-em{color:var(--maroon);border-color:rgba(110,31,36,.3)}
  .explore{margin-top:1.3rem;font-family:var(--mono);font-size:.76rem;letter-spacing:.06em;text-transform:uppercase;color:var(--maroon);font-weight:600}
  .card:hover .explore{color:var(--maroon-hv)}

  footer{text-align:center;margin-top:4.5rem;font-family:var(--mono);font-size:.7rem;letter-spacing:.06em;color:var(--subtle)}
  footer a{color:var(--maroon);text-decoration:none}

  @media (prefers-reduced-motion: reduce){
    *,*::before,*::after{transition-duration:.01ms !important;animation-duration:.01ms !important}
    .card:hover{transform:none}
  }
  @media(max-width:760px){
    .grid{grid-template-columns:1fr}
    .wrap{padding:3rem 1.25rem 3.5rem}
    header{margin-bottom:2.6rem}
    .lede{font-size:1.08rem}
    .card-body{padding:1.25rem 1.3rem 1.45rem}
  }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <span class="eyebrow">ClassBuild Example Courses</span>
      <h1>See what ClassBuild <em>creates</em></h1>
      <p class="lede">Six real courses, built end-to-end. Each one was generated from a single topic description — chapters, quizzes, slides, audiobooks, and teaching packs.</p>
      <a class="build-link" href="https://classbuild.ai">Build your own at ClassBuild &rarr;</a>
    </header>
    <div class="grid">
      ${cards}
    </div>
    <footer>Made with <a href="https://classbuild.ai">ClassBuild</a> · classbuild.ai</footer>
  </div>
</body>
</html>`;
}
