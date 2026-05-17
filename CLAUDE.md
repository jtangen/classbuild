# ClassBuild

AI course generator that turns a topic description into a complete, multimedia university course. React 19 SPA with a Node CLI, BYOK (bring your own key) — runs entirely client-side.

## Quick commands

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # TypeScript check (tsc -b) + Vite build
npm run lint         # ESLint

# CLI course generation (Anthropic-direct)
ANTHROPIC_API_KEY=sk-... npx tsx scripts/generate-course.ts \
  --topic "Your Topic" --chapters 12 --output ./output/dir

# Or via OpenRouter (research stage falls back to model knowledge)
OPENROUTER_API_KEY=sk-or-... npx tsx scripts/generate-course.ts \
  --topic "Your Topic" --provider openrouter --output ./output/dir
```

## Project structure

```
src/
├── main.tsx                          # React entry point
├── App.tsx                           # Router (6 routes)
├── themes.ts                         # 4 themes + buildThemePromptBlock()
├── index.css                         # Global styles (Tailwind)
├── types/
│   ├── course.ts                     # All data interfaces
│   └── generation.ts                 # Generation-related types
├── store/
│   ├── courseStore.ts                # Course state (persisted, Zustand)
│   ├── apiStore.ts                  # API keys + llmProvider (persisted, version 2)
│   ├── useLlmCredentials.ts         # Selector: returns { apiKey, provider } for active LLM
│   └── uiStore.ts                   # Batch generation UI state
├── prompts/                          # 12 prompt builders (see below)
│   ├── syllabus.ts
│   ├── chapter.ts
│   ├── research.ts
│   ├── slides.ts
│   ├── practiceQuiz.ts
│   ├── inClassQuiz.ts
│   ├── activities.ts
│   ├── discussion.ts
│   ├── audioTranscript.ts
│   ├── learningObjectives.ts
│   ├── infographic.ts
│   └── weeklyChallenge.ts
├── services/
│   ├── claude/
│   │   ├── client.ts                # Anthropic SDK wrapper, model IDs, provider abstraction (Anthropic / OpenRouter)
│   │   └── streaming.ts            # streamMessage() — streaming with web search + thinking, provider-aware
│   ├── gemini/
│   │   ├── imageGen.ts             # Gemini image generation (dynamic import)
│   │   ├── imagePlacer.ts          # Replace image placeholders in HTML
│   │   └── tts.ts                  # Gemini text-to-speech (dynamic import)
│   ├── quiz/answerBalancer.ts      # Balance correct/distractor answers
│   └── export/
│       ├── pptxExporter.ts         # PowerPoint (dynamic import)
│       ├── quizDocExporter.ts      # DOCX quiz export
│       └── publishExporter.ts      # Course viewer assembly (dynamic import)
├── templates/
│   ├── quizTemplate.ts             # Gamified quiz HTML (~2400 lines, dynamic import)
│   ├── weeklyChallengeTemplate.ts  # Weekly mastery challenge HTML (dynamic import)
│   └── courseViewerTemplate.ts     # Standalone course viewer
├── pages/
│   ├── LandingPage.tsx             # Landing with example courses
│   ├── SetupPage.tsx               # Stage 1: topic & config
│   ├── SyllabusPage.tsx            # Stage 2: syllabus generation
│   ├── ResearchPage.tsx            # Stage 3: research dossiers
│   ├── BuildPage.tsx               # Stage 4: two-panel chapter build
│   └── ExportPage.tsx              # Stage 5: download/publish
├── components/
│   ├── layout/                     # AppShell, Header, StageIndicator
│   ├── shared/                     # Button, Card, Spinner, StreamingText, etc.
│   ├── setup/                      # TopicInput, AudienceSelector, ApiKeyPanel, etc.
│   ├── syllabus/                   # SyllabusTimeline, ChapterCard, CurriculumMapPanel
│   └── build/                      # ChapterSidebar, ResearchPanel
└── utils/
    └── doiValidator.ts
