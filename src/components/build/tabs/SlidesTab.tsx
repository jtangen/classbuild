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
import { ArtifactShell } from '../ArtifactShell';

export interface SlidesTabProps {
  slides: SlideData[];
  chapterNum: number;
  isGenerating: boolean;
  canGenerate: boolean;
  hasOpenAiKey: boolean;
  showImageHint: boolean;
  onDismissImageHint: () => void;
  onGenerate: () => void;
  /** Cancels the in-flight generation this tab reports on. */
  onStop: () => void;
  onDownloadDeck: () => void;
  onAddKey: () => void;

  slidesRender: SlidesRenderState | null;

  // Per-slide refine state + handlers
  editedSlidePrompts: Record<number, string>;
  onSlidePromptDraftChange: (slideIndex: number, text: string) => void;
  onSlidePromptDraftReset: (slideIndex: number) => void;
  /** Slide of *this* deck currently rendering, if any. */
  refiningSlideIdx: number | null;
  /** A slide in another chapter's deck is rendering (single render at a time). */
  slideRefineBusyElsewhere?: boolean;
  /** Last refine failure in this deck, tied to its slide. */
  slideRefineError: { idx: number; message: string } | null;
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
    onStop,
    onDownloadDeck,
    onAddKey,
    slidesRender,
    editedSlidePrompts,
    onSlidePromptDraftChange,
    onSlidePromptDraftReset,
    refiningSlideIdx,
    slideRefineBusyElsewhere,
    slideRefineError,
    onRefineSlide,
  } = props;

  const [expandedSlideNotes, setExpandedSlideNotes] = useState<Set<number>>(new Set());

  if (slides.length === 0) {
    if (isGenerating) {
      return (
        <ArtifactStatusLine onStop={onStop}>
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

  const showSessionNote = hasOpenAiKey && !slidesRender && renderedCount < slides.length;
  const showRenderProgress = isMyRender && slidesRender!.phase === 'rendering';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
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
      <ArtifactShell
        kicker="Slides"
        title={`${slides.length} slides with speaker notes`}
        meta="Each slide renders as a 4K editorial image through gpt-image-2."
        actions={
          <Button
            size="sm"
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
            {isMyRender
              ? slidesRender!.phase === 'packing'
                ? 'Packing deck…'
                : `Rendering ${slidesRender!.current} / ${slidesRender!.total} …`
              : someoneElseRendering
              ? `Class ${slidesRender!.chapterNum} rendering · ${slidesRender!.current}/${slidesRender!.total}`
              : allRendered
              ? 'Re-download .pptx ↓'
              : 'Download .pptx ↓'}
          </Button>
        }
        bodyless
      >
        {(showSessionNote || showRenderProgress) && (
          <div style={{ padding: '14px 20px 0' }}>
            {showSessionNote && (
              <p
                className="cb-italic"
                style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--cb-text-muted)' }}
              >
                {renderedCount === 0
                  ? `No slide images in this session — rendered images aren't kept across reloads (titles, notes, and image prompts are). Downloading the deck renders all ${slides.length} images on your OpenAI key, ≈ 30–60s each.`
                  : `${renderedCount} of ${slides.length} slide images are rendered in this session — downloading the deck renders the rest on your OpenAI key.`}
              </p>
            )}
            {showRenderProgress && (
              <div
                style={{
                  padding: '12px 16px',
                  border: '0.5px solid var(--cb-border-default)',
                  background: 'var(--cb-ground-canvas)',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  className="cb-mono"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
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
          </div>
        )}

        <div style={{ padding: '14px 20px 18px' }}>
          <div
            className="cb-sc"
            style={{ fontSize: 11.5, letterSpacing: '0.12em', color: 'var(--cb-text-muted)', marginBottom: 8 }}
          >
            Speaker notes
          </div>
          <ol
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              border: '0.5px solid var(--cb-border-default)',
              borderRadius: 2,
            }}
          >
          {slides.map((slide, i) => {
            const isExpanded = expandedSlideNotes.has(i);
            const hasNotes = !!slide.speakerNotes;
            return (
              <li key={i} style={{ borderTop: i === 0 ? 'none' : '0.5px solid var(--cb-border-default)' }}>
                <button
                  type="button"
                  disabled={!hasNotes}
                  aria-expanded={hasNotes ? isExpanded : undefined}
                  onClick={() => {
                    if (!hasNotes) return;
                    setExpandedSlideNotes((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                  className="cb-focus"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 0,
                    fontFamily: 'inherit',
                    color: 'var(--cb-text-default)',
                    cursor: hasNotes ? 'pointer' : 'default',
                    opacity: hasNotes ? 1 : 0.6,
                    transition: 'background-color 160ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (hasNotes) e.currentTarget.style.background = 'var(--cb-accent-emphasis-quiet)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span
                    className="cb-mono"
                    style={{ fontSize: 12, color: 'var(--cb-text-muted)', width: 20, textAlign: 'right', flexShrink: 0 }}
                  >
                    {i + 1}
                  </span>
                  <span
                    aria-hidden
                    style={{
                      width: 44,
                      height: 25,
                      flexShrink: 0,
                      border: '0.5px solid var(--cb-border-default)',
                      borderRadius: 2,
                      overflow: 'hidden',
                      background: 'var(--cb-surface-sunken)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {slide.imageDataUri ? (
                      <img src={slide.imageDataUri} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ display: 'block', width: 20, height: 1, background: 'var(--cb-border-default)' }} />
                    )}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 14.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {slide.title}
                  </span>
                  {hasNotes && (
                    <svg
                      aria-hidden
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        color: 'var(--cb-text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 160ms ease',
                      }}
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
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="pl-3.5 sm:pl-[46px]" style={{ paddingTop: 2, paddingRight: 14, paddingBottom: 16 }}>
                        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                          {slide.speakerNotes}
                        </p>
                        <SlideImageRefine
                          slide={slide}
                          slideIndex={i}
                          draft={editedSlidePrompts[i]}
                          onDraftChange={(text) => onSlidePromptDraftChange(i, text)}
                          onResetDraft={() => onSlidePromptDraftReset(i)}
                          onRefine={() => onRefineSlide(i)}
                          isRefining={refiningSlideIdx === i}
                          anyRefining={refiningSlideIdx !== null || !!slideRefineBusyElsewhere}
                          hasOpenAiKey={hasOpenAiKey}
                          // Keyed by slide, not by "is rendering": the render
                          // has finished by the time its error exists.
                          error={slideRefineError?.idx === i ? slideRefineError.message : null}
                          onAddKey={onAddKey}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
          </ol>
        </div>
      </ArtifactShell>
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
  // Guarded: a malformed reply can carry a non-string here, and .trim() below would throw.
  const currentPrompt = typeof slide.imagePrompt === 'string' ? slide.imagePrompt : '';
  const value = draft ?? currentPrompt;
  const hasEdit = draft !== undefined && draft !== currentPrompt;
  const trimmed = value.trim();

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '0.5px solid var(--cb-border-default)',
        // Thumbnail beside the prompt when there's room; stacked on a phone.
        display: 'grid',
        gridTemplateColumns: slide.imageDataUri ? 'repeat(auto-fit, minmax(180px, 1fr))' : '1fr',
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
