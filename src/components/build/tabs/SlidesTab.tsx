import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodexButton as Button } from '../../codex';
import type { SlideData } from '../../../types/course';
import type { SlidesRenderState } from '../../../store/uiStore';
import {
  ArtifactStatusLine,
  ArtifactEmpty,
  KeyMissingBanner,
  KeyRequiredEmpty,
  DiscoveryHint,
} from '../artifactHelpers';

export interface SlidesTabProps {
  slides: SlideData[];
  chapterNum: number;
  isGenerating: boolean;
  canGenerate: boolean;
  hasOpenAiKey: boolean;
  showImageHint: boolean;
  onDismissImageHint: () => void;
  onGenerate: () => void;
  onDownloadDeck: () => void;
  onAddKey: () => void;

  slidesRender: SlidesRenderState | null;

  // Per-slide refine state + handlers
  editedSlidePrompts: Record<number, string>;
  onSlidePromptDraftChange: (slideIndex: number, text: string) => void;
  onSlidePromptDraftReset: (slideIndex: number) => void;
  refiningSlideIdx: number | null;
  slideRefineError: string | null;
  onRefineSlide: (slideIndex: number) => void;
}

export function SlidesTab(props: SlidesTabProps) {
  const {
    slides,
    chapterNum,
    isGenerating,
    canGenerate,
    hasOpenAiKey,
    showImageHint,
    onDismissImageHint,
    onGenerate,
    onDownloadDeck,
    onAddKey,
    slidesRender,
    editedSlidePrompts,
    onSlidePromptDraftChange,
    onSlidePromptDraftReset,
    refiningSlideIdx,
    slideRefineError,
    onRefineSlide,
  } = props;

  const [expandedSlideNotes, setExpandedSlideNotes] = useState<Set<number>>(new Set());

  if (slides.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine>
          Drafting lecture slides with speaker notes…
        </ArtifactStatusLine>
      );
    }
    if (!hasOpenAiKey) {
      return (
        <KeyRequiredEmpty
          kicker="Slides"
          title="A twelve-slide deck, ready to teach"
          body="Every slide is a full-bleed 4K editorial image rendered through OpenAI's gpt-image-2 — the chapter's argument as visuals in your chosen theme, plus speaker notes. Without an OpenAI key the deck is locked: Claude can draft the slide titles, captions, and speaker notes, but the images can't be rendered and the PowerPoint export won't open."
          primaryLabel="Add OpenAI key →"
          onPrimary={onAddKey}
          secondaryLabel="Skip — draft titles and speaker notes only"
          onSecondary={onGenerate}
          secondaryDisabled={!canGenerate}
        />
      );
    }
    return (
      <ArtifactEmpty
        kicker="Slides"
        title="A twelve-slide deck, ready to teach"
        body="Every slide is a full-bleed 4K image — the chapter's argument rendered as editorial visuals in your chosen theme, with speaker notes for each slide. Downloads as a PowerPoint file you can drop straight into class."
        cta="Generate slides"
        onCta={onGenerate}
        disabled={!canGenerate}
      />
    );
  }

  const isMyRender = slidesRender?.chapterNum === chapterNum;
  const someoneElseRendering = !!slidesRender && !isMyRender;
  const renderedCount = slides.filter((s) => s.imageDataUri).length;
  const allRendered = renderedCount > 0 && renderedCount === slides.length;

  return (
    <div className="space-y-4">
      {!hasOpenAiKey && (
        <KeyMissingBanner
          tone="recommended"
          text={
            <>
              Slide titles and speaker notes are drafted, but{' '}
              <strong>each slide image and the PowerPoint export need an OpenAI key</strong>.
              Without one the deck is text-only and won't display correctly.
            </>
          }
          ctaLabel="Add OpenAI key →"
          onCta={onAddKey}
        />
      )}
      {showImageHint && (
        <DiscoveryHint
          text="Click any slide below — you can edit its image prompt and regenerate just that one slide."
          onDismiss={onDismissImageHint}
        />
      )}
      <div className="bg-cb-ground-page border border-cb-border-default rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cb-accent-emphasis-quiet flex items-center justify-center">
            <svg className="w-6 h-6 text-cb-accent-emphasis" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold">{slides.length} slides with speaker notes</p>
            <p className="text-xs text-cb-text-muted mt-0.5">Each slide rendered as a 4K editorial image via gpt-image-2</p>
          </div>
        </div>
        <Button
          disabled={!hasOpenAiKey || slidesRender !== null}
          title={
            !hasOpenAiKey
              ? 'Add an OpenAI API key in Setup to render slides.'
              : someoneElseRendering
              ? `Another deck (Class ${slidesRender!.chapterNum}) is rendering. Please wait.`
              : undefined
          }
          onClick={onDownloadDeck}
        >
          {isMyRender ? (
            slidesRender!.phase === 'packing'
              ? 'Packing deck…'
              : `Rendering ${slidesRender!.current} / ${slidesRender!.total} …`
          ) : someoneElseRendering ? (
            `Class ${slidesRender!.chapterNum} rendering · ${slidesRender!.current}/${slidesRender!.total}`
          ) : (
            <>
              <svg
                className="mr-1.5 w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {allRendered ? 'Re-download .pptx' : 'Download .pptx'}
            </>
          )}
        </Button>
      </div>

      {isMyRender && slidesRender!.phase === 'rendering' && (
        <div
          style={{
            padding: '12px 16px',
            border: '0.5px solid var(--cb-border-default)',
            background: 'var(--cb-ground-canvas)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              fontFamily: 'var(--font-cb-mono)',
              fontSize: 11.5,
              color: 'var(--cb-text-muted)',
              letterSpacing: '0.06em',
            }}
          >
            <span>rendering slide images · gpt-image-2 · 4K</span>
            <span>{slidesRender!.current} of {slidesRender!.total}</span>
          </div>
          <div style={{ height: 2, background: 'var(--cb-border-default)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(slidesRender!.current / Math.max(1, slidesRender!.total)) * 100}%`,
                background: 'var(--cb-accent-emphasis)',
                transition: 'width 320ms cubic-bezier(0.32,0.04,0.32,1)',
              }}
            />
          </div>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-cb-text-muted uppercase tracking-wider mb-3">Speaker Notes</h3>
        <div className="space-y-1">
          {slides.map((slide, i) => {
            const isExpanded = expandedSlideNotes.has(i);
            const hasNotes = !!slide.speakerNotes;
            return (
              <div key={i} className="border border-cb-border-default rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (!hasNotes) return;
                    setExpandedSlideNotes((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-transparent border-0 transition-colors ${
                    hasNotes ? 'cursor-pointer hover:bg-cb-accent-emphasis-quiet' : 'cursor-default opacity-60'
                  }`}
                >
                  <span className="text-xs text-cb-text-muted font-mono w-5 shrink-0 text-right">{i + 1}</span>
                  <span className="text-sm text-cb-text-default truncate flex-1">{slide.title}</span>
                  {slide.imageDataUri && (
                    <span className="text-[10px] text-cb-status-success uppercase tracking-wider shrink-0">rendered</span>
                  )}
                  {hasNotes && (
                    <svg
                      className={`w-3.5 h-3.5 text-cb-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && hasNotes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pl-12">
                        <p className="text-sm text-cb-text-default leading-relaxed whitespace-pre-line">{slide.speakerNotes}</p>
                        <SlideImageRefine
                          slide={slide}
                          slideIndex={i}
                          draft={editedSlidePrompts[i]}
                          onDraftChange={(text) => onSlidePromptDraftChange(i, text)}
                          onResetDraft={() => onSlidePromptDraftReset(i)}
                          onRefine={() => onRefineSlide(i)}
                          isRefining={refiningSlideIdx === i}
                          anyRefining={refiningSlideIdx !== null}
                          hasOpenAiKey={hasOpenAiKey}
                          error={refiningSlideIdx === i ? slideRefineError : null}
                          onAddKey={onAddKey}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SlideImageRefine ─────────────────────────────────────────────────
//
// Refine one slide's image prompt. Used inside the expanded slide row.

function SlideImageRefine({
  slide,
  slideIndex,
  draft,
  onDraftChange,
  onResetDraft,
  onRefine,
  isRefining,
  anyRefining,
  hasOpenAiKey,
  error,
  onAddKey,
}: {
  slide: SlideData;
  slideIndex: number;
  draft: string | undefined;
  onDraftChange: (text: string) => void;
  onResetDraft: () => void;
  onRefine: () => void;
  isRefining: boolean;
  anyRefining: boolean;
  hasOpenAiKey: boolean;
  error: string | null;
  onAddKey: () => void;
}) {
  const currentPrompt = slide.imagePrompt ?? '';
  const value = draft ?? currentPrompt;
  const hasEdit = draft !== undefined && draft !== currentPrompt;
  const trimmed = value.trim();

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '0.5px solid var(--cb-border-default)',
        display: 'grid',
        gridTemplateColumns: slide.imageDataUri ? '180px 1fr' : '1fr',
        gap: 16,
        alignItems: 'start',
      }}
    >
      {slide.imageDataUri && (
        <div>
          <div
            className="cb-sc"
            style={{
              fontSize: 10,
              color: 'var(--cb-text-muted)',
              letterSpacing: '0.14em',
              marginBottom: 6,
            }}
          >
            Slide {slideIndex + 1}
          </div>
          <img
            src={slide.imageDataUri}
            alt={`Slide ${slideIndex + 1} preview`}
            style={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              borderRadius: 2,
              border: '0.5px solid var(--cb-border-default)',
              display: 'block',
              opacity: isRefining ? 0.45 : 1,
              transition: 'opacity 220ms',
            }}
          />
        </div>
      )}

      <div style={{ minWidth: 0 }}>
        <div
          className="cb-sc"
          style={{
            fontSize: 10,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.14em',
            marginBottom: 6,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <span>
            {hasOpenAiKey
              ? 'Image prompt — refine this one slide'
              : 'Image prompt — view only'}
          </span>
          {hasOpenAiKey && hasEdit && !isRefining && (
            <button
              type="button"
              onClick={onResetDraft}
              className="cb-italic"
              style={{
                background: 'none',
                border: 0,
                cursor: 'pointer',
                padding: 0,
                fontSize: 11.5,
                color: 'var(--cb-text-muted)',
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              ← reset
            </button>
          )}
        </div>
        <textarea
          value={value}
          onChange={(e) => onDraftChange(e.target.value)}
          readOnly={!hasOpenAiKey}
          disabled={isRefining}
          rows={5}
          spellCheck={false}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontFamily: 'var(--font-cb-mono)',
            fontSize: 12.5,
            lineHeight: 1.55,
            background: 'var(--cb-ground-page)',
            border: '0.5px solid var(--cb-border-default)',
            borderRadius: 2,
            color: 'var(--cb-text-default)',
            resize: 'vertical',
            outline: 'none',
            opacity: isRefining ? 0.6 : !hasOpenAiKey ? 0.85 : 1,
            cursor: !hasOpenAiKey ? 'default' : undefined,
          }}
        />
        {!hasOpenAiKey && (
          <p
            className="cb-italic"
            style={{
              margin: '8px 0 0',
              fontSize: 12,
              color: 'var(--cb-text-muted)',
              lineHeight: 1.5,
            }}
          >
            Add an OpenAI key to edit this prompt and regenerate just this slide.
          </p>
        )}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            alignItems: 'baseline',
            flexWrap: 'wrap',
          }}
        >
          {!hasOpenAiKey ? (
            <Button size="sm" variant="primary" onClick={onAddKey}>
              Add OpenAI key →
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onRefine}
              disabled={!trimmed || isRefining || anyRefining}
              title={
                !trimmed
                  ? 'Prompt is empty.'
                  : anyRefining && !isRefining
                  ? 'Another slide is regenerating. Please wait.'
                  : undefined
              }
            >
              {isRefining ? 'Rendering…' : slide.imageDataUri ? 'Regenerate image ↻' : 'Render image →'}
            </Button>
          )}
          {isRefining && (
            <span
              className="cb-italic"
              style={{ fontSize: 12.5, color: 'var(--cb-text-muted)' }}
            >
              gpt-image-2 typically takes 30–60 seconds.
            </span>
          )}
        </div>
        {error && (
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12.5,
              color: 'var(--cb-status-danger)',
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
