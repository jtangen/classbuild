import { motion, AnimatePresence } from 'framer-motion';
import { CodexButton as Button } from '../../codex';
import { downloadFile } from '../../../utils/download';
import { slugify } from '../../../utils/format';
import { renderChapterHtml } from '../../../themes';
import {
  chapterHasRefinableImages,
  withImageClickShim,
} from '../chapterImageHelpers';
import { DiscoveryHint } from '../artifactHelpers';

function formatElapsed(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export interface ReadingTabProps {
  chapterHtml: string;
  chapterNum: number;
  chapterTitle: string;
  themeId: string | undefined;

  isGenerating: boolean;
  isRefining: boolean;
  streamingText: string;
  thinkingText: string;
  elapsedSec: number;

  showImageHint: boolean;
  onDismissImageHint: () => void;

  refineFeedback: string;
  onRefineFeedbackChange: (text: string) => void;
  showRefineConfirm: boolean;
  onShowRefineConfirm: (v: boolean) => void;
  refineAutoRegen: boolean;
  onRefineAutoRegenChange: (v: boolean) => void;
  onRefine: (feedback: string) => void;
  dependents: string[];
}

export function ReadingTab(props: ReadingTabProps) {
  const {
    chapterHtml,
    chapterNum,
    chapterTitle,
    themeId,
    isGenerating,
    isRefining,
    streamingText,
    thinkingText,
    elapsedSec,
    showImageHint,
    onDismissImageHint,
    refineFeedback,
    onRefineFeedbackChange,
    showRefineConfirm,
    onShowRefineConfirm,
    refineAutoRegen,
    onRefineAutoRegenChange,
    onRefine,
    dependents,
  } = props;

  return (
    <div
      key="chapter"
      style={{
        background: 'var(--cb-ground-page)',
        border: '1px solid var(--cb-border-default)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {(isGenerating && !chapterHtml) || isRefining ? (
        <div style={{ padding: '24px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 48,
                height: 1,
                background: 'var(--cb-border-default)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'var(--cb-accent-emphasis)',
                  animation: 'cb-pen 1.4s cubic-bezier(0.32,0.04,0.32,1) infinite',
                }}
              />
            </span>
            <span
              className="cb-italic"
              style={{ fontSize: 14.5, color: 'var(--cb-text-muted)' }}
            >
              {streamingText
                ? `${isRefining ? 'Refining' : 'Drafting'} chapter ${chapterNum} · ${Math.round(streamingText.split(/\s+/).length).toLocaleString()} words · ${formatElapsed(elapsedSec)}`
                : thinkingText
                ? `${isRefining ? 'Reasoning on the revision' : 'Reasoning through the dossier'} · ${formatElapsed(elapsedSec)}`
                : `${isRefining ? 'Preparing the revision' : 'Warming up Opus'} · ${formatElapsed(elapsedSec)}`}
            </span>
          </div>
          {!streamingText && elapsedSec >= 30 && !isRefining && (
            <p
              className="cb-italic"
              style={{
                margin: '12px 0 0',
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--cb-text-muted)',
                maxWidth: '72ch',
              }}
            >
              Opus extended-thinking can take up to a minute or two before any text streams — Claude is reading the dossier, planning the chapter structure, and weaving in citations. You can click away; we'll keep going.
            </p>
          )}
          {isRefining && (
            <p
              className="cb-italic"
              style={{
                margin: '14px 0 0',
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--cb-text-muted)',
                maxWidth: '72ch',
              }}
            >
              Working through your feedback, rewriting the reading, and queuing fresh
              figures to replace the originals. Settle in — this takes several minutes.
              You can click away; we'll keep going in the background.
            </p>
          )}
          {thinkingText && (
            <div
              style={{
                marginTop: 16,
                position: 'relative',
                maxHeight: streamingText ? 120 : 220,
                overflow: 'hidden',
                transition: 'max-height 320ms ease',
              }}
            >
              <pre
                className="cb-mono"
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  lineHeight: 1.7,
                  color: 'var(--cb-text-muted)',
                  whiteSpace: 'pre-wrap',
                  maxWidth: '80ch',
                }}
              >
                {thinkingText.slice(streamingText ? -500 : -900)}
              </pre>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to bottom, transparent 30%, var(--cb-ground-page))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
        </div>
      ) : chapterHtml ? (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              padding: '12px 18px',
              background: 'var(--cb-surface-sunken)',
              borderBottom: '0.5px solid var(--cb-border-default)',
              gap: 16,
            }}
          >
            <span
              className="cb-mono"
              style={{
                fontSize: 12.5,
                color: 'var(--cb-text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              chapter-{chapterNum}.html · preview
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                downloadFile(
                  renderChapterHtml(chapterHtml, themeId, chapterTitle),
                  `chapter-${chapterNum}-${slugify(chapterTitle || 'chapter')}.html`,
                )
              }
            >
              Download .html ↓
            </Button>
          </div>
          {showImageHint && chapterHasRefinableImages(chapterHtml) && (
            <DiscoveryHint
              text="Hover any image in the chapter — click to refine just that one figure."
              onDismiss={onDismissImageHint}
            />
          )}
          <iframe
            srcDoc={withImageClickShim(
              renderChapterHtml(chapterHtml, themeId, chapterTitle),
            )}
            style={{
              width: '100%',
              height: '70vh',
              border: 0,
              display: 'block',
              background: 'var(--cb-ground-page)',
            }}
            title={`Chapter ${chapterNum} reading`}
            sandbox="allow-scripts"
          />
          {/* Refine chapter section */}
          {!isGenerating && (
            <div
              style={{
                borderTop: '0.5px solid var(--cb-border-default)',
                padding: '18px 22px',
                background: 'var(--cb-surface-sunken)',
              }}
            >
              <div
                className="cb-sc"
                style={{
                  fontSize: 11,
                  color: 'var(--cb-text-muted)',
                  letterSpacing: '0.14em',
                  marginBottom: 10,
                }}
              >
                Refine the chapter
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <textarea
                  value={refineFeedback}
                  onChange={(e) => onRefineFeedbackChange(e.target.value)}
                  placeholder="e.g. expand the section on X · simplify the introduction · add more examples for Y."
                  rows={2}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    background: 'var(--cb-ground-canvas)',
                    border: '1px solid var(--cb-border-default)',
                    borderRadius: 1.5,
                    color: 'var(--cb-text-default)',
                    fontFamily: 'var(--font-cb-serif)',
                    fontSize: 15,
                    lineHeight: 1.55,
                    resize: 'vertical',
                    outline: 'none',
                    transition: 'border-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cb-accent-link)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--cb-border-default)';
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!refineFeedback.trim()}
                  onClick={() => onShowRefineConfirm(true)}
                >
                  Refine
                </Button>
              </div>

              <AnimatePresence>
                {showRefineConfirm && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{
                      marginTop: 14,
                      padding: '14px 16px',
                      background: 'var(--cb-status-warning-bg)',
                      borderLeft: '2px solid var(--cb-status-warning)',
                    }}
                  >
                    <p
                      className="cb-italic"
                      style={{
                        margin: '0 0 8px',
                        fontSize: 13.5,
                        color: 'var(--cb-text-default)',
                        lineHeight: 1.55,
                      }}
                    >
                      {dependents.length > 0
                        ? 'Refining rewrites the chapter reading. The materials below were drafted from the current version and will be cleared:'
                        : 'Refining rewrites the chapter reading. Nothing else has been generated yet, so only the reading will change.'}
                    </p>
                    {dependents.length > 0 && (
                      <ul
                        style={{
                          margin: '0 0 14px',
                          paddingLeft: 18,
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: 'var(--cb-text-muted)',
                        }}
                      >
                        {dependents.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    )}
                    {dependents.length > 0 && (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          marginBottom: 14,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-cb-serif)',
                          fontSize: 13.5,
                          lineHeight: 1.55,
                          color: 'var(--cb-text-default)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={refineAutoRegen}
                          onChange={(e) => onRefineAutoRegenChange(e.target.checked)}
                          style={{
                            marginTop: 4,
                            accentColor: 'var(--cb-accent-emphasis)',
                            flexShrink: 0,
                          }}
                        />
                        <span>
                          Rebuild those materials automatically once the new reading is
                          ready.{' '}
                          <span
                            className="cb-italic"
                            style={{ color: 'var(--cb-text-muted)' }}
                          >
                            Recommended — otherwise the cleared tabs stay empty until
                            you regenerate each by hand.
                          </span>
                        </span>
                      </label>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" onClick={() => onRefine(refineFeedback)}>
                        Refine reading
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onShowRefineConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
