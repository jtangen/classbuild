import { useNavigate } from 'react-router-dom';
import { useCourseStore } from '../../store/courseStore';

interface ResearchPanelProps {
  chapterNum: number;
}

/**
 * Slim one-line reference to the research dossier for this chapter. The
 * full dossier lives on /research — this is just a pointer.
 */
export function ResearchPanel({ chapterNum }: ResearchPanelProps) {
  const navigate = useNavigate();
  const { researchDossiers } = useCourseStore();
  const dossier = researchDossiers.find((d) => d.chapterNumber === chapterNum);

  if (!dossier || dossier.sources.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 14,
        marginBottom: 18,
        paddingBottom: 12,
        borderBottom: '0.5px solid var(--cb-border-subtle)',
        fontFamily: 'var(--font-cb-serif)',
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
          {dossier.sources.length}
        </span>{' '}
        {dossier.sources.length === 1 ? 'cited source' : 'cited sources'}.
      </span>
      <button
        type="button"
        onClick={() => navigate('/research')}
        className="cb-focus"
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
        }}
      >
        view dossier ↗
      </button>
    </div>
  );
}
