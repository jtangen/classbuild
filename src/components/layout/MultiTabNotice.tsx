import { useSyncExternalStore } from 'react';
import { getTabPresence, subscribeTabPresence } from './tabPresence';

/**
 * Persistent strip under the header while ClassBuild is open in more than
 * one tab, or while another tab has saved a newer copy of the course than
 * this one holds. Informs, never blocks: the reload is offered, not forced.
 */
export function MultiTabNotice() {
  const { otherTabs, otherTabSavedNewer } = useSyncExternalStore(
    subscribeTabPresence,
    getTabPresence,
    getTabPresence,
  );
  if (otherTabs === 0 && !otherTabSavedNewer) return null;

  const lead = otherTabSavedNewer
    ? 'Another ClassBuild tab has saved newer changes to this course.'
    : `ClassBuild is open in ${otherTabs === 1 ? 'another tab' : `${otherTabs} other tabs`}.`;
  const detail = otherTabSavedNewer
    ? "Reload this tab to pick them up. If you keep working here instead, this tab's next save replaces them."
    : 'Every tab saves the whole course to this browser, so each save replaces the last one. Keep working in one tab and close the others.';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--cb-status-warning-bg)',
        borderBottom: '0.5px solid var(--cb-status-warning)',
        fontFamily: 'var(--font-cb-serif)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '9px 18px',
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '6px 14px',
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--cb-text-default)',
        }}
      >
        <span style={{ flex: '1 1 320px', minWidth: 0 }}>
          <strong style={{ fontWeight: 600 }}>{lead}</strong>{' '}
          <span style={{ color: 'var(--cb-text-muted)' }}>{detail}</span>
        </span>
        {otherTabSavedNewer && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cb-mono cb-focus"
            style={{
              flexShrink: 0,
              background: 'transparent',
              border: '0.5px solid var(--cb-status-warning)',
              borderRadius: 2,
              padding: '3px 10px 4px',
              fontSize: 11.5,
              letterSpacing: '0.04em',
              color: 'var(--cb-text-default)',
              cursor: 'pointer',
            }}
          >
            Reload this tab
          </button>
        )}
      </div>
    </div>
  );
}
