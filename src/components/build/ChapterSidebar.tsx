import { useCourseStore } from '../../store/courseStore';

interface ChapterSidebarProps {
  selectedChapterNum: number;
  onSelectChapter: (num: number) => void;
  disabled: boolean;
  batchCurrentChapter: number | null;
}

const ROMAN_UPPER = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
];

interface MaterialCount {
  ready: number;
  total: number;
}

function countReady(
  ch: {
    htmlContent: string;
    practiceQuizData?: string;
    inClassQuizData?: unknown[];
    weeklyChallengeData?: unknown;
    discussionData?: unknown[];
    activityData?: unknown[];
    audioTranscript?: string;
    slidesJson?: unknown[];
  },
): MaterialCount {
  let count = 0;
  if (ch.htmlContent) count++;
  if (ch.practiceQuizData) count++;
  if (ch.inClassQuizData && ch.inClassQuizData.length > 0) count++;
  if (ch.weeklyChallengeData) count++;
  if (ch.discussionData && ch.discussionData.length > 0) count++;
  if (ch.activityData && ch.activityData.length > 0) count++;
  if (ch.audioTranscript) count++;
  if (ch.slidesJson && ch.slidesJson.length > 0) count++;
  return { ready: count, total: 8 };
}

export function ChapterSidebar({
  selectedChapterNum,
  onSelectChapter,
  disabled,
  batchCurrentChapter,
}: ChapterSidebarProps) {
  const { syllabus, chapters, researchDossiers } = useCourseStore();

  if (!syllabus) return null;

  return (
    <aside
      data-build-sidebar
      style={{
        width: 280,
        flexShrink: 0,
        overflowY: 'auto',
        borderRight: '0.5px solid var(--cb-border-default)',
        background: 'var(--cb-surface-sunken)',
        fontFamily: 'var(--font-cb-serif)',
      }}
    >
      <div
        style={{
          padding: '20px 18px 12px',
          borderBottom: '0.5px solid var(--cb-border-default)',
        }}
      >
        <div
          className="cb-sc"
          style={{
            fontSize: 13,
            color: 'var(--cb-text-muted)',
            letterSpacing: '0.14em',
          }}
        >
          Chapters
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {syllabus.chapters.map((ch, idx) => {
          const generated = chapters.find((c) => c.number === ch.number);
          const dossier = researchDossiers.find(
            (d) => d.chapterNumber === ch.number,
          );
          const counts = generated
            ? countReady(generated)
            : { ready: 0, total: 8 };
          const isSelected = ch.number === selectedChapterNum;
          const isBatchCurrent = batchCurrentChapter === ch.number;
          const fullyReady = counts.ready === counts.total && counts.ready > 0;
          const roman = ROMAN_UPPER[idx] ?? String(ch.number);

          return (
            <button
              key={ch.number}
              type="button"
              onClick={() => !disabled && onSelectChapter(ch.number)}
              disabled={disabled}
              className="cb-focus"
              style={{
                position: 'relative',
                textAlign: 'left',
                padding: '14px 16px 14px 18px',
                background: isSelected
                  ? 'var(--cb-accent-emphasis-quiet)'
                  : 'transparent',
                border: 'none',
                borderTop:
                  idx === 0
                    ? 'none'
                    : '0.5px solid var(--cb-border-subtle)',
                cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'inherit',
                color: 'var(--cb-text-default)',
                transition:
                  'background-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
              }}
            >
              {/* Selected left rule */}
              {isSelected && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    background: 'var(--cb-accent-emphasis)',
                  }}
                />
              )}

              {/* Roman + title row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '32px 1fr',
                  alignItems: 'baseline',
                  gap: 10,
                }}
              >
                <span
                  className="cb-italic"
                  style={{
                    fontSize: 17,
                    color: fullyReady
                      ? 'var(--cb-accent-emphasis)'
                      : counts.ready > 0
                      ? 'var(--cb-accent-emphasis)'
                      : 'var(--cb-text-subtle)',
                    lineHeight: 1,
                  }}
                >
                  {roman}
                </span>
                <span
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.3,
                    color: 'var(--cb-text-default)',
                    fontWeight: isSelected ? 500 : 400,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {ch.title}
                </span>
              </div>

              {/* Single status line — one status per card. */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  marginTop: 6,
                  paddingLeft: 42,
                }}
              >
                {isBatchCurrent ? (
                  <>
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        width: 28,
                        height: 1,
                        background: 'var(--cb-border-default)',
                        position: 'relative',
                        overflow: 'hidden',
                        verticalAlign: 'middle',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'var(--cb-accent-emphasis)',
                          animation:
                            'cb-pen 1.4s cubic-bezier(0.32,0.04,0.32,1) infinite',
                        }}
                      />
                    </span>
                    <span
                      className="cb-italic"
                      style={{
                        fontSize: 12.5,
                        color: 'var(--cb-accent-emphasis)',
                      }}
                    >
                      drafting
                    </span>
                  </>
                ) : fullyReady ? (
                  <span
                    className="cb-italic"
                    style={{ fontSize: 12.5, color: 'var(--cb-text-muted)' }}
                  >
                    — complete
                  </span>
                ) : counts.ready > 0 ? (
                  <span
                    className="cb-mono"
                    style={{
                      fontSize: 12,
                      color: 'var(--cb-accent-emphasis)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {counts.ready} of {counts.total} built
                  </span>
                ) : (
                  <span
                    className="cb-italic"
                    style={{ fontSize: 12.5, color: 'var(--cb-text-muted)' }}
                  >
                    awaiting
                  </span>
                )}
                {dossier && dossier.sources.length > 0 && counts.ready === 0 && (
                  <span
                    className="cb-italic"
                    style={{
                      fontSize: 12,
                      color: 'var(--cb-text-subtle)',
                    }}
                  >
                    · {dossier.sources.length}{' '}
                    {dossier.sources.length === 1 ? 'source' : 'sources'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
