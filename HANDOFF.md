# Course Redo Handoff — Tea is done, Puppy in progress

## What we're doing

Converting the 6 ClassBuild example courses to the new chapter themes (Press / Notebook / Almanac / Storybook / Studio / Terminal). Each course's **chapter text stays verbatim** (audio narration already exists for it and must keep matching), but we re-theme the chapter HTML, render fresh figures via OpenAI, and add interactive widgets that match the new theme.

Image renders go through OpenAI gpt-image-2; everything else (text) is done by you (Claude) directly. The API key lives in `/Users/uqjtange/Documents/research/current_projects/classbuild-cli/.env.local` (gitignored via `*.local`). All scripts use `npx tsx --env-file=.env.local ...` to pick it up.

## Theme map (locked in)

| Course | Slug | Theme | Status |
|---|---|---|---|
| Science and Art of Tea | `science-and-art-of-tea` | **Press** | ✅ Complete — 6 chapters, original prose, figures, widgets, slides, weekly challenges |
| Puppy School | `raising-a-puppy` | **Almanac** | 🟡 Ch1 + Ch2 done · Ch3–Ch8 pending |
| Understanding Your Sleep | `understanding-your-sleep` | **Notebook** | ⏳ Not started |
| Leadership through Crisis | `leadership-through-crisis` | **Studio** | ⏳ Not started |
| Training for Your First Marathon | `training-for-your-first-marathon` | **Storybook** | ⏳ Not started |
| The Strategy of Everything (Game Theory) | `game-theory` | **Terminal** | ⏳ Not started |

## Workflow (per chapter)

For each chapter that hasn't been redone:

### 1. Extract the original prose

```bash
grep -nE "<h1|<h2>|<h3>|<p>|<li>|takeaway|<blockquote>|<cite>|<aside>" \
  output/<slug>/chapters/0X_*.html | head -120
```

The original HTML has the old ocean-theme CSS that we throw away; we keep the prose only.

### 2. Build the new chapter HTML

- Create `output/<slug>/chapters-<theme>/0X_<slug-name>.html`
- Copy the full CSS block from the existing template chapter (see "Templates" below)
- Replace the article body with the original prose, marked up in the `.ch-*` contract
- Add `<link rel="stylesheet" href="widgets-<theme>.css">` after the Google Fonts link
- Add 2 `<figure class="ai-image" data-prompt="..." data-aspect="landscape">` placeholders in spots that fit the chapter's content. **Image idiom is clean modern editorial — NOT painterly:**
  - When the subject is a real-world thing (puppy, person, food, environment, equipment): a clean editorial photograph (35mm/50mm/85mm prime, soft natural light, sharp focus, photoreal). Do NOT ask for watercolour, pen-and-ink, woodcut, field-guide plate, hand-lettered serif, lab-notebook on graph paper, taped sticky-notes, or any palette restated as paint pigments. If labels are essential (e.g. a 6-pose comparison grid), put them in a slim dark-grey caption strip beneath each frame in clean white sans-serif (Inter / Helvetica, all-caps).
  - When the subject is abstract data or process (hypnogram, phase-response curve, dose-decay, flowchart, anatomy cross-section): a clean modern editorial data visualisation in the style of an NYT or Bloomberg science graphic — flat dark navy line, single dark-coral accent, modern sans-serif type, generous white space. No graph paper, no faux-handwriting, no taped sticky-notes, no faux-notebook patina.
  - The theme controls the page chrome around the image (typography, layout, colour rules), not the image itself. The image should look like clean editorial photography or clean editorial design that could ship in The Atlantic, regardless of which theme the chapter is in.
- If you're converting an older course that still uses painterly prompts, see "Re-photographing old courses" below.
- Add 2–3 widgets per chapter from the syllabus widget specs (syllabus lives at `output/<slug>/syllabus.json`)

### 3. Render the figures

```bash
cd /Users/uqjtange/Documents/research/current_projects/classbuild-cli
npx tsx --env-file=.env.local scripts/render-ai-images.ts \
  output/<slug>/chapters-<theme>/0X_<slug-name>.html
```

Background it with `run_in_background: true` — each figure takes 90–150s. Script is idempotent: it skips existing files, so you can re-run safely.

### 4. (Optional) Slides JSON + weekly challenge JSON

The Tea course has these in `slides-new/` and `weekly-challenge/`. For Puppy and onward, you can write them per the schemas in `classbuild/src/prompts/slides.ts` and `classbuild/src/prompts/weeklyChallenge.ts`. Slide images render via `scripts/render-slides.ts` with the same env-file flag.

## Templates

The cleanest reference templates to copy CSS + structure from:

| Theme | Reference template |
|---|---|
| Press | `output/science-and-art-of-tea/chapters-press/01_one-leaf-a-thousand-mountains.html` |
| Almanac | `output/raising-a-puppy/chapters-almanac/01_before-they-arrive.html` |
| Notebook | (To be created — see `classbuild/src/themes/notebook.css` for the markup contract) |
| Studio | (To be created — see `classbuild/src/themes/studio.css`) |
| Storybook | (To be created — see `classbuild/src/themes/storybook.css`) |
| Terminal | (To be created — see `classbuild/src/themes/terminal.css`) |

Shared widget styles for each theme live next to the chapters as e.g. `chapters-press/widgets.css`, `chapters-almanac/widgets-almanac.css`. Create a new shared widget CSS file the first time you start a new theme.

## Key paths

