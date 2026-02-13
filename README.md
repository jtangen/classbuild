# ClassBuild

**One topic in. A complete course out.** Grounded in how humans actually learn.

[**Try it live at ClassBuild.ai**](https://classbuild.ai)

![ClassBuild — AI Course Generator](public/hero.png)

---

## The Problem

Building a university-quality course takes weeks of writing, designing quizzes, creating slides, and sourcing examples. Most AI tools generate flat text dumps — no structure, no pedagogy, no multimedia. ClassBuild generates complete, ready-to-teach courses that apply real cognitive science at every layer.

## What ClassBuild Does

Describe your subject and ClassBuild produces a full course: interactive chapters with embedded widgets, gamified quizzes with confidence calibration, PowerPoint slides with speaker notes, AI-narrated audiobooks, infographics, and a teaching pack — all woven with five evidence-based learning principles.

**Per chapter, you get:**
- Interactive HTML reading with embedded visualizations and callout boxes
- Gamified practice quiz with confidence calibration, streaks, and achievements
- In-class quiz (5 shuffled versions + answer keys)
- PowerPoint slides with speaker notes
- AI-narrated audiobook (ElevenLabs)
- Teaching pack: discussion starters, activities, and current events hooks

## Built With

React 19 · Vite 7 · TypeScript 5.9 · Tailwind CSS 4 · Zustand · Framer Motion · Claude Opus 4.6 / Sonnet 4.5 / Haiku 4.5 · ElevenLabs · Gemini

Built with Claude for the [Anthropic Hackathon](https://docs.google.com/forms/d/e/1FAIpQLSdAmDqfWux_oP_E55aSaXRahq6lkSi3jBWG4PlMOmhgVUhg-w/viewform) (Feb 2026).

## Getting Started

```bash
git clone https://github.com/jtangen/classbuild.git
cd classbuild
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173) and enter your API key on the Setup page.

**Bring Your Own Key** — ClassBuild runs entirely in your browser. Your API keys are never sent to any server.

| Key | Required | Purpose |
|-----|----------|---------|
| Anthropic Claude | Yes | Course generation (all stages) |
| ElevenLabs | No | Voice narration |
| Google Gemini | No | AI-generated infographics |

## How It Works

ClassBuild is a six-stage pipeline:

1. **Setup** — Define your topic, audience level, chapter count, and preferences
2. **Syllabus** — Claude designs the full course arc: chapter narratives, key concepts, and learning science annotations
3. **Research** — Web search gathers real-world sources and examples to ground every chapter
4. **Build** — Generate all materials live: chapters, quizzes, slides, audio, and infographics stream in real time
5. **Export** — Download as ZIP, PowerPoint, or publish as a standalone course viewer site

Four visual themes (Midnight, Classic, Ocean, Warm) carry through every output — chapters, quizzes, slides, and the published course viewer.

## Learning Science

These aren't buzzwords. Each principle draws on decades of cognitive science, and ClassBuild weaves all five into every chapter, quiz, and activity it generates:

- **Retrieval practice** — Built-in "Think About It" prompts test recall before delivering answers; quizzes track accuracy alongside confidence
- **Interleaving** — Related concepts are mixed across practice sets, not blocked together
- **Dual coding** — Every concept gets both verbal and visual representation through interactive widgets, diagrams, and infographics
- **Concrete examples** — Abstract theories are grounded in vivid, real-world cases — named people, specific studies, tangible scenarios
- **Elaboration** — Learners connect new material to what they already know through discussion starters, thought experiments, and cross-chapter callbacks

The syllabus stage annotates every chapter with the specific principles it emphasizes, so instructors can see exactly how the science is wired in.

## License

[MIT](LICENSE)
