import { useNavigate, useLocation } from 'react-router-dom';
import { STAGES } from '../../types/course';
import { useCourseStore } from '../../store/courseStore';

export function StageIndicator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentStage, completedStages, chapters } = useCourseStore();
  const hasChapters = chapters.length > 0;
  // Treat the route the user is actually on as the current stage — covers
  // the case where the store still says 'landing' but the user has navigated
  // straight to /setup.
  const routeStage = STAGES.find((s) => s.path === location.pathname)?.id;
  const effectiveCurrent = routeStage ?? currentStage;
  const currentIndex = STAGES.findIndex((s) => s.id === effectiveCurrent);

  return (
    <div
      className="cb-stage-strip"
      style={{
        display: 'grid',
        // minmax(0,1fr) lets cells shrink below their label's min-content
        // width — without it the five labels force ~514px on a phone.
        gridTemplateColumns: `repeat(${STAGES.length}, minmax(0, 1fr))`,
        borderTop: '0.5px solid var(--cb-border-rule)',
        borderBottom: '0.5px solid var(--cb-border-rule)',
        background: 'var(--cb-ground-page)',
        fontFamily: 'var(--font-cb-serif)',
      }}
    >
      {STAGES.map((stage, i) => {
        const isComplete = completedStages.includes(stage.id);
        const isCurrent = stage.id === effectiveCurrent;
        const isPast = i < currentIndex;
        const isOnThisPage = location.pathname === stage.path;
        const isUnlockedByContent =
          hasChapters && (stage.id === 'build' || stage.id === 'export');
        const isClickable =
          !isOnThisPage &&
          (isComplete || isPast || isCurrent || isUnlockedByContent);

        const state: 'done' | 'current' | 'upcoming' = isCurrent
          ? 'current'
          : isComplete || isPast
          ? 'done'
          : 'upcoming';

        const labelColor =
          state === 'upcoming'
            ? 'var(--cb-text-subtle)'
            : 'var(--cb-text-default)';

        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => isClickable && navigate(stage.path)}
            disabled={!isClickable}
            className="cb-focus cb-stage-cell"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '14px 22px',
              minWidth: 0,
              borderLeft:
                i === 0 ? 'none' : '0.5px solid var(--cb-border-default)',
              background:
                state === 'current' ? 'var(--cb-accent-emphasis-quiet)' : 'transparent',
              border: 'none',
              cursor: isClickable ? 'pointer' : 'default',
              textAlign: 'left',
              transition: 'background-color 200ms cubic-bezier(0.32,0.04,0.32,1)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (isClickable && state !== 'current') {
                e.currentTarget.style.background = 'var(--cb-surface-sunken)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                state === 'current' ? 'var(--cb-accent-emphasis-quiet)' : 'transparent';
            }}
          >
            <span
              className="cb-stage-label"
              style={{
                fontSize: 15.5,
                fontWeight: state === 'current' ? 500 : 400,
                color: labelColor,
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              {state === 'done' && (
                <span
                  aria-hidden
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: 'var(--cb-accent-emphasis)',
                    color: '#fff',
                    fontSize: 9,
                    lineHeight: 1,
                    flexShrink: 0,
                    transform: 'translateY(-1px)',
                  }}
                >
                  ✓
                </span>
              )}
              {stage.label}
            </span>
            <span
              className="cb-italic cb-stage-sub"
              style={{
                fontSize: 13,
                color:
                  state === 'current'
                    ? 'var(--cb-accent-emphasis)'
                    : 'var(--cb-text-muted)',
              }}
            >
              {state === 'done'
                ? isClickable
                  ? '↵ revisit'
                  : 'done'
                : state === 'current'
                ? '— here —'
                : 'awaiting'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
