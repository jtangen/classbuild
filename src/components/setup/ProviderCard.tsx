import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProviderConfig } from './providerConfigs';

interface ProviderCardProps {
  config: ProviderConfig;
  apiKey: string;
  keyValid: boolean | null;
  isValidating: boolean;
  setKey: (key: string) => void;
  validate: () => Promise<void>;
  defaultExpanded?: boolean;
}

function maskKey(key: string): string {
  if (key.length <= 12) return '\u2022'.repeat(key.length);
  return key.slice(0, 7) + '\u2022\u2022\u2022\u2022' + key.slice(-4);
}

export function ProviderCard({
  config,
  apiKey,
  keyValid,
  isValidating,
  setKey,
  validate,
  defaultExpanded = false,
}: ProviderCardProps) {
  const [showGuide, setShowGuide] = useState(defaultExpanded);
  const [showKey, setShowKey] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const pastedRef = useRef(false);

  // Auto-validate on paste
  const handlePaste = useCallback(() => {
    pastedRef.current = true;
  }, []);

  useEffect(() => {
    if (pastedRef.current && apiKey.trim()) {
      pastedRef.current = false;
      const timer = setTimeout(() => {
        validate();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [apiKey, validate]);

  const isConnected = keyValid === true && apiKey.trim().length > 0;

  const handleDisconnect = () => {
    setKey('');
    setConfirmingDisconnect(false);
    setShowKey(false);
  };

  // Connected state
  if (isConnected) {
    return (
      <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-emerald-400 shrink-0"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm font-medium text-text-primary">
                {config.connectedHeading}
              </span>
              {config.required ? (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400">
                  Required
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-bg-hover text-text-muted">
                  Optional
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mb-2">{config.tagline}</p>
            <span className="text-xs font-mono text-text-muted">
              {maskKey(apiKey)}
            </span>
          </div>

          <div className="shrink-0">
            {!confirmingDisconnect ? (
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                className="text-xs text-text-muted hover:text-error transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs text-text-muted text-right max-w-[200px]">
                  Remove this key? You'll need to paste it again to reconnect.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDisconnect(false)}
                    className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs text-error hover:text-error/80 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="bg-bg-elevated/50 border border-violet-500/15 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <span className="text-sm font-medium text-text-primary">
          {config.heading}
        </span>
        {config.required ? (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 shrink-0">
            Required
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-bg-hover text-text-muted shrink-0">
            Optional
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-4">{config.tagline}</p>

      {/* Collapsible guide */}
      <button
        type="button"
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-violet-400 transition-colors cursor-pointer mb-3"
      >
        <motion.svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ rotate: showGuide ? 90 : 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </motion.svg>
        How to get your key
      </button>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mb-4">
              {/* Cost note */}
              <p className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">Cost:</span>{' '}
                {config.costNote}
              </p>

              {/* Numbered steps */}
              <ol className="space-y-1.5">
                {config.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-text-secondary">
                    <span className="text-violet-400 font-medium shrink-0">
                      {i + 1}.
                    </span>
                    {step.text}
                  </li>
                ))}
              </ol>

              {/* Deep link button */}
              <a
                href={config.deepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-bg-elevated hover:bg-bg-hover text-text-primary border border-violet-500/20 hover:border-violet-500/40 transition-all"
              >
                {config.deepLinkLabel}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>

              {/* Warnings */}
              {config.warnings.map((warning, i) => (
                <div
                  key={i}
                  className={`text-xs p-3 rounded-lg ${
                    warning.type === 'alert'
                      ? 'bg-amber-500/5 border border-amber-500/15 text-amber-400'
                      : 'bg-violet-500/5 border border-violet-500/10 text-text-secondary'
                  }`}
                >
                  {warning.text}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setKey(e.target.value)}
            onPaste={handlePaste}
            placeholder={config.placeholder}
            className="w-full bg-bg-elevated border border-violet-500/20 rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-violet-500/50 pr-10 transition-all font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary cursor-pointer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {showKey ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={validate}
          disabled={!apiKey.trim() || isValidating}
          className="inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-bg-elevated hover:bg-bg-hover text-text-primary border border-violet-500/20 hover:border-violet-500/40 px-3 py-1.5 text-sm"
        >
          {isValidating ? (
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            'Check'
          )}
        </button>
      </div>

      <p className="text-[11px] text-text-muted mt-2">
        Stored in your browser only. Sent directly to {config.id === 'claude' ? 'Anthropic' : config.id === 'elevenLabs' ? 'ElevenLabs' : 'Google'}.
      </p>

      {/* Validation error */}
      {keyValid === false && apiKey.trim() && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-lg bg-error/10 border border-error/20 text-error text-xs"
        >
          Connection failed. {config.validationFailHint}
        </motion.div>
      )}
    </div>
  );
}