scripts/
├── generate-course.ts              # Main CLI entry point
├── gen-audio.ts                    # Audio-only CLI
├── publish-course.ts               # Publish utility
├── package-scorm.ts                # SCORM 2004 ZIP packager for Blackboard
└── lib/                            # CLI-specific helpers
public/                             # Static assets (hero, previews, course thumbnails)
```

## Key conventions

- `tsconfig.app.json` has `erasableSyntaxOnly: true` — no parameter properties (`public readonly x` in constructors). Use class field declarations instead.
- `noUnusedLocals: true` and `noUnusedParameters: true` — strict unused checks. Always test with `npm run build`.
- Web search uses server tool type: `{ type: 'web_search_20250305', name: 'web_search' }`, NOT a custom tool_use block.
- Stream events: `server_tool_use` for search queries, `web_search_tool_result` for results.
- Template literal escaping: `\${x}` prevents interpolation. For nested templates, `` \` `` produces a literal backtick.
- All code-split chunks use dynamic `import()`: tts.ts, pptxExporter.ts, quizTemplate.ts, weeklyChallengeTemplate.ts, imageGen.ts, imagePlacer.ts, infographic.ts, publishExporter.ts.
- Themes propagate to all outputs via `buildThemePromptBlock(theme)` which injects CSS variables into prompts.
- 3 Zustand stores: courseStore (persisted, version 1 with stage migration), apiStore (persisted, version 2 — adds `openrouterApiKey` + `llmProvider`), uiStore (transient).
- Anthropic SDK version 0.74.0, used with `dangerouslyAllowBrowser: true` for BYOK.
- **Provider abstraction.** Two LLM providers supported: Anthropic-direct (default) and OpenRouter. The seam is `getClient(apiKey, provider)` + `resolveModel(model, provider)` in `client.ts`. OpenRouter uses the same SDK with `baseURL: 'https://openrouter.ai/api'` (the SDK appends `/v1/messages`) and dot-notation model slugs (`anthropic/claude-opus-4.6`). All call sites read `{ apiKey, provider }` from `useLlmCredentials()` and pass both to `streamMessage`/`streamWithRetry`. The CLI auto-detects from `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` env vars (or `--provider` flag).
- **Web search bridge.** Anthropic's `web_search_20250305` server tool isn't supported on OpenRouter. When a caller passes that tool while `provider === 'openrouter'`, `streaming.ts` transparently (a) drops the tool from the request and (b) appends `:online` to the resolved model ID — OpenRouter's `:online` suffix runs the prompt through Exa search and feeds the results into the system prompt. Citations come back as **inline markdown links** in the response text (the structured `citations` field exists but stays empty), so after the stream completes the bridge extracts `[label](url)` pairs and fires `onWebSearchResults` once. The rest of the app sees the same `WebSearchResult[]` shape on both providers. The underlying search query is not exposed by `:online`, so `onWebSearch(query)` doesn't fire there — `ResearchPage` shows a generic "Searching the web…" label during that phase.

## How to add a new material type

1. Create a prompt builder in `src/prompts/newMaterial.ts` — export `buildNewMaterialPrompt(themeId?)` returning a system prompt string and `buildNewMaterialUserPrompt(chapter, syllabus, setup, research?)` returning a user message string.
2. Add the generated field to `GeneratedChapter` in `src/types/course.ts`.
3. In `src/pages/BuildPage.tsx`, add a generation step that calls `streamMessage()` with your prompt and stores the result via `courseStore.updateChapter()`.
4. If needed, add an export handler in `src/services/export/`.
5. For the CLI, import your prompt builder in `scripts/generate-course.ts` and add a generation step in the per-chapter pipeline.
6. Run `npm run build` to verify no type errors.

## Models

```typescript
// src/services/claude/client.ts
opus:   'claude-opus-4-6'
sonnet: 'claude-sonnet-4-6'
haiku:  'claude-haiku-4-5-20251001'
```

OpenRouter equivalents (via `OPENROUTER_MODEL_MAP` + `resolveModel()`):

```typescript
'claude-opus-4-6'           → 'anthropic/claude-opus-4.6'
'claude-sonnet-4-6'         → 'anthropic/claude-sonnet-4.6'
'claude-haiku-4-5-20251001' → 'anthropic/claude-haiku-4.5'
```

Syllabus and chapters use Opus with extended thinking. Slides, quizzes, and other materials use Sonnet. Research uses Haiku with web search.
