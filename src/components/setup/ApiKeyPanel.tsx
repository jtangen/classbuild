import { useCallback, useEffect, useRef } from 'react';
import { useApiStore } from '../../store/apiStore';
import { getClient, MODELS, resolveModel } from '../../services/claude/client';
import { ProviderCard } from './ProviderCard';
import { LlmProviderCard } from './LlmProviderCard';
import { GEMINI_CONFIG } from './providerConfigs';

export function ApiKeyPanel() {
  const {
    claudeApiKey, openrouterApiKey, geminiApiKey,
    claudeKeyValid, openrouterKeyValid, geminiKeyValid,
    isValidatingGemini,
    setGeminiApiKey,
    setClaudeKeyValid, setOpenrouterKeyValid, setGeminiKeyValid,
    setIsValidatingClaude, setIsValidatingOpenrouter, setIsValidatingGemini,
  } = useApiStore();

  const validateClaude = useCallback(async () => {
    if (!claudeApiKey.trim()) return;
    setIsValidatingClaude(true);
    try {
      const client = getClient(claudeApiKey.trim(), 'anthropic');
      await client.messages.create({
        model: resolveModel(MODELS.haiku, 'anthropic'),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      setClaudeKeyValid(true);
    } catch {
      setClaudeKeyValid(false);
    } finally {
      setIsValidatingClaude(false);
    }
  }, [claudeApiKey, setClaudeKeyValid, setIsValidatingClaude]);

  const validateOpenrouter = useCallback(async () => {
    if (!openrouterApiKey.trim()) return;
    setIsValidatingOpenrouter(true);
    try {
      const client = getClient(openrouterApiKey.trim(), 'openrouter');
      await client.messages.create({
        model: resolveModel(MODELS.haiku, 'openrouter'),
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      setOpenrouterKeyValid(true);
    } catch {
      setOpenrouterKeyValid(false);
    } finally {
      setIsValidatingOpenrouter(false);
    }
  }, [openrouterApiKey, setOpenrouterKeyValid, setIsValidatingOpenrouter]);

  const validateGemini = useCallback(async () => {
    if (!geminiApiKey.trim()) return;
    setIsValidatingGemini(true);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey.trim()}`,
      );
      setGeminiKeyValid(res.ok);
    } catch {
      setGeminiKeyValid(false);
    } finally {
      setIsValidatingGemini(false);
    }
  }, [geminiApiKey, setGeminiKeyValid, setIsValidatingGemini]);

  // Auto-validate stored keys on mount
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    if (claudeApiKey.trim() && claudeKeyValid === null) validateClaude();
    if (openrouterApiKey.trim() && openrouterKeyValid === null) validateOpenrouter();
    if (geminiApiKey.trim() && geminiKeyValid === null) validateGemini();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-text-primary">
        Connect Your Services
      </h3>
      <div className="flex items-start gap-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15 px-3.5 py-3">
        <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div>
          <p className="text-xs font-medium text-emerald-400 mb-0.5">Your keys never leave your computer</p>
          <p className="text-xs text-text-muted leading-relaxed">
            ClassBuild has no server and no accounts. Everything happens right here in your browser — we never see, store, or have access to your keys.
          </p>
        </div>
      </div>
      <LlmProviderCard
        validateClaude={validateClaude}
        validateOpenrouter={validateOpenrouter}
      />
      <ProviderCard
        config={GEMINI_CONFIG}
        apiKey={geminiApiKey}
        keyValid={geminiKeyValid}
        isValidating={isValidatingGemini}
        setKey={setGeminiApiKey}
        validate={validateGemini}
      />
    </div>
  );
}
