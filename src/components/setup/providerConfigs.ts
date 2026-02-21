export interface ProviderConfig {
  id: 'claude' | 'elevenLabs' | 'gemini';
  heading: string;
  connectedHeading: string;
  tagline: string;
  required: boolean;
  costNote: string;
  deepLink: string;
  deepLinkLabel: string;
  steps: { text: string }[];
  placeholder: string;
  warnings: { type: 'alert' | 'info'; text: string }[];
  validationFailHint: string;
}

export const CLAUDE_COST_NOTE =
  'Pay-as-you-go \u2014 a full course typically costs around $20\u201330, depending on length.';

export const ELEVENLABS_COST_NOTE =
  'Starter plan ($5/mo) recommended \u2014 a full course audiobook uses ~60\u201390 min of quota.';

export const GEMINI_COST_NOTE =
  'Free to start \u2014 Google gives you $300 in trial credits. Each image costs ~$0.04.';

export const CLAUDE_CONFIG: ProviderConfig = {
  id: 'claude',
  heading: 'Connect to Claude',
  connectedHeading: 'Connected to Claude',
  tagline:
    'Claude writes your course content, quizzes, and activities. This connection is required.',
  required: true,
  costNote: CLAUDE_COST_NOTE,
  deepLink: 'https://console.anthropic.com/settings/keys',
  deepLinkLabel: 'Open Anthropic Console',
  steps: [
    { text: 'Create a free account at console.anthropic.com' },
    { text: 'Add at least $5 in API credits (Settings \u2192 Billing)' },
    { text: 'Create an API key and paste it below' },
  ],
  placeholder: 'sk-ant-...',
  warnings: [
    {
      type: 'alert',
      text: 'A Claude Pro subscription is not the same as API access. You need API credits from the Anthropic Console.',
    },
    {
      type: 'info',
      text: 'Your API key is only shown once when created \u2014 save it somewhere safe.',
    },
  ],
  validationFailHint:
    'Check that you copied the full key from console.anthropic.com and that your account has API credits.',
};

export const ELEVENLABS_CONFIG: ProviderConfig = {
  id: 'elevenLabs',
  heading: 'Add voice narration',
  connectedHeading: 'Voice narration connected',
  tagline:
    'Students can listen to chapters read aloud \u2014 great for accessibility.',
  required: false,
  costNote: ELEVENLABS_COST_NOTE,
  deepLink: 'https://elevenlabs.io/app/settings/api-keys',
  deepLinkLabel: 'Open ElevenLabs Settings',
  steps: [
    { text: 'Sign up for a free account at elevenlabs.io' },
    { text: 'Go to Settings \u2192 API Keys and create a key' },
    { text: 'Make sure "Restrict Key" is toggled off' },
  ],
  placeholder: 'xi-...',
  warnings: [
    {
      type: 'alert',
      text: 'Restricted API keys won\u2019t work with ClassBuild. Toggle off "Restrict Key" in your ElevenLabs settings.',
    },
  ],
  validationFailHint:
    'Make sure the key is correct and that "Restrict Key" is toggled off in your ElevenLabs settings.',
};

export const GEMINI_CONFIG: ProviderConfig = {
  id: 'gemini',
  heading: 'Add infographics',
  connectedHeading: 'Infographics connected',
  tagline:
    'Generate custom illustrations and diagrams for your chapters.',
  required: false,
  costNote: GEMINI_COST_NOTE,
  deepLink: 'https://aistudio.google.com/apikey',
  deepLinkLabel: 'Open Google AI Studio',
  steps: [
    { text: 'Sign in to Google AI Studio with your Google account' },
    { text: 'Click "Create API Key" and copy it' },
    { text: 'Enable Cloud billing if prompted (free trial works)' },
  ],
  placeholder: 'AIza...',
  warnings: [
    {
      type: 'info',
      text: 'School/university Google accounts may block AI Studio. Use a personal Google account if needed.',
    },
    {
      type: 'info',
      text: 'Image generation requires Cloud billing to be enabled, but the $300 free trial covers it.',
    },
  ],
  validationFailHint:
    'Check that you copied the full key from AI Studio and that your Google account has API access enabled.',
};

export const PROVIDER_CONFIGS = [CLAUDE_CONFIG, ELEVENLABS_CONFIG, GEMINI_CONFIG] as const;
