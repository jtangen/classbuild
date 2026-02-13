export interface Theme {
  id: string;
  name: string;
  pageBg: string;
  cardBg: string;
  elevated: string;
  accent: string;
  accentLight: string;
  warmAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  headingFont: string;
  bodyFont: string;
  isDark: boolean;
}

export const THEMES: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    pageBg: '#0f0f1a',
    cardBg: '#1a1a2e',
    elevated: '#252540',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    warmAccent: '#f59e0b',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    success: '#22c55e',
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "'Georgia', 'Times New Roman', serif",
    isDark: true,
  },
  {
    id: 'classic',
    name: 'Classic',
    pageBg: '#faf8f5',
    cardBg: '#ffffff',
    elevated: '#f0ebe4',
    accent: '#1e3a5f',
    accentLight: '#2d5986',
    warmAccent: '#b45309',
    textPrimary: '#1a1a1a',
    textSecondary: '#4a4a4a',
    textMuted: '#7a7a7a',
    success: '#166534',
    headingFont: "'Georgia', 'Times New Roman', serif",
    bodyFont: "'Georgia', 'Times New Roman', serif",
    isDark: false,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    pageBg: '#0c1929',
    cardBg: '#132337',
    elevated: '#1b3148',
    accent: '#06b6d4',
    accentLight: '#22d3ee',
    warmAccent: '#f59e0b',
    textPrimary: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    success: '#22c55e',
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
    isDark: true,
  },
  {
    id: 'warm',
    name: 'Warm',
    pageBg: '#faf5f0',
    cardBg: '#ffffff',
    elevated: '#f5ebe0',
    accent: '#c2410c',
    accentLight: '#ea580c',
    warmAccent: '#92400e',
    textPrimary: '#1c1917',
    textSecondary: '#44403c',
    textMuted: '#78716c',
    success: '#166534',
    headingFont: "'Georgia', 'Times New Roman', serif",
    bodyFont: "'Lora', 'Georgia', serif",
    isDark: false,
  },
];

export function getTheme(themeId?: string): Theme {
  return THEMES.find(t => t.id === themeId) ?? THEMES[0];
}

/**
 * Builds a color specification block for injection into any Claude prompt.
 * This tells Claude what colors to use when generating HTML content.
 */
export function buildThemePromptBlock(theme: Theme): string {
  return `## VISUAL DESIGN
Use this exact color scheme and design system:
- Page background: ${theme.pageBg}
- Content card background: ${theme.cardBg}
- Elevated elements: ${theme.elevated}
- Primary accent: ${theme.accent}
- Secondary accent: ${theme.accentLight}
- Warm accent: ${theme.warmAccent} (for highlights and key terms)
- Primary text: ${theme.textPrimary}
- Secondary text: ${theme.textSecondary}
- Muted text: ${theme.textMuted}
- Success: ${theme.success}
- Font: ${theme.headingFont} for UI; ${theme.bodyFont} for body prose
- Max content width: 800px, centered
- Generous padding and spacing (line-height: 1.8 for prose)
- Subtle box-shadows on cards: 0 4px 24px ${theme.accent}0d
- Rounded corners (12px for cards, 8px for inner elements)
- ${theme.accent} left border on blockquotes (3px solid ${theme.accent})
- Key terms highlighted with warm accent: background ${theme.warmAccent}1a, padding 2px 6px, border-radius 4px
- Section dividers: gradient line from transparent through ${theme.accent} to transparent`;
}

/** Voice options for ElevenLabs TTS */
export const VOICE_OPTIONS = [
  { id: 'ZF6FPAbjXT4488VcRRnw', label: 'Amelia', desc: 'Friendly, approachable guide' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh', desc: 'Casual, energetic narrator' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel', desc: 'Articulate British academic' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah', desc: 'Warm, approachable educator' },
];
