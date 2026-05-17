import { useApiStore } from '../../store/apiStore';
import type { Provider } from '../../services/claude/client';
import { ProviderCard } from './ProviderCard';
import { CLAUDE_CONFIG, OPENROUTER_CONFIG } from './providerConfigs';

interface LlmProviderCardProps {
  validateClaude: () => Promise<void>;
  validateOpenrouter: () => Promise<void>;
}

const TABS: { id: Provider; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openrouter', label: 'OpenRouter' },
];

export function LlmProviderCard({ validateClaude, validateOpenrouter }: LlmProviderCardProps) {
  const {
    llmProvider, setLlmProvider,
    claudeApiKey, openrouterApiKey,
    claudeKeyValid, openrouterKeyValid,
    isValidatingClaude, isValidatingOpenrouter,
    setClaudeApiKey, setOpenrouterApiKey,
  } = useApiStore();

  const isClaudeConnected = claudeKeyValid === true && claudeApiKey.trim().length > 0;
  const isOpenrouterConnected = openrouterKeyValid === true && openrouterApiKey.trim().length > 0;

  return (
    <div>
      <div
        role="tablist"
        aria-label="LLM provider"
        className="flex gap-1 p-1 mb-3 rounded-lg bg-bg-elevated/50 border border-violet-500/10 w-fit"
      >
        {TABS.map((tab) => {
          const isActive = llmProvider === tab.id;
          const isConnected = tab.id === 'anthropic' ? isClaudeConnected : isOpenrouterConnected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setLlmProvider(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
              {isConnected && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  aria-label="connected"
                />
              )}
            </button>
          );
        })}
      </div>

      {llmProvider === 'anthropic' ? (
        <ProviderCard
          config={CLAUDE_CONFIG}
          apiKey={claudeApiKey}
          keyValid={claudeKeyValid}
          isValidating={isValidatingClaude}
          setKey={setClaudeApiKey}
          validate={validateClaude}
          defaultExpanded={!claudeApiKey}
        />
      ) : (
        <ProviderCard
          config={OPENROUTER_CONFIG}
          apiKey={openrouterApiKey}
          keyValid={openrouterKeyValid}
          isValidating={isValidatingOpenrouter}
          setKey={setOpenrouterApiKey}
          validate={validateOpenrouter}
          defaultExpanded={!openrouterApiKey}
        />
      )}
    </div>
  );
}