```
/Users/uqjtange/Documents/research/current_projects/classbuild-cli/
├── .env.local                          ← OPENAI_API_KEY (gitignored)
├── scripts/
│   ├── render-ai-images.ts             ← renders <figure class="ai-image"> placeholders
│   └── render-slides.ts                ← renders slides JSON to images
└── output/
    ├── science-and-art-of-tea/         ✅ DONE
    ├── raising-a-puppy/                🟡 Ch1+Ch2 done
    ├── understanding-your-sleep/
    ├── leadership-through-crisis/
    ├── training-for-your-first-marathon/
    └── game-theory/

/Users/uqjtange/Documents/research/current_projects/classbuild/src/themes/
├── almanac.css                          ← theme spec reference
├── notebook.css
├── press.css
├── storybook.css
├── studio.css
└── terminal.css
```

## What's stable / what's not

- **Audio recordings** at `output/<slug>/audio/*.mp3` — DO NOT regenerate. They match the original chapter prose exactly. Keep them in place; make the new chapter HTML's prose match them.
- **Transcripts** at `output/<slug>/audio/*_transcript.{md,docx}` — keep as-is.
- **Practice quizzes, in-class quizzes, activities, discussion, research, infographic** — left untouched. They reference the chapter topics broadly and don't need updates.
- **Old chapter HTML** at `output/<slug>/chapters/0X_*.html` — leave intact as the prose source. The new versions go alongside in `chapters-<theme>/`.
- **course.json** at `output/<slug>/course.json` — the `themeId` field still says `"ocean"` (the legacy theme). Update to the new theme ID when you're ready to re-publish, OR leave it and have the publish step override it.

## Resume prompt to paste in a fresh conversation

> I'm resuming a multi-course theme conversion for ClassBuild. The full handoff doc is at `/Users/uqjtange/Documents/research/current_projects/classbuild-cli/HANDOFF.md` — please read it.
>
> Current state: Tea (Press) is fully complete. Puppy (Almanac) Ch1 and Ch2 are done. I need you to continue with Puppy Ch3 ("The Socialisation Window — A Once-in-a-Lifetime Window"), following the workflow in HANDOFF.md. Template to copy from: `output/raising-a-puppy/chapters-almanac/01_before-they-arrive.html`. Shared widget CSS: `output/raising-a-puppy/chapters-almanac/widgets-almanac.css`.
>
> The OpenAI API key is already in `.env.local`. Render commands should use `npx tsx --env-file=.env.local scripts/render-ai-images.ts <path>`.
>
> Please continue with Ch3 end-to-end (HTML + 2 figures + 2–3 widgets), background the figure renders, and proceed to Ch4 while they cook. When Ch3–Ch8 are done, move on to Sleep → Notebook. The theme map is in HANDOFF.md.

## Re-photographing old courses

The first wave of courses (Tea, Puppy, partial Sleep) shipped with painterly "field-guide watercolour" / "lab-notebook on graph paper" image prompts that came out as recognisable AI-slop sketches. The fix is to rewrite the existing `data-prompt` attributes in the chapter HTML (and `imagePrompt` strings in the slide JSONs) as clean editorial photography / clean modern data viz, then re-render.

Mechanics:

1. Read the existing prompts (`grep -oE 'data-prompt="[^"]*"' <chapter.html>` or `jq '.[].imagePrompt' <slides.json>`).
2. Draft replacements in a Claude Code conversation — do NOT call the Anthropic API from a script (uses Max plan credits, not API).
3. Put the replacements into a JSON sidecar at `tmp/rewrites/<course>-<ch>.json` keyed by figure index or slide index. Values are either `"new prompt"` strings or `{"prompt": "...", "caption": "..."}` objects when the figcaption also needs updating to drop illustration-language ("field-guide reference", "in one plate", "boundary colours").
4. Apply with `scripts/rewrite-image-prompts.ts <target> --rewrites <sidecar.json>`. The script preserves a `.pre-photo-rewrite` backup on first touch, reverts rendered chapter `<figure class="ch-figure">` blocks back to `<figure class="ai-image">` placeholder form, and patches `imagePrompt` fields in slide JSONs in place.
5. Re-render: `scripts/render-ai-images.ts <chapter.html>` for chapter figures, `scripts/render-slides.ts <slides.json> --force` for slide images (the `--force` flag bypasses the idempotent skip-if-jpeg-exists check).

Puppy (Almanac) and Sleep (Notebook) have both been done this way. The applied rewrites and rendered images are checked into `output/<slug>/chapters-<theme>/` and `output/<slug>/slides-<theme>/img/<chN>/`. Each `.pre-photo-rewrite` backup retains the original painterly prompt in case you ever want to roll back.

## Cost watch

First-wave painterly: Tea cost roughly **$19** in OpenAI image renders (76 slide + 12 chapter figures at gpt-image-2 high quality).

Editorial-photo re-render of Puppy + Sleep added ~**$50** on top (32 chapter figures + ~210 slide images at gpt-image-2 high quality). Each chapter is ~$0.80 for its 2 figures; each slide deck is ~$3 for 13–14 slide images. Budget ~$25/course if you also re-render slides.

## Known issues / wishlist for later

- Puppy Ch1 widgets render correctly but were not stress-tested with screen readers
- Tea slides include a few historical anecdotes (Linnaeus, Robert Bruce, Lu Yu) not in the original chapter audio — students hearing the audio + clicking through slides will get them as bonus context. Could be tightened in a polish pass
- The CLI's `course.json` schema still references `themeId: 'ocean'` for all courses — needs migration to the new theme IDs when re-publishing
- `chapters-press/` etc. are sibling directories to the original `chapters/` — the publish pipeline at `classbuild-cli/deploy-courses/` may need an update to point at the new directory
