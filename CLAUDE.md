# ClassBuild

AI course generator that turns a topic description into a complete, multimedia university course. React 19 SPA with a Node CLI, BYOK (bring your own key) — runs entirely client-side.

## Quick commands

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # Type-check app + scripts (tsc -b) + Vite build
npm run lint         # ESLint

# CLI course generation. Keys live in .env.local (see .env.example) — never
# inline them on the command line (they end up in shell history and in
# Claude Code permission rules).
npm run course -- --topic "Your Topic" --chapters 12 --output ./output/dir
# …which is:
npx tsx --env-file=.env.local --import ./scripts/raw-loader.mjs \
  scripts/generate-course.ts --topic "Your Topic" --chapters 12 --output ./output/dir
```

Every CLI script needs `--import ./scripts/raw-loader.mjs`: `src/themes` imports theme CSS with Vite's `?raw` suffix, which plain tsx can't load.

## Project structure

```
src/
├── main.tsx                          # React entry point
├── App.tsx                           # Router (6 routes)
├── index.css                         # Global styles (Tailwind)
├── themes/                           # 6 chapter themes (Press, Notebook, Almanac, Storybook, Studio, Terminal): CSS + themes.config.ts
├── types/
│   ├── course.ts                     # All data interfaces
│   └── generation.ts                 # Generation-related types
├── store/
│   ├── courseStore.ts                # Course state (persisted to IndexedDB, version 4)
│   ├── idbStorage.ts                 # IndexedDB adapter: commit-confirmed writes, save-failure banner
│   ├── apiStore.ts                   # API keys (localStorage)
│   └── uiStore.ts                    # Transient UI + in-flight generation state
├── prompts/                          # 12 prompt builders: syllabus, chapter, research, slides, practiceQuiz,
│                                     #   inClassQuiz, weeklyChallenge, activities, discussion, audioTranscript,
│                                     #   learningObjectives, infographic
├── services/
│   ├── abortRegistry.ts              # AbortControllers by key; abortAll() on course reset/restore
│   ├── claude/
│   │   ├── client.ts                # Anthropic SDK wrapper, model IDs, thinking budgets
│   │   └── streaming.ts            # streamMessage()/streamWithRetry(): thinking, web search, refusal fallback
│   ├── openai/                      # gpt-image-2: imageGen, imagePlacer (figure placeholders), safetyClause
│   ├── elevenLabs/tts.ts            # Audiobook narration (dynamic import)
│   ├── academic/                    # Crossref / Semantic Scholar / Unpaywall source verification
│   ├── quiz/answerBalancer.ts       # Balance correct/distractor answer lengths
│   └── export/                      # pptxExporter, quizDocExporter, publishExporter (dynamic imports)
├── templates/
│   ├── quizTemplate.ts             # Gamified practice quiz HTML (dynamic import)
│   ├── weeklyChallengeTemplate.ts  # Weekly mastery challenge HTML + SCORM reporting (dynamic import)
│   ├── htmlEscape.ts               # escapeHtml / toScriptJson for everything the templates embed
│   ├── codexCourseSiteTemplate.ts  # Published course site
│   └── outcomesTableTemplate.ts    # Learning-outcomes table + CSV
├── pages/                            # Landing, Setup, Syllabus, Research, Build, Export
├── components/
│   ├── layout/                     # AppShell, Header, StageIndicator, useCourseBusy
│   ├── codex/                      # Codex design-system controls
│   ├── shared/                     # Button, Card, Spinner, ErrorBoundary, …
│   ├── build/                      # useChapterMaterials (per-chapter generators), ChapterSidebar, tabs/
│   └── export/                     # ThemePicker, ThemePreviewOverlay
└── utils/                            # projectFile (save/restore + import sanitizing), url (isSafeMediaUrl),
                                      #   errors (friendlyError), format (parseJson, extractHtml), …
scripts/
├── generate-course.ts              # Main CLI entry point (npm run course)
├── raw-loader.mjs, raw-hooks.mjs   # ?raw CSS loader for tsx
├── gen-audio.ts                    # Audio-only CLI
├── publish-course.ts               # Publish utility
├── package-scorm.ts                # SCORM 2004 ZIP packager for Blackboard
├── build-staging.ts                # courses.classbuild.ai staging build (npm run stage)
├── render-ai-images.ts, render-slides.ts, rewrite-image-prompts.ts  # example-course image tooling
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
- Chapter themes ship as CSS files (`src/themes/*.css`, imported `?raw`) and wrap readings via `renderChapterHtml()`; `buildThemePromptBlock(theme)` survives only for the infographic prompt's palette hints.
- 3 Zustand stores: courseStore (persisted to IndexedDB, version 4 with migrations), apiStore (localStorage), uiStore (transient).
- Model output and imported project files are untrusted. Render generated HTML only in `sandbox="allow-scripts"` iframes (never add `allow-same-origin` in the app — API keys live in this origin's localStorage). Templates embed data with `toScriptJson()` and text with `escapeHtml()` (`src/templates/htmlEscape.ts`). Never pass model text as a `String.replace` replacement string (`$'`, `$&` expand) — use a replacer function. Guard imperative `a.href = …` / `window.open` sinks with `isSafeMediaUrl()`.
- Long-running work registers with `abortRegistry` (`beginAbortable`/`endAbortable`), captures its chapter number up front, and checks `signal.aborted` before writing results — the user can switch chapters, press Stop, or start a new course mid-run.
- Anthropic SDK version 0.74.0, used with `dangerouslyAllowBrowser: true` for BYOK.

## How to add a new material type

1. Create a prompt builder in `src/prompts/newMaterial.ts` — export `buildNewMaterialPrompt(themeId?)` returning a system prompt string and `buildNewMaterialUserPrompt(chapter, syllabus, setup, research?)` returning a user message string.
2. Add the generated field to `GeneratedChapter` in `src/types/course.ts`.
3. In `src/components/build/useChapterMaterials.ts`, add a generator that wraps `streamWithRetry()` in `runGenerationLifecycle()` and stores the result via `updateChapter()` (and add the same step to BuildPage's `runBatch` for "Generate all").
4. If needed, add an export handler in `src/services/export/`.
5. For the CLI, import your prompt builder in `scripts/generate-course.ts` and add a generation step in the per-chapter pipeline.
6. Run `npm run build` to verify no type errors.

## Models

```typescript
// src/services/claude/client.ts
opus:   'claude-opus-5-5'
sonnet: 'claude-sonnet-4-6'
haiku:  'claude-haiku-4-5-20251001'
```

Opus (adaptive thinking + `effort`, server-side refusal fallback) drafts the syllabus, chapters, both quizzes and the weekly challenge. Sonnet (the `streamMessage` default) handles research with web search, slides, discussion, activities and audio transcripts. Haiku does answer balancing, activity detail and key validation.
