import { useCallback, useEffect, useRef } from 'react';
import { useApiStore } from '../../store/apiStore';
import { MODELS } from '../../services/claude/client';
import { ProviderCard } from './ProviderCard';
import { CLAUDE_CONFIG, ELEVENLABS_CONFIG, GEMINI_CONFIG } from './providerConfigs';

export function ApiKeyPanel() {
  const {
    claudeApiKey, elevenLabsApiKey, geminiApiKey,
    claudeKeyValid, elevenLabsKeyValid, geminiKeyValid,
    isValidatingClaude, isValidatingElevenLabs, isValidatingGemini,
    setClaudeApiKey, setElevenLabsApiKey, setGeminiApiKey,
    setClaudeKeyValid, setElevenLabsKeyValid, setGeminiKeyValid,
    setIsValidatingClaude, setIsValidatingElevenLabs, setIsValidatingGemini,
  } = useApiStore();

  const validateClaude = useCallback(async () => {
    if (!claudeApiKey.trim()) return;
    setIsValidatingClaude(true);
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({
        apiKey: claudeApiKey.trim(),
        dangerouslyAllowBrowser: true,
      });
      await client.messages.create({
        model: MODELS.haiku,
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

  const validateElevenLabs = useCallback(async () => {
    if (!elevenLabsApiKey.trim()) return;
    setIsValidatingElevenLabs(true);
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': elevenLabsApiKey.trim() },
      });
      setElevenLabsKeyValid(res.ok);
    } catch {
      setElevenLabsKeyValid(false);
    } finally {
      setIsValidatingElevenLabs(false);
    }
  }, [elevenLabsApiKey, setElevenLabsKeyValid, setIsValidatingElevenLabs]);

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
    if (elevenLabsApiKey.trim() && elevenLabsKeyValid === null) validateElevenLabs();
    if (geminiApiKey.trim() && geminiKeyValid === null) validateGemini();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-text-primary">
        Connect Your Services
      </h3>
      <p className="text-xs text-text-muted">
        ClassBuild talks directly to these services from your browser. Your keys never leave your device.
      </p>
      <ProviderCard
        config={CLAUDE_CONFIG}
        apiKey={claudeApiKey}
        keyValid={claudeKeyValid}
        isValidating={isValidatingClaude}
        setKey={setClaudeApiKey}
        validate={validateClaude}
        defaultExpanded={!claudeApiKey}
      />
      <ProviderCard
        config={ELEVENLABS_CONFIG}
        apiKey={elevenLabsApiKey}
        keyValid={elevenLabsKeyValid}
        isValidating={isValidatingElevenLabs}
        setKey={setElevenLabsApiKey}
        validate={validateElevenLabs}
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
