import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/courseStore';

interface ResearchPanelProps {
  chapterNum: number;
  /** Right-hand side of the same status row (the chapter's material status
   *  and "Generate all" control), so the two share one line above the tabs. */
  children?: ReactNode;
}

/**
 * Slim one-line status row above the tabs: a pointer to the chapter's research
 * dossier (the full dossier lives on /research) on the left, and whatever the
 * page passes as children on the right. Wraps onto two lines when narrow.
 */
export function ResearchPanel({ chapterNum, children }: ResearchPanelProps) {
  const navigate = useNavigate();
  const { researchDossiers } = useCourseStore();
  const dossier = researchDossiers.find((d) => d.chapterNumber === chapterNum);
  const sources = dossier?.sources ?? [];

  if (sources.length === 0 && !children) return null;

  const unverifiedCount = sources.filter((s) => s.isVerified === false).length;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '8px 16px',
        flexWrap: 'wrap',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '0.5px solid var(--cb-border-subtle)',
        fontFamily: 'var(--font-cb-serif)',
      }}
    >
      {sources.length > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <span
            className="cb-italic"
            style={{
              fontSize: 13,
              color: 'var(--cb-text-muted)',
              lineHeight: 1.5,
            }}
          >
            Drafted from{' '}
            <span style={{ color: 'var(--cb-text-default)', fontStyle: 'normal' }}>
              {sources.length}
            </span>{' '}
            {sources.length === 1 ? 'cited source' : 'cited sources'}.
          </span>
          {unverifiedCount > 0 && (
            // CodexBadge's warning tone, but with the readable amber text
            // token (the badge's #b07a1f is ~2.8:1 at this size).
            <span
              className="cb-sc"
              title="AI-cited — verify this reference before teaching from it."
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                background: 'var(--cb-status-warning-bg)',
                color: 'var(--cb-status-warning-text)',
                fontSize: 12,
                letterSpacing: '0.12em',
                borderRadius: 1.5,
                whiteSpace: 'nowrap',
              }}
            >
              {unverifiedCount} unverified
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate('/research')}
            className="cb-focus pointer-coarse:min-h-11"
            style={{
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontStyle: 'italic',
              color: 'var(--cb-accent-link)',
              textDecoration: 'underline',
              textDecorationThickness: '0.5px',
              textUnderlineOffset: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {/* In-app page, so → rather than the external-link ↗. */}
            view dossier →
          </button>
        </span>
      ) : (
        <span />
      )}
      {children && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {children}
        </span>
      )}
    </div>
  );
}
