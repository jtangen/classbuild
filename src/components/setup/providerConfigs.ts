export interface ProviderConfig {
  id: 'claude' | 'openrouter' | 'gemini';
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
  destinationName: string;
}

export const CLAUDE_COST_NOTE =
  'Pay-as-you-go \u2014 a full course typically costs around $20\u201330, depending on length.';

export const OPENROUTER_COST_NOTE =
  'Pay-as-you-go via OpenRouter credits. Pricing is set per model and may differ from Anthropic-direct \u2014 see openrouter.ai/models for the latest rates.';

export const GEMINI_COST_NOTE =
  'Free to start \u2014 Google gives you $300 in trial credits. Covers infographics plus voice narration.';

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
  destinationName: 'Anthropic',
};

export const OPENROUTER_CONFIG: ProviderConfig = {
  id: 'openrouter',
  heading: 'Connect via OpenRouter',
  connectedHeading: 'Connected to OpenRouter',
  tagline:
    'OpenRouter routes requests to Claude models on your behalf. Useful if you already have OpenRouter credits or can’t use Anthropic’s API directly.',
  required: true,
  costNote: OPENROUTER_COST_NOTE,
  deepLink: 'https://openrouter.ai/keys',
  deepLinkLabel: 'Open OpenRouter Keys',
  steps: [
    { text: 'Create an account at openrouter.ai and add credits to your balance' },
    { text: 'Visit openrouter.ai/keys and click “Create Key”' },
    { text: 'Paste the key (starts with sk-or-...) below' },
  ],
  placeholder: 'sk-or-...',
  warnings: [
    {
      type: 'alert',
      text: 'Live web search during the Research stage is Anthropic-only. On OpenRouter, research falls back to model knowledge.',
    },
    {
      type: 'info',
      text: 'Make sure your OpenRouter account has access to the Claude models (Opus 4.6, Sonnet 4.6, Haiku 4.5).',
    },
  ],
  validationFailHint:
    'Check that you copied the full key from openrouter.ai/keys and that your account has credits.',
  destinationName: 'OpenRouter',
};

export const GEMINI_CONFIG: ProviderConfig = {
  id: 'gemini',
  heading: 'Add infographics & voice narration',
  connectedHeading: 'Infographics & voice connected',
  tagline:
    'Generate custom illustrations for each chapter and a full spoken audiobook from your transcripts.',
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
  destinationName: 'Google',
};

export const PROVIDER_CONFIGS = [CLAUDE_CONFIG, GEMINI_CONFIG] as const;

export const LLM_PROVIDER_CONFIGS = [CLAUDE_CONFIG, OPENROUTER_CONFIG] as const;
