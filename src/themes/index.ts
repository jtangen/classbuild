// Re-export everything from themes.config so call sites that do
// `import { getTheme } from '../themes'` continue to work.
export {
  CHAPTER_THEMES,
  DEFAULT_CHAPTER_THEME_ID,
  FONTS_URL,
  THEMES,
  getChapterTheme,
  getTheme,
  isLegacyChapterHtml,
  renderChapterHtml,
  wrapChapterHtml,
  buildThemePromptBlock,
} from './themes.config';

export type {
  ChapterTheme,
  ChapterThemeId,
  Theme,
  ThemeMode,
  ThemePalette,
} from './themes.config';

// ─── ElevenLabs voice options ─────────────────────────────────────────────
//
// All voices below are in the ElevenLabs premade library — automatically
// present in every account, no manual "add to library" step required. The
// IDs are stable across accounts. `accent` is kept in the type for API-shape
// continuity (the prior Gemini integration used it); ElevenLabs handles
// accent via the voice itself, so we leave it empty.

export interface VoiceOption {
  id: string;
  label: string;
  desc: string;
  /** Preview MP3 (public CDN, no auth). The picker also resolves via the
   *  ElevenLabs API if a static URL rotates. */
  previewUrl?: string;
  /** Free-text accent direction. Ignored by ElevenLabs; kept for legacy callers. */
  accent: string;
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    label: 'George',
    desc: 'British male · gravelly mature narration — the go-to audiobook voice',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3',
    accent: '',
  },
  {
    id: 'onwK4e9ZLuTAKqWW03F9',
    label: 'Daniel',
    desc: 'British male · authoritative news-anchor delivery',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/onwK4e9ZLuTAKqWW03F9/7eee0236-1a72-4b86-b303-5dcadc007ba9.mp3',
    accent: '',
  },
  {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    label: 'Alice',
    desc: 'British female · confident, clear — strong for technical reading',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3',
    accent: '',
  },
  {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    label: 'Lily',
    desc: 'British female · warm conversational — pairs well with humanities',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-e3c1f32d8b04.mp3',
    accent: '',
  },
  {
    id: 'ThT5KcBeYPX3keUQqHPh',
    label: 'Dorothy',
    desc: 'British female · soft story-driven cadence',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/ThT5KcBeYPX3keUQqHPh/981f0855-6598-48d2-9f8f-b6d92fbbe3fc.mp3',
    accent: '',
  },
  {
    id: 'IKne3meq5aSn9XLyUdCD',
    label: 'Charlie',
    desc: 'Australian male · relaxed, natural — easy long-form listening',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/IKne3meq5aSn9XLyUdCD/102de6f2-22ed-43e0-a1f1-111fa75c5481.mp3',
    accent: '',
  },
  {
    id: 'nPczCjzI2devNBz1zQrb',
    label: 'Brian',
    desc: 'American male · deep, measured — gravitas for STEM',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/nPczCjzI2devNBz1zQrb/4001737b-cd56-461d-9d0e-a18e9eb02fdd.mp3',
    accent: '',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    label: 'Sarah',
    desc: 'American female · clean professional — neutral newsroom reading',
    previewUrl:
      'https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/6851ec91-9950-471f-8586-357c52539c39.mp3',
    accent: '',
  },
];

export const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // George

export function getVoiceOption(voiceId: string | undefined): VoiceOption {
  return VOICE_OPTIONS.find((v) => v.id === voiceId) ?? VOICE_OPTIONS[0];
}
