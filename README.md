<!--
  keywords: ai course generator, university course builder, ai education, learning science, quiz generator, slide generator, curriculum builder, edtech, prompt engineering, claude, anthropic
  homepage: https://classbuild.ai
  cli: scripts/generate-course.ts
  llm-txt: https://classbuild.ai/llm.txt
  repository: https://github.com/jtangen/classbuild
-->

# ClassBuild

**One topic in. A complete course out.** Grounded in how humans actually learn.

[**Try it live at ClassBuild.ai**](https://classbuild.ai) · [LLM-readable docs](/llm.txt)

![ClassBuild — Draft a course. Edit it. Teach it.](public/classbuild_hero.png)

---

## What is ClassBuild?

A topic, an audience, a chapter count. ClassBuild drafts the syllabus, researches each chapter, writes the slides and quizzes, narrates the lectures, and hands you a course you can edit in the browser — all woven with five evidence-based learning principles.

## What does ClassBuild produce per chapter?

- **Reading chapter** — interactive HTML (and Markdown) with embedded visualisations and callout boxes
- **Slides** — PowerPoint deck, one full-bleed editorial image per slide, with speaker notes (PPTX)
- **In-class quiz** — five shuffled versions plus answer keys (DOCX)
- **Practice quiz** — gamified, with confidence calibration, streaks, and achievements (HTML)
- **Teaching pack** — discussion starters, classroom activities, and current-events hooks
- **Narrated audio** — AI-narrated audiobook of the chapter (MP3)
- **Weekly challenge** — mastery challenge with six question types, plus a SCORM 2004 package for Blackboard (HTML)

Every chapter is also grounded by a **research dossier** (web-sourced references and synthesis notes) gathered during the Research stage.

Reading, practice quiz, and weekly challenge all render in the course's chosen **chapter theme**, so a downloaded course is visually consistent end to end.

## How do I install ClassBuild?

```bash
git clone https://github.com/jtangen/classbuild.git
cd classbuild
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) and enter your API key on the Setup page.

**Bring Your Own Key** — ClassBuild runs entirely in your browser. Your API keys are never sent to any server.

## What API keys do I need?

| Key | Required | Purpose |
|-----|----------|---------|
| Anthropic Claude | Yes | Course generation — syllabus, research, chapters, quizzes, slides, teaching pack |
| OpenAI | For images | Slide images and chapter figures (gpt-image-2) |
| ElevenLabs | For audio | Audiobook narration (text-to-speech) |

## How does ClassBuild work?

ClassBuild is a five-stage pipeline:

1. **Setup** — Define your topic, audience level, chapter count, and preferences
2. **Syllabus** — Claude designs the full course arc: chapter narratives, key concepts, and learning science annotations
3. **Research** — Web search gathers real-world sources and examples to ground every chapter
4. **Build** — Generate all materials live: chapters, quizzes, slides, teaching pack, and audio stream in real time, editable in a two-panel workspace
5. **Export** — Download as ZIP or PowerPoint, package SCORM for an LMS, or publish a standalone course viewer site

Six **chapter themes** — Press, Notebook, Almanac, Storybook, Studio, and Terminal — each a distinct editorial look that carries through the reading, practice quiz, slides, and weekly challenge. The ClassBuild app itself is dressed in its own "Codex" parchment design system.

## How do I generate a course from the command line?

The ClassBuild CLI generates complete courses from the command line — no browser required. Ideal for batch-building entire programs or course catalogues.

```bash
ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-course.ts \
  --topic "The Psychology of Prejudice" \
  --chapters 12 \
  --level advanced-undergrad \
  --theme terminal \
  --length comprehensive \
  --notes "University of Queensland, Australia. Use international and Australian examples." \
  --output ./output/prejudice
```

Set `OPENAI_API_KEY` to render slide images and chapter figures, and `ELEVENLABS_API_KEY` to narrate the audiobooks. Text-only generation needs just `ANTHROPIC_API_KEY`.

## What does each CLI flag do?

| Flag | Default | Description |
|------|---------|-------------|
| `--topic` | *(required)* | Course topic |
| `--chapters` | `12` | Number of chapters |
| `--level` | `advanced-undergrad` | `general-public`, `professional`, `advanced-undergrad` |
| `--theme` | `press` | `press`, `notebook`, `almanac`, `storybook`, `studio`, `terminal` |
| `--length` | `standard` | `concise`, `standard`, `comprehensive` |
| `--widgets` | `3` | Interactive widgets per chapter |
| `--cohort` | `60` | Expected class size |
| `--environment` | `lecture-theatre` | `lecture-theatre`, `collaborative`, `flat-classroom`, `online-hybrid` |
| `--notes` | — | Additional context for the AI (audience, tone, specific topics) |
| `--voice-id` | — | ElevenLabs voice ID for audiobook narration (defaults to a neutral narrator) |
| `--syllabus` | — | Path to existing syllabus.json (skip regeneration) |
| `--stop-after` | — | `syllabus` or `research` — stop early for review |
| `--no-publish` | `false` | Skip course viewer assembly |
| `--specific-topics` | — | Comma-separated topics to include |
| `--avoid-topics` | — | Comma-separated topics to exclude |
| `--textbook` | — | Reference textbook for alignment |
| `--output` | `./output` | Output directory |

See 6 example courses built with the CLI at [courses.classbuild.ai](https://courses.classbuild.ai).

## How do I use ClassBuild's prompt library in my own project?

ClassBuild's 12 prompt builders in `src/prompts/` can be imported directly. Each returns a system prompt and user message for the Anthropic messages API:

```typescript
import { buildSyllabusPrompt, parseSyllabusResponse } from 'classbuild/src/prompts/syllabus';
import { buildChapterPrompt, buildChapterUserPrompt } from 'classbuild/src/prompts/chapter';
import { buildResearchUserPrompt, RESEARCH_SYSTEM_PROMPT } from 'classbuild/src/prompts/research';
import { buildPracticeQuizPrompt } from 'classbuild/src/prompts/practiceQuiz';

// Example: generate a syllabus
const { system, userMessage } = buildSyllabusPrompt(setup);
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  system,
  messages: [{ role: 'user', content: userMessage }],
  max_tokens: 16000,
});
const syllabus = parseSyllabusResponse(response.content[0].text);
```

**Available prompt builders:**

| File | Exports | Purpose |
|------|---------|---------|
| `syllabus.ts` | `buildSyllabusPrompt()`, `parseSyllabusResponse()` | Course architecture with learning science |
| `chapter.ts` | `buildChapterPrompt()`, `buildChapterUserPrompt()` | Interactive HTML chapter |
| `research.ts` | `RESEARCH_SYSTEM_PROMPT`, `buildResearchUserPrompt()` | Research dossier with web search |
| `slides.ts` | `buildSlidesPrompt()`, `buildSlidesUserPrompt()` | PowerPoint slide content |
| `practiceQuiz.ts` | `buildPracticeQuizPrompt()`, `buildPracticeQuizUserPrompt()` | Gamified practice quiz |
| `inClassQuiz.ts` | `buildInClassQuizPrompt()`, `buildInClassQuizUserPrompt()` | In-class quiz (5 versions) |
| `activities.ts` | `buildActivitiesPrompt()`, `buildActivitiesUserPrompt()` | Classroom activities |
| `discussion.ts` | `buildDiscussionPrompt()`, `buildDiscussionUserPrompt()` | Discussion starters |
| `audioTranscript.ts` | `buildAudioTranscriptPrompt()`, `buildAudioTranscriptUserPrompt()` | Audiobook narration |
| `learningObjectives.ts` | — | Learning objectives (Bloom's taxonomy) |
| `infographic.ts` | `buildInfographicMetaPrompt()`, `buildInfographicMetaUserPrompt()` | Infographic briefs |
| `weeklyChallenge.ts` | `buildWeeklyChallengePrompt()`, `buildWeeklyChallengeUserPrompt()` | Weekly mastery challenge |

## What learning science does ClassBuild apply?

These aren't buzzwords. Each principle draws on decades of cognitive science, and ClassBuild weaves all five into every chapter, quiz, and activity it generates:

- **Retrieval practice** — Built-in "Think About It" prompts test recall before delivering answers; quizzes track accuracy alongside confidence
- **Interleaving** — Related concepts are mixed across practice sets, not blocked together
- **Dual coding** — Every concept gets both verbal and visual representation through interactive widgets, diagrams, and infographics
- **Concrete examples** — Abstract theories are grounded in vivid, real-world cases — named people, specific studies, tangible scenarios
- **Elaboration** — Learners connect new material to what they already know through discussion starters, thought experiments, and cross-chapter callbacks

The syllabus stage annotates every chapter with the specific principles it emphasizes, so instructors can see exactly how the science is wired in.

## Built with

React 19 · Vite 7 · TypeScript 5.9 · Tailwind CSS 4 · Zustand · Framer Motion · Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5 · OpenAI gpt-image-2 (images) · ElevenLabs (narration)

Built with Claude for the [Anthropic Hackathon](https://docs.google.com/forms/d/e/1FAIpQLSdAmDqfWux_oP_E55aSaXRahq6lkSi3jBWG4PlMOmhgVUhg-w/viewform) (Feb 2026).

## License

[MIT](LICENSE)
