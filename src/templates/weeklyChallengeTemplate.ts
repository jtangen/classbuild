/**
 * Weekly Challenge HTML Template Generator
 *
 * Generates a complete, self-contained HTML weekly challenge with:
 * - 6 question types: MCQ, two-stage, assertion-reason, agreement-matrix,
 *   confidence-weighted, slider-estimation (+ boss variant of two-stage)
 * - Session flow: warm-up -> core -> challenge -> boss
 * - Mastery threshold (85%), unlimited retakes
 * - SCORM 2004 wrapper for Blackboard grade reporting
 * - Game-like animations, confetti, and polish
 * - Theme integration via CSS variables
 */
import { getTheme } from '../themes';
import type { WeeklyChallengeData } from '../types/course';

export function buildWeeklyChallengeHtml(
  challengeTitle: string,
  challengeData: WeeklyChallengeData,
  courseTitle: string,
  themeId?: string,
): string {
  const t = getTheme(themeId);

  // ── Build-time answer obfuscation ──
  // Strip answer fields from questions and encode them so they don't appear
  // as plaintext in the HTML source. The JS runtime decodes them.
  const xorKey = 'wc' + (challengeData.metadata?.weekNumber || 1);
  function obf(val: string | number): string {
    const s = String(val);
    let out = '';
    for (let i = 0; i < s.length; i++) {
      // Mask to a byte so this matches Buffer's latin1 truncation (used by the
      // Node CLI) and so btoa() — which rejects code points > 0xFF — is safe.
      out += String.fromCharCode((s.charCodeAt(i) ^ xorKey.charCodeAt(i % xorKey.length)) & 0xff);
    }
    // btoa, NOT Buffer: this template renders in the BROWSER (Build page) as
    // well as the Node CLI, and `Buffer` is undefined in the browser — the
    // ReferenceError was swallowed, so the in-browser challenge (and its SCORM
    // export) silently never rendered. btoa works in both (browser global;
    // Node >= 16) and the runtime decoder already uses atob.
    return btoa(out);
  }

  // Deep clone and strip answers
  const sanitised = JSON.parse(JSON.stringify(challengeData)) as WeeklyChallengeData;
  for (const q of (sanitised.questions || [])) {
    // Strip answer fields from variants too
    const allVersions = [q, ...(q.variants || []) as Record<string, unknown>[]];
    for (const v of allVersions) {
      if ('correctIndex' in v) {
        (v as Record<string, unknown>)._oCI = obf(v.correctIndex as number);
        delete v.correctIndex;
      }
      if ('correctJustificationIndex' in v) {
        (v as Record<string, unknown>)._oJI = obf(v.correctJustificationIndex as number);
        delete v.correctJustificationIndex;
      }
      if ('correctRelationship' in v) {
        (v as Record<string, unknown>)._oCR = obf(v.correctRelationship as string);
        delete v.correctRelationship;
      }
      if ('correctValue' in v) {
        (v as Record<string, unknown>)._oCV = obf(v.correctValue as number);
        delete v.correctValue;
      }
      if ('acceptableRange' in v) {
        (v as Record<string, unknown>)._oAR = obf(JSON.stringify(v.acceptableRange));
        delete v.acceptableRange;
      }
      if ('statements' in v && Array.isArray(v.statements)) {
        v.statements = (v.statements as Array<{ text: string; correct: string }>).map(
          s => ({ text: s.text, _oC: obf(s.correct) })
        );
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${challengeTitle}</title>
    <style>
        /* ─── Timing Constants (CSS) ─── */
        :root {
            --advance-delay: 800ms;
            --celebration-duration: 1800ms;
            --slide-duration: 400ms;
            --shake-duration: 400ms;
            --boss-intro-duration: 2000ms;

            /* Theme */
            --accent: ${t.accent};
            --accent-light: ${t.accentLight};
            --warm-accent: ${t.warmAccent};
            --bg-page: ${t.pageBg};
            --bg-card: ${t.cardBg};
            --bg-elevated: ${t.elevated};
            --text-primary: ${t.textPrimary};
            --text-secondary: ${t.textSecondary};
            --text-muted: ${t.textMuted};
            --success: ${t.success};
            --error: #ef4444;
            --gold: #f59e0b;
            --blue: #3b82f6;
            --on-accent: ${t.isDark ? '#1a1a2e' : '#ffffff'};
            --shadow: 0 4px 12px rgba(0, 0, 0, ${t.isDark ? '0.4' : '0.15'});
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, ${t.isDark ? '0.5' : '0.18'});

            --font-heading: ${t.headingFont};
            --font-body: ${t.bodyFont};

            /* Tier colors */
            --tier-warmup: var(--blue);
            --tier-core: var(--accent);
            --tier-challenge: var(--gold);
            --tier-boss: var(--warm-accent);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: var(--font-body);
            line-height: 1.6;
            color: var(--text-primary);
            background-color: var(--bg-page);
            padding: 20px;
            min-height: 100vh;
            font-size: 16px;
        }

        .container {
            max-width: 720px;
            margin: 0 auto;
            position: relative;
        }

        .hidden { display: none !important; }

        /* ─── Welcome Screen ─── */
        .welcome-card {
            background: var(--bg-card);
            border-radius: 16px;
            box-shadow: var(--shadow);
            padding: 48px 40px;
            text-align: center;
            animation: fadeIn 0.5s ease;
        }

        .welcome-card h1 {
            font-family: var(--font-heading);
            font-size: 28px;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .welcome-card .subtitle {
            color: var(--text-secondary);
            font-size: 15px;
            margin-bottom: 32px;
        }

        .welcome-stats {
            display: flex;
            justify-content: center;
            gap: 32px;
            margin-bottom: 32px;
        }

        .welcome-stat {
            text-align: center;
            background: var(--bg-elevated);
            border-radius: 12px;
            padding: 16px 20px;
            min-width: 90px;
        }

        .welcome-stat .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--accent);
        }

        .welcome-stat .stat-label {
            font-size: 13px;
            color: var(--text-muted);
        }

        .welcome-rules {
            background: var(--bg-elevated);
            border-radius: 12px;
            padding: 20px 24px;
            text-align: left;
            margin-bottom: 32px;
        }

        .welcome-rules h3 {
            font-family: var(--font-heading);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 12px;
        }

        .welcome-rules ul {
            list-style: none;
            padding: 0;
        }

        .welcome-rules li {
            padding: 4px 0;
            font-size: 14px;
            color: var(--text-secondary);
        }

        .welcome-rules li::before {
            content: '';
            display: inline-block;
            width: 6px;
            height: 6px;
            background: var(--accent);
            border-radius: 50%;
            margin-right: 10px;
            vertical-align: middle;
        }

        /* ─── Buttons ─── */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 14px 32px;
            border-radius: 12px;
            border: none;
            font-size: 16px;
            font-weight: 600;
            font-family: var(--font-heading);
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            outline: none;
        }

        .btn:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 2px;
        }

        .btn-primary {
            background: var(--accent);
            color: var(--on-accent);
            border-bottom: 4px solid ${t.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'};
        }

        .btn-primary:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
        }

        .btn-primary:active {
            border-bottom-width: 0;
            transform: translateY(3px);
        }

        .btn-primary:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            transform: none;
            filter: none;
        }

        .btn-secondary {
            background: var(--bg-elevated);
            color: var(--text-primary);
            border: 1px solid ${t.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        }

        .btn-secondary:hover {
            background: var(--accent);
            color: var(--on-accent);
        }

        /* ─── Question Screen ─── */
        .question-screen {
            animation: fadeIn 0.3s ease;
        }

        .progress-header {
            background: var(--bg-card);
            border-radius: 16px 16px 0 0;
            padding: 18px 24px 14px;
            box-shadow: var(--shadow);
        }

        .progress-top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .question-counter {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-muted);
            letter-spacing: 0.01em;
        }

        .score-display {
            font-size: 13px;
            font-weight: 700;
            color: var(--accent);
            background: ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(30,58,95,0.06)'};
            padding: 3px 12px;
            border-radius: 999px;
        }

        .score-display .points {
            font-size: 16px;
        }

        /* Progress bar with segments */
        .progress-bar {
            display: flex;
            gap: 2px;
            height: 6px;
        }

        .progress-segment {
            flex: 1;
            border-radius: 3px;
            background: var(--bg-elevated);
            transition: background 0.4s ease, box-shadow 0.4s ease;
            position: relative;
        }

        .progress-segment.active {
            animation: progressPulse 2s ease-in-out infinite;
            box-shadow: 0 0 6px ${t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(30,58,95,0.2)'};
        }

        .progress-segment.correct { background: var(--success); }
        .progress-segment.incorrect { background: var(--error); opacity: 0.6; }
        .progress-segment.skipped { background: var(--text-muted); opacity: 0.3; }

        .progress-segment[data-tier="warmup"].active { box-shadow: 0 0 8px var(--tier-warmup); }
        .progress-segment[data-tier="core"].active { box-shadow: 0 0 8px var(--tier-core); }
        .progress-segment[data-tier="challenge"].active { box-shadow: 0 0 8px var(--tier-challenge); }
        .progress-segment[data-tier="boss"].active { box-shadow: 0 0 8px var(--tier-boss); }

        .tier-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin-top: 8px;
        }

        .tier-badge[data-tier="warmup"] { background: rgba(59,130,246,0.15); color: var(--tier-warmup); }
        .tier-badge[data-tier="core"] { background: ${t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(30,58,95,0.1)'}; color: var(--tier-core); }
        .tier-badge[data-tier="challenge"] { background: rgba(245,158,11,0.15); color: var(--tier-challenge); }
        .tier-badge[data-tier="boss"] { background: rgba(245,158,11,0.2); color: var(--tier-boss); }

        .question-body {
            background: var(--bg-card);
            border-radius: 0 0 16px 16px;
            padding: 24px;
            box-shadow: var(--shadow);
            margin-bottom: 20px;
        }

        #question-area {
            animation: slideIn var(--slide-duration) ease;
        }

        .question-stem {
            font-family: var(--font-heading);
            font-size: 18px;
            font-weight: 600;
            line-height: 1.5;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .spaced-review-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 2px 8px;
            border-radius: 4px;
            background: rgba(245,158,11,0.15);
            color: var(--gold);
            margin-bottom: 12px;
        }

        /* ─── MCQ Options ─── */
        .options-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .option-card {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 16px;
            border-radius: 10px;
            border: 1px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
            background: var(--bg-elevated);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 15px;
            line-height: 1.4;
            user-select: none;
        }

        .option-card:hover:not(.disabled) {
            border-color: ${t.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'};
            background: ${t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .option-card:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 2px;
        }

        .option-card.selected {
            border-width: 2px;
            border-color: var(--accent);
            padding: 13px 15px; /* compensate for thicker border */
            background: ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(30,58,95,0.05)'};
        }

        .option-card.correct {
            border-color: var(--success);
            background: ${t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(22,101,52,0.06)'};
            animation: pulse 0.3s ease;
        }

        .option-card.incorrect {
            border-color: var(--error);
            background: ${t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'};
            animation: shake var(--shake-duration) ease;
        }

        .option-card.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        .option-letter {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 15px;
            background: ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
            color: var(--text-secondary);
            transition: all 0.2s ease;
        }

        .option-card.selected .option-letter {
            background: var(--accent);
            color: var(--on-accent);
        }

        .option-card.correct .option-letter {
            background: var(--success);
            color: #fff;
        }

        .option-card.incorrect .option-letter {
            background: var(--error);
            color: #fff;
        }

        .option-text { flex: 1; }

        .submit-row {
            display: flex;
            justify-content: center;
            margin-top: 24px;
        }

        .submit-row .btn {
            min-width: 180px;
        }

        /* ─── Two-Stage ─── */
        .stage-divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 24px 0 16px;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .stage-divider::before,
        .stage-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: ${t.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        }

        .justification-panel {
            animation: slideIn var(--slide-duration) ease;
        }

        .locked-answer {
            padding: 12px 16px;
            border-radius: 10px;
            background: ${t.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
            border: 1px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 16px;
        }

        .locked-answer .label {
            font-weight: 600;
            color: var(--text-muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        /* ─── Assertion-Reason ─── */
        .statement-cards {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }

        .statement-card {
            padding: 16px 20px;
            border-radius: 12px;
            border-left: 4px solid var(--accent);
            background: var(--bg-elevated);
        }

        .statement-card .label {
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--accent);
            margin-bottom: 6px;
        }

        .statement-card.reason-card {
            border-left-color: var(--warm-accent);
        }

        .statement-card.reason-card .label {
            color: var(--warm-accent);
        }

        .relationship-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .relationship-option {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
            background: var(--bg-elevated);
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 14px;
            line-height: 1.4;
        }

        .relationship-option:hover:not(.disabled) {
            border-color: var(--accent);
        }

        .relationship-option:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 2px;
        }

        .relationship-option.selected {
            border-color: var(--accent);
            background: ${t.isDark ? 'rgba(139,92,246,0.12)' : 'rgba(30,58,95,0.06)'};
        }

        .relationship-option.correct {
            border-color: var(--success);
            background: ${t.isDark ? 'rgba(34,197,94,0.12)' : 'rgba(22,101,52,0.06)'};
        }

        .relationship-option.incorrect {
            border-color: var(--error);
            background: ${t.isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.06)'};
        }

        .radio-dot {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 1px;
            transition: all 0.2s ease;
        }

        .relationship-option.selected .radio-dot {
            border-color: var(--accent);
            background: var(--accent);
        }

        .relationship-option.selected .radio-dot::after {
            content: '';
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--on-accent);
        }

        /* ─── Agreement Matrix ─── */
        .matrix-container {
            width: 100%;
            overflow-x: auto;
        }

        .matrix-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 6px;
        }

        .matrix-table thead th {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            padding: 8px 12px;
            text-align: center;
        }

        .matrix-table thead th:first-child {
            text-align: left;
            width: 55%;
        }

        .matrix-table tbody td {
            padding: 12px;
            background: var(--bg-elevated);
            font-size: 14px;
            line-height: 1.4;
        }

        .matrix-table tbody td:first-child {
            border-radius: 10px 0 0 10px;
            padding-left: 16px;
        }

        .matrix-table tbody td:last-child {
            border-radius: 0 10px 10px 0;
        }

        .matrix-table tbody td:not(:first-child) {
            text-align: center;
        }

        .matrix-radio {
            appearance: none;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid var(--text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
            vertical-align: middle;
        }

        .matrix-radio:checked {
            border-color: var(--accent);
            background: var(--accent);
            box-shadow: inset 0 0 0 3px var(--bg-elevated);
        }

        .matrix-radio:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 2px;
        }

        .matrix-row.correct td { background: ${t.isDark ? 'rgba(34,197,94,0.08)' : 'rgba(22,101,52,0.04)'}; }
        .matrix-row.incorrect td { background: ${t.isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)'}; }

        /* ─── Confidence Selector ─── */
        .confidence-panel {
            animation: slideIn var(--slide-duration) ease;
            margin-top: 20px;
        }

        .confidence-prompt {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 12px;
            text-align: center;
        }

        .confidence-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .confidence-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 16px 24px;
            border-radius: 12px;
            border: 2px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
            background: var(--bg-elevated);
            cursor: pointer;
            transition: all 0.2s ease;
            flex: 1;
            max-width: 140px;
        }

        .confidence-btn:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
        }

        .confidence-btn:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 2px;
        }

        .confidence-btn .emoji { font-size: 28px; }
        .confidence-btn .conf-label {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
        }

        /* ─── Slider Estimation ─── */
        .slider-container {
            padding: 20px 0;
        }

        .slider-value-display {
            text-align: center;
            margin-bottom: 20px;
        }

        .slider-current-value {
            font-size: 48px;
            font-weight: 700;
            color: var(--accent);
            line-height: 1;
        }

        .slider-unit {
            font-size: 20px;
            color: var(--text-muted);
            margin-left: 4px;
        }

        .slider-track-wrapper {
            position: relative;
            padding: 0 12px;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            border-radius: 4px;
            background: var(--bg-elevated);
            outline: none;
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: 3px solid var(--bg-card);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: transform 0.15s ease;
        }

        .slider-input::-webkit-slider-thumb:hover {
            transform: scale(1.15);
        }

        .slider-input::-moz-range-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: 3px solid var(--bg-card);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .slider-input:focus-visible {
            outline: 3px solid var(--accent);
            outline-offset: 4px;
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: var(--text-muted);
        }

        .slider-result-overlay {
            position: relative;
            height: 40px;
            margin-top: 16px;
        }

        .slider-correct-marker {
            position: absolute;
            top: 0;
            width: 3px;
            height: 24px;
            background: var(--success);
            border-radius: 2px;
            transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slider-correct-label {
            position: absolute;
            top: 28px;
            transform: translateX(-50%);
            font-size: 12px;
            font-weight: 600;
            color: var(--success);
            white-space: nowrap;
        }

        .slider-range-highlight {
            position: absolute;
            top: 4px;
            height: 16px;
            background: ${t.isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.1)'};
            border-radius: 8px;
            border: 1px solid ${t.isDark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)'};
        }

        /* ─── Feedback Screen ─── */
        .feedback-card {
            background: var(--bg-card);
            border-radius: 16px;
            box-shadow: var(--shadow);
            padding: 32px;
            text-align: center;
            animation: fadeIn 0.3s ease;
        }

        .feedback-icon {
            font-size: 56px;
            margin-bottom: 12px;
        }

        .feedback-verdict {
            font-family: var(--font-heading);
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .feedback-verdict.correct { color: var(--success); }
        .feedback-verdict.incorrect { color: var(--error); }
        .feedback-verdict.partial { color: var(--gold); }

        .feedback-points {
            display: inline-block;
            font-size: 14px;
            font-weight: 600;
            color: var(--accent);
            background: ${t.isDark ? 'rgba(139,92,246,0.1)' : 'rgba(30,58,95,0.06)'};
            padding: 4px 14px;
            border-radius: 999px;
            margin-bottom: 20px;
        }

        .points-float {
            position: fixed;
            pointer-events: none;
            font-size: 20px;
            font-weight: 700;
            color: var(--accent);
            animation: floatUp 1s ease forwards;
            z-index: 100;
        }

        .feedback-explanation {
            background: var(--bg-elevated);
            border-radius: 12px;
            padding: 16px 20px;
            text-align: left;
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 24px;
        }

        .feedback-explanation strong {
            color: var(--text-primary);
        }

        /* ─── Boss Intro Screen ─── */
        .boss-intro {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 50;
            animation: fadeIn 0.3s ease;
        }

        .boss-intro-content {
            text-align: center;
            animation: bossEntrance var(--boss-intro-duration) cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .boss-intro-icon {
            font-size: 72px;
            margin-bottom: 16px;
            animation: bossPulse 1.5s ease-in-out infinite;
        }

        .boss-intro-title {
            font-family: var(--font-heading);
            font-size: 36px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--warm-accent);
            text-shadow: 0 0 30px rgba(245,158,11,0.4);
        }

        .boss-intro-subtitle {
            font-size: 16px;
            color: rgba(255,255,255,0.7);
            margin-top: 8px;
        }

        .boss-question-wrapper {
            border: 2px solid var(--warm-accent);
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 0 24px ${t.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.08)'};
            animation: bossGlow 2s ease-in-out infinite;
        }

        /* ─── Results Screen ─── */
        .results-card {
            background: var(--bg-card);
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            overflow: hidden;
            animation: fadeIn 0.5s ease;
        }

        .results-header {
            padding: 48px 32px;
            text-align: center;
            background: var(--bg-elevated);
            border-bottom: 1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
        }

        .mastery-icon {
            font-size: 64px;
            margin-bottom: 12px;
        }

        .mastery-verdict {
            font-family: var(--font-heading);
            font-size: 24px;
            font-weight: 700;
        }

        .mastery-verdict.passed { color: var(--success); }
        .mastery-verdict.failed { color: var(--text-secondary); }

        .mastery-score {
            font-size: 56px;
            font-weight: 800;
            color: var(--accent);
            margin: 8px 0;
        }

        .mastery-threshold {
            font-size: 14px;
            color: var(--text-muted);
        }

        .results-body {
            padding: 32px;
        }

        .results-stats {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 32px;
        }

        .result-stat {
            text-align: center;
            padding: 20px 16px;
            background: var(--bg-elevated);
            border-radius: 12px;
        }

        .result-stat .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-primary);
        }

        .result-stat .stat-label {
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 4px;
        }

        .tier-breakdown {
            margin-bottom: 32px;
        }

        .tier-breakdown h3 {
            font-family: var(--font-heading);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 12px;
        }

        .tier-bar-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .tier-bar-label {
            font-size: 13px;
            font-weight: 600;
            min-width: 100px;
            width: auto;
            white-space: nowrap;
            text-align: right;
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            gap: 3px;
        }

        .tier-bar-track {
            flex: 1;
            height: 10px;
            background: var(--bg-elevated);
            border-radius: 5px;
            overflow: hidden;
        }

        .tier-bar-fill {
            height: 100%;
            border-radius: 5px;
            transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            min-width: 4px;
        }

        .tier-bar-value {
            font-size: 13px;
            font-weight: 600;
            width: 48px;
            text-align: right;
        }

        /* ─── Review Section ─── */
        .reflection-summary {
            background: ${t.isDark ? 'rgba(139,92,246,0.06)' : 'rgba(30,58,95,0.03)'};
            border: 1px solid ${t.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(30,58,95,0.1)'};
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }

        .reflection-summary h3 {
            font-family: var(--font-heading);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--accent);
            margin-bottom: 10px;
        }

        .reflection-summary .refl-row {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin-bottom: 6px;
        }

        .reflection-summary .refl-row:last-child {
            margin-bottom: 0;
        }

        .reflection-summary .refl-label {
            font-weight: 600;
            color: var(--text-muted);
            font-size: 12px;
            display: block;
            margin-bottom: 2px;
        }

        .review-section {
            border-top: 1px solid ${t.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
            padding-top: 24px;
        }

        .review-section h3 {
            font-family: var(--font-heading);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 16px;
        }

        .review-item {
            padding: 14px 14px 14px 18px;
            border-radius: 10px;
            background: var(--bg-elevated);
            margin-bottom: 10px;
            border-left: 3px solid var(--accent);
        }

        .review-item .review-q-num {
            font-size: 12px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .review-item .review-stem {
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 10px;
        }

        .review-answer {
            font-size: 13px;
            padding: 6px 0;
        }

        .review-answer.user-correct { color: var(--success); }
        .review-answer.user-incorrect { color: var(--error); }
        .review-answer.correct-was { color: var(--success); opacity: 0.8; }

        .review-feedback {
            margin-top: 8px;
            padding: 10px 14px;
            border-radius: 8px;
            background: ${t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        .results-actions {
            display: flex;
            justify-content: center;
            gap: 16px;
            padding: 24px 32px;
        }

        /* ─── Confetti Canvas ─── */
        #confetti-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 200;
        }

        /* ─── Keyframe Animations ─── */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
        }

        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            15% { transform: translateX(-6px); }
            30% { transform: translateX(5px); }
            45% { transform: translateX(-4px); }
            60% { transform: translateX(3px); }
            75% { transform: translateX(-2px); }
        }

        @keyframes progressPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        @keyframes floatUp {
            0% { opacity: 1; transform: translateY(0) scale(1); }
            50% { opacity: 1; transform: translateY(-30px) scale(1.2); }
            100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
        }

        @keyframes bossEntrance {
            0% { opacity: 0; transform: scale(0.5); }
            60% { opacity: 1; transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        @keyframes bossPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        @keyframes bossGlow {
            0%, 100% { box-shadow: 0 0 24px ${t.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)'}; }
            50% { box-shadow: 0 0 40px ${t.isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)'}; }
        }

        @keyframes celebrationPop {
            0% { opacity: 0; transform: scale(0.5); }
            60% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
        }

        /* ─── Streak Display ─── */
        .streak-display {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            font-size: 13px;
            font-weight: 700;
            color: var(--gold);
            background: ${t.isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.08)'};
            padding: 3px 10px;
            border-radius: 999px;
            margin-right: 10px;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .streak-display.visible {
            opacity: 1;
        }

        .streak-display.pop {
            animation: streakPop 0.4s ease;
        }

        @keyframes streakPop {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }

        .streak-reset-msg {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-card);
            border: 1px solid ${t.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
            border-radius: 12px;
            padding: 12px 24px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            box-shadow: var(--shadow-lg);
            z-index: 60;
            animation: fadeIn 0.2s ease;
            pointer-events: none;
        }

        /* ─── Rapid-Guess Warning ─── */
        .rapid-guess-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 70;
            animation: fadeIn 0.2s ease;
        }

        .rapid-guess-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 32px;
            max-width: 400px;
            text-align: center;
            box-shadow: var(--shadow-lg);
        }

        .rapid-guess-card .warning-icon { font-size: 40px; margin-bottom: 12px; }

        .rapid-guess-card h3 {
            font-family: var(--font-heading);
            font-size: 18px;
            margin-bottom: 8px;
        }

        .rapid-guess-card p {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 20px;
            line-height: 1.5;
        }

        /* ─── Reflection Screen ─── */
        .reflection-card {
            background: var(--bg-card);
            border-radius: 16px;
            box-shadow: var(--shadow);
            padding: 40px 32px;
            animation: fadeIn 0.5s ease;
        }

        .reflection-card h2 {
            font-family: var(--font-heading);
            font-size: 22px;
            text-align: center;
            margin-bottom: 8px;
        }

        .reflection-card .reflection-subtitle {
            text-align: center;
            color: var(--text-secondary);
            font-size: 14px;
            margin-bottom: 28px;
        }

        .reflection-question {
            margin-bottom: 24px;
        }

        .reflection-question label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 8px;
        }

        .reflection-select,
        .reflection-textarea {
            width: 100%;
            padding: 12px 16px;
            border-radius: 10px;
            border: 2px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
            background: var(--bg-elevated);
            color: var(--text-primary);
            font-family: var(--font-body);
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s ease;
        }

        .reflection-select:focus,
        .reflection-textarea:focus {
            border-color: var(--accent);
        }

        .reflection-textarea {
            resize: vertical;
            min-height: 80px;
        }

        .confidence-scale {
            display: flex;
            gap: 8px;
            justify-content: center;
        }

        .confidence-scale-btn {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            border: 2px solid ${t.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};
            background: var(--bg-elevated);
            font-size: 18px;
            font-weight: 700;
            color: var(--text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .confidence-scale-btn:hover {
            border-color: var(--accent);
            color: var(--accent);
            background: ${t.isDark ? 'rgba(139,92,246,0.08)' : 'rgba(30,58,95,0.04)'};
        }

        .confidence-scale-btn.selected {
            border-color: var(--accent);
            background: var(--accent);
            color: var(--on-accent);
            transform: scale(1.08);
            box-shadow: 0 2px 8px ${t.isDark ? 'rgba(139,92,246,0.3)' : 'rgba(30,58,95,0.2)'};
        }

        .reflection-actions {
            display: flex;
            justify-content: center;
            margin-top: 24px;
        }

        /* ─── Reduced Motion ─── */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* ─── Responsive ─── */
        @media (max-width: 768px) {
            body { padding: 12px; }
            .welcome-card { padding: 32px 20px; }
            .welcome-stats { gap: 20px; }
            .question-body { padding: 16px; }
            .feedback-card { padding: 24px; }
            .results-body { padding: 20px; }
            .results-actions { padding: 16px 20px; }
            .results-stats { grid-template-columns: repeat(2, 1fr); }
            .confidence-buttons { flex-direction: column; align-items: center; }
            .confidence-btn { max-width: 100%; }
        }

        @media (max-width: 480px) {
            .question-stem { font-size: 16px; }
            .option-card { padding: 12px 14px; font-size: 14px; }
            .mastery-score { font-size: 36px; }
            .matrix-table { font-size: 13px; }
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Welcome Screen -->
        <div id="welcome-screen" class="welcome-card">
            <h1 id="welcome-title"></h1>
            <p class="subtitle" id="welcome-subtitle"></p>
            <div class="welcome-stats">
                <div class="welcome-stat">
                    <div class="stat-value" id="stat-questions">-</div>
                    <div class="stat-label">Questions</div>
                </div>
                <div class="welcome-stat">
                    <div class="stat-value" id="stat-time">-</div>
                    <div class="stat-label">Minutes</div>
                </div>
                <div class="welcome-stat">
                    <div class="stat-value">85%</div>
                    <div class="stat-label">Mastery</div>
                </div>
            </div>
            <div class="welcome-rules">
                <h3>How It Works</h3>
                <ul>
                    <li>Mixed question types test understanding, not just recall</li>
                    <li>Questions progress from warm-up to challenge to a boss question</li>
                    <li>Score 85% or higher to demonstrate mastery</li>
                    <li>Unlimited retakes with shuffled questions</li>
                </ul>
            </div>
            <button class="btn btn-primary" id="btn-start" style="min-width:200px">Begin Challenge</button>
        </div>

        <!-- Question Screen -->
        <div id="question-screen" class="question-screen hidden">
            <div class="progress-header">
                <div class="progress-top-row">
                    <span class="question-counter" id="question-counter">Question 1 of 10</span>
                    <span style="display:flex;align-items:center;gap:0">
                        <span class="streak-display" id="streak-display"></span>
                        <span class="score-display"><span class="points" id="score-value">0</span> pts</span>
                    </span>
                </div>
                <div class="progress-bar" id="progress-bar" role="progressbar" aria-label="Challenge progress"></div>
                <span class="tier-badge" id="tier-badge" data-tier="warmup"></span>
            </div>
            <div class="question-body">
                <div id="question-area" aria-live="polite"></div>
            </div>
        </div>

        <!-- Feedback Screen -->
        <div id="feedback-screen" class="hidden">
            <div class="feedback-card">
                <div class="feedback-icon" id="feedback-icon"></div>
                <div class="feedback-verdict" id="feedback-verdict"></div>
                <div class="feedback-points" id="feedback-points"></div>
                <div class="feedback-explanation" id="feedback-explanation"></div>
                <button class="btn btn-primary" id="btn-continue">Continue</button>
            </div>
        </div>

        <!-- Boss Intro Screen -->
        <div id="boss-intro" class="boss-intro hidden" aria-live="polite">
            <div class="boss-intro-content">
                <div class="boss-intro-icon">&#128293;</div>
                <div class="boss-intro-title">Boss Question</div>
                <div class="boss-intro-subtitle">Synthesise everything you've learned</div>
            </div>
        </div>

        <!-- Reflection Screen -->
        <div id="reflection-screen" class="hidden">
            <div class="reflection-card">
                <h2>Reflect on Your Learning</h2>
                <p class="reflection-subtitle">Take a moment before seeing your results</p>
                <div class="reflection-question">
                    <label>Which topic from this challenge do you most want to review?</label>
                    <textarea class="reflection-textarea" id="reflection-review" placeholder="e.g. I'm still unsure about the difference between..." rows="2"></textarea>
                </div>
                <div class="reflection-question">
                    <label>How confident do you feel about this week's material overall?</label>
                    <div class="confidence-scale" id="reflection-confidence">
                        <button class="confidence-scale-btn" data-val="1">1</button>
                        <button class="confidence-scale-btn" data-val="2">2</button>
                        <button class="confidence-scale-btn" data-val="3">3</button>
                        <button class="confidence-scale-btn" data-val="4">4</button>
                        <button class="confidence-scale-btn" data-val="5">5</button>
                    </div>
                </div>
                <div class="reflection-actions">
                    <button class="btn btn-primary" id="btn-to-results">See My Results</button>
                </div>
            </div>
        </div>

        <!-- Results Screen -->
        <div id="results-screen" class="hidden">
            <div class="results-card">
                <div class="results-header">
                    <div class="mastery-icon" id="mastery-icon"></div>
                    <div class="mastery-verdict" id="mastery-verdict"></div>
                    <div class="mastery-score" id="mastery-score"></div>
                    <div class="mastery-threshold" id="mastery-threshold"></div>
                </div>
                <div class="results-body">
                    <div class="results-stats" id="results-stats"></div>
                    <div class="tier-breakdown" id="tier-breakdown"></div>
                    <div class="review-section" id="review-section">
                        <h3>Question Review</h3>
                        <div id="review-list"></div>
                    </div>
                </div>
                <div class="results-actions">
                    <button class="btn btn-primary" id="btn-retake">Retake Challenge</button>
                </div>
            </div>
        </div>

        <canvas id="confetti-canvas"></canvas>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        'use strict';

        /* ─── Timing Constants ─── */
        const ADVANCE_DELAY = 800;
        const CELEBRATION_DURATION = 1800;
        const SHAKE_DURATION = 400;
        const BOSS_INTRO_DURATION = 2000;
        const MASTERY_THRESHOLD = 0.85;
        const CONFETTI_COUNT = 40;
        const CONFETTI_MIN_DURATION = 2000;
        const CONFETTI_MAX_DURATION = 3500;

        /* Scoring */
        const BASE_POINTS = { 1: 100, 2: 150, 3: 200 };
        const CONFIDENCE_MULTIPLIERS = {
            'high':   { correct: 1.5,  incorrect: -0.25 },
            'medium': { correct: 1.0,  incorrect: 0 },
            'low':    { correct: 0.5,  incorrect: 0.25 }
        };
        const TWO_STAGE_PARTIAL = 0.5;
        const MATRIX_CORRECT_THRESHOLD = 0.8;

        /* Rapid-guess minimum times (ms) */
        const MIN_TIME = {
            'mcq': 3000,
            'confidence-weighted': 4000,
            'assertion-reason': 4000,
            'two-stage': 6000,
            'agreement-matrix': 6000,
            'slider-estimation': 3000,
            'boss': 8000,
        };

        /* Streak thresholds */
        const STREAK_LEVELS = [
            { min: 3, label: '\\uD83D\\uDD25 ' },
            { min: 5, label: '\\uD83D\\uDD25\\uD83D\\uDD25 ' },
            { min: 7, label: '\\uD83D\\uDD25\\uD83D\\uDD25\\uD83D\\uDD25 ' },
        ];

        const TIER_ORDER = ['warmup', 'core', 'challenge', 'boss'];
        const TIER_LABELS = { warmup: 'Warm-Up', core: 'Core', challenge: 'Challenge', boss: 'Boss' };
        const TIER_ICONS = { warmup: '\\u2600\\uFE0F', core: '\\u26A1', challenge: '\\u2B50', boss: '\\uD83D\\uDD25' };

        const RELATIONSHIP_LABELS = {
            'both-true-reason-explains': 'Both true \\u2014 the reason correctly explains the assertion',
            'both-true-reason-independent': 'Both true \\u2014 the reason does NOT explain the assertion',
            'a-true-b-false': 'The assertion is true; the reason is false',
            'a-false-b-true': 'The assertion is false; the reason is true',
            'both-false': 'Both the assertion and the reason are false'
        };
        const RELATIONSHIP_KEYS = Object.keys(RELATIONSHIP_LABELS);

        /* ─── Data ─── */
        const CHALLENGE_DATA = ${JSON.stringify(sanitised)};

        /* ─── State ─── */
        const state = {
            questions: [],
            currentIndex: 0,
            answers: [],
            score: 0,
            maxPossibleScore: 0,
            totalCorrect: 0,
            streak: 0,
            bestStreak: 0,
            questionStartTime: 0,
            reflectionData: { review: '', confidence: 0 },
        };

        /* ─── DOM References ─── */
        const welcomeScreen = document.getElementById('welcome-screen');
        const questionScreen = document.getElementById('question-screen');
        const feedbackScreen = document.getElementById('feedback-screen');
        const bossIntro = document.getElementById('boss-intro');
        const resultsScreen = document.getElementById('results-screen');
        const questionArea = document.getElementById('question-area');
        const progressBar = document.getElementById('progress-bar');
        const tierBadge = document.getElementById('tier-badge');
        const questionCounter = document.getElementById('question-counter');
        const scoreValue = document.getElementById('score-value');
        const reflectionScreen = document.getElementById('reflection-screen');
        const streakDisplay = document.getElementById('streak-display');
        const confettiCanvas = document.getElementById('confetti-canvas');
        const confettiCtx = confettiCanvas.getContext('2d');

        /* ─── Helpers ─── */
        function shuffleArray(arr) {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        function showScreen(id) {
            [welcomeScreen, questionScreen, feedbackScreen, reflectionScreen, resultsScreen].forEach(
                el => el.classList.add('hidden')
            );
            document.getElementById(id).classList.remove('hidden');
        }

        function escapeHtml(str) {
            const d = document.createElement('div');
            d.textContent = str;
            return d.innerHTML;
        }

        /* ─── Answer obfuscation ─── */
        function obfuscate(val) {
            const s = String(val);
            const key = 'wc' + CHALLENGE_DATA.metadata.weekNumber;
            let out = '';
            for (let i = 0; i < s.length; i++) {
                out += String.fromCharCode(s.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return btoa(out);
        }
        function deobfuscate(encoded) {
            const key = 'wc' + CHALLENGE_DATA.metadata.weekNumber;
            const decoded = atob(encoded);
            let out = '';
            for (let i = 0; i < decoded.length; i++) {
                out += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return out;
        }

        /* ─── Initialize ─── */
        function init() {
            const data = CHALLENGE_DATA;
            const rawQuestions = data.questions || [];

            // Apply variant selection: for each question, randomly pick base or a variant
            const instantiated = rawQuestions.map(q => {
                if (q.variants && q.variants.length > 0) {
                    const pool = [null, ...q.variants]; // null = use base
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    if (pick) {
                        // Merge variant fields over base (shallow merge, skip structural fields)
                        const merged = Object.assign({}, q);
                        delete merged.variants;
                        Object.keys(pick).forEach(k => { merged[k] = pick[k]; });
                        return merged;
                    }
                }
                const copy = Object.assign({}, q);
                delete copy.variants;
                return copy;
            });

            // Sort by tier order, shuffle within tiers
            const byTier = {};
            instantiated.forEach(q => {
                const tier = q.tier || 'core';
                if (!byTier[tier]) byTier[tier] = [];
                byTier[tier].push(q);
            });

            state.questions = [];
            TIER_ORDER.forEach(tier => {
                if (byTier[tier]) {
                    state.questions.push(...shuffleArray(byTier[tier]));
                }
            });

            // Shuffle options (answers already obfuscated at build time)
            state.questions.forEach(q => {
                if (['mcq', 'two-stage', 'confidence-weighted', 'boss'].includes(q.type)) {
                    // Decode the correct index to know which option is correct, then re-encode after shuffling
                    const origCorrectIdx = parseInt(deobfuscate(q._oCI), 10);
                    const opts = q.options.map((text, i) => ({ text, origIndex: i }));
                    const shuffled = shuffleArray(opts);
                    q._shuffledOptions = shuffled.map(o => o.text);
                    const newCorrectIdx = shuffled.findIndex(o => o.origIndex === origCorrectIdx);
                    q._oCI = obfuscate(newCorrectIdx);

                    if (q.justifications && q._oJI) {
                        const origJustIdx = parseInt(deobfuscate(q._oJI), 10);
                        const justs = q.justifications.map((text, i) => ({ text, origIndex: i }));
                        const shuffledJ = shuffleArray(justs);
                        q._shuffledJustifications = shuffledJ.map(j => j.text);
                        const newJustIdx = shuffledJ.findIndex(j => j.origIndex === origJustIdx);
                        q._oJI = obfuscate(newJustIdx);
                    }
                }
                if (q.type === 'agreement-matrix' && q.statements) {
                    q._shuffledStatements = shuffleArray(q.statements.map((s, i) => ({ ...s, origIndex: i })));
                }
            });

            // Calculate max possible score
            state.maxPossibleScore = 0;
            state.questions.forEach(q => {
                const base = BASE_POINTS[q.difficulty] || 100;
                if (q.type === 'confidence-weighted') {
                    state.maxPossibleScore += base * CONFIDENCE_MULTIPLIERS.high.correct;
                } else {
                    state.maxPossibleScore += base;
                }
            });

            state.currentIndex = 0;
            state.answers = [];
            state.score = 0;
            state.totalCorrect = 0;
            state.streak = 0;
            state.bestStreak = 0;
            state.reflectionData = { review: '', confidence: 0 };
            streakDisplay.classList.remove('visible');
            streakDisplay.innerHTML = '';

            // Populate welcome
            document.getElementById('welcome-title').textContent = data.metadata.chapterTitle || 'Weekly Challenge';
            document.getElementById('welcome-subtitle').textContent = ${JSON.stringify(courseTitle)} + ' \\u2014 Week ' + (data.metadata.weekNumber || '');
            document.getElementById('stat-questions').textContent = state.questions.length;
            document.getElementById('stat-time').textContent = '~' + (data.metadata.estimatedMinutes || 8);

            // Build progress segments
            progressBar.innerHTML = '';
            state.questions.forEach((q, i) => {
                const seg = document.createElement('div');
                seg.className = 'progress-segment';
                seg.dataset.tier = q.tier || 'core';
                seg.dataset.index = i;
                progressBar.appendChild(seg);
            });

            showScreen('welcome-screen');
        }

        /* ─── Progress & UI Updates ─── */
        function updateProgress() {
            const idx = state.currentIndex;
            progressBar.querySelectorAll('.progress-segment').forEach((seg, i) => {
                seg.classList.remove('active', 'correct', 'incorrect');
                if (i < state.answers.length) {
                    seg.classList.add(state.answers[i].isCorrect ? 'correct' : 'incorrect');
                } else if (i === idx) {
                    seg.classList.add('active');
                }
            });
            questionCounter.textContent = 'Question ' + (idx + 1) + ' of ' + state.questions.length;
            scoreValue.textContent = Math.max(0, Math.round(state.score));
        }

        function updateTierBadge(tier) {
            tierBadge.dataset.tier = tier;
            tierBadge.innerHTML = (TIER_ICONS[tier] || '') + ' ' + (TIER_LABELS[tier] || tier);
        }

        /* ─── Rapid-Guess Detection ─── */
        function checkRapidGuess(q) {
            const elapsed = Date.now() - state.questionStartTime;
            const threshold = MIN_TIME[q.type] || 3000;
            if (elapsed < threshold) {
                // Show warning overlay
                const overlay = document.createElement('div');
                overlay.className = 'rapid-guess-overlay';
                overlay.innerHTML = '<div class="rapid-guess-card">'
                    + '<div class="warning-icon">\\u23F3</div>'
                    + '<h3>Take your time</h3>'
                    + '<p>Read each question carefully before answering. Quick guesses don\\u2019t count toward mastery.</p>'
                    + '<button class="btn btn-primary" id="btn-dismiss-rapid">Try Again</button>'
                    + '</div>';
                document.body.appendChild(overlay);
                overlay.querySelector('#btn-dismiss-rapid').addEventListener('click', () => {
                    overlay.remove();
                    state.questionStartTime = Date.now(); // reset timer
                });
                return true; // blocked
            }
            return false; // ok
        }

        /* ─── Streak ─── */
        function updateStreak(isCorrect) {
            if (isCorrect) {
                state.streak++;
                if (state.streak > state.bestStreak) state.bestStreak = state.streak;
            } else {
                if (state.streak >= 3) {
                    // Show brief reset message
                    const msg = document.createElement('div');
                    msg.className = 'streak-reset-msg';
                    msg.textContent = 'Good run! ' + state.streak + ' in a row';
                    document.body.appendChild(msg);
                    setTimeout(() => msg.remove(), 1200);
                }
                state.streak = 0;
            }

            // Update display
            const level = STREAK_LEVELS.slice().reverse().find(l => state.streak >= l.min);
            if (level) {
                streakDisplay.innerHTML = level.label + state.streak;
                streakDisplay.classList.add('visible');
                streakDisplay.classList.remove('pop');
                void streakDisplay.offsetHeight;
                streakDisplay.classList.add('pop');
            } else {
                streakDisplay.classList.remove('visible');
            }
        }

        /* ─── Show Question ─── */
        function showQuestion() {
            if (state.currentIndex >= state.questions.length) {
                showReflection();
                return;
            }

            const q = state.questions[state.currentIndex];

            // Boss intro
            if (q.tier === 'boss') {
                bossIntro.classList.remove('hidden');
                setTimeout(() => {
                    bossIntro.classList.add('hidden');
                    renderQuestionScreen(q);
                }, BOSS_INTRO_DURATION);
                return;
            }

            renderQuestionScreen(q);
        }

        function renderQuestionScreen(q) {
            showScreen('question-screen');
            updateProgress();
            updateTierBadge(q.tier || 'core');
            state.questionStartTime = Date.now();

            questionArea.innerHTML = '';
            questionArea.style.animation = 'none';
            void questionArea.offsetHeight; // force reflow
            questionArea.style.animation = '';

            const isBoss = q.tier === 'boss';
            const wrapper = isBoss ? document.createElement('div') : null;
            if (wrapper) {
                wrapper.className = 'boss-question-wrapper';
                questionArea.appendChild(wrapper);
            }
            const target = wrapper || questionArea;

            const renderers = {
                'mcq': renderMcq,
                'two-stage': renderTwoStage,
                'assertion-reason': renderAssertionReason,
                'agreement-matrix': renderAgreementMatrix,
                'confidence-weighted': renderConfidenceWeighted,
                'slider-estimation': renderSliderEstimation,
                'boss': renderTwoStage,
            };
            const render = renderers[q.type] || renderMcq;
            render(q, target);

            // Focus the stem for screen readers
            const stem = target.querySelector('.question-stem');
            if (stem) stem.focus();
        }

        /* ─── MCQ Renderer ─── */
        function renderMcq(q, container) {
            let selected = -1;
            const options = q._shuffledOptions || q.options;

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="options-list">';
            options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                html += '<div class="option-card" tabindex="0" data-index="' + i + '">'
                    + '<span class="option-letter">' + letter + '</span>'
                    + '<span class="option-text">' + escapeHtml(opt) + '</span></div>';
            });
            html += '</div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-submit" disabled>Submit</button></div>';
            container.innerHTML = html;

            const cards = container.querySelectorAll('.option-card');
            const submitBtn = container.querySelector('#btn-submit');

            function selectOption(i) {
                selected = i;
                cards.forEach((c, ci) => c.classList.toggle('selected', ci === i));
                submitBtn.disabled = false;
            }

            cards.forEach((card, i) => {
                card.addEventListener('click', () => selectOption(i));
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(i); }
                });
            });

            submitBtn.addEventListener('click', () => {
                if (selected < 0) return;
                if (checkRapidGuess(q)) return;
                submitBtn.disabled = true;
                cards.forEach(c => c.classList.add('disabled'));

                const correctIdx = parseInt(deobfuscate(q._oCI), 10);
                const isCorrect = selected === correctIdx;
                const base = BASE_POINTS[q.difficulty] || 100;
                const points = isCorrect ? base : 0;

                cards[correctIdx].classList.add('correct');
                if (!isCorrect) cards[selected].classList.add('incorrect');
                updateStreak(isCorrect);

                recordAnswer(q, isCorrect, points);

                setTimeout(() => showFeedback(q, isCorrect, points), ADVANCE_DELAY);
            });
        }

        /* ─── Two-Stage / Boss Renderer ─── */
        function renderTwoStage(q, container) {
            let selectedAnswer = -1;
            let selectedJust = -1;
            let answerLocked = false;
            const options = q._shuffledOptions || q.options;
            const justifications = q._shuffledJustifications || q.justifications;

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="options-list" id="ts-options">';
            options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                html += '<div class="option-card" tabindex="0" data-index="' + i + '">'
                    + '<span class="option-letter">' + letter + '</span>'
                    + '<span class="option-text">' + escapeHtml(opt) + '</span></div>';
            });
            html += '</div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-ts-answer" disabled>Lock Answer</button></div>';
            html += '<div id="justification-area"></div>';
            container.innerHTML = html;

            const cards = container.querySelectorAll('#ts-options .option-card');
            const answerBtn = container.querySelector('#btn-ts-answer');
            const justArea = container.querySelector('#justification-area');

            function selectAnswer(i) {
                if (answerLocked) return;
                selectedAnswer = i;
                cards.forEach((c, ci) => c.classList.toggle('selected', ci === i));
                answerBtn.disabled = false;
            }

            cards.forEach((card, i) => {
                card.addEventListener('click', () => selectAnswer(i));
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectAnswer(i); }
                });
            });

            answerBtn.addEventListener('click', () => {
                if (selectedAnswer < 0 || answerLocked) return;
                answerLocked = true;
                answerBtn.classList.add('hidden');
                cards.forEach(c => c.classList.add('disabled'));

                // Show justification panel
                let jhtml = '<div class="justification-panel">';
                jhtml += '<div class="stage-divider">Why is this correct?</div>';
                jhtml += '<div class="locked-answer"><div class="label">Your answer</div>' + escapeHtml(options[selectedAnswer]) + '</div>';
                jhtml += '<div class="options-list" id="ts-justifications">';
                justifications.forEach((j, i) => {
                    const letter = String.fromCharCode(65 + i);
                    jhtml += '<div class="option-card" tabindex="0" data-index="' + i + '">'
                        + '<span class="option-letter">' + letter + '</span>'
                        + '<span class="option-text">' + escapeHtml(j) + '</span></div>';
                });
                jhtml += '</div>';
                jhtml += '<div class="submit-row"><button class="btn btn-primary" id="btn-ts-submit" disabled>Submit</button></div>';
                jhtml += '</div>';
                justArea.innerHTML = jhtml;

                const jCards = justArea.querySelectorAll('.option-card');
                const submitBtn = justArea.querySelector('#btn-ts-submit');

                function selectJust(i) {
                    selectedJust = i;
                    jCards.forEach((c, ci) => c.classList.toggle('selected', ci === i));
                    submitBtn.disabled = false;
                }

                jCards.forEach((card, i) => {
                    card.addEventListener('click', () => selectJust(i));
                    card.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectJust(i); }
                    });
                });

                submitBtn.addEventListener('click', () => {
                    if (selectedJust < 0) return;
                    if (checkRapidGuess(q)) return;
                    submitBtn.disabled = true;
                    jCards.forEach(c => c.classList.add('disabled'));

                    const correctAns = parseInt(deobfuscate(q._oCI), 10);
                    const correctJust = parseInt(deobfuscate(q._oJI), 10);
                    const ansCorrect = selectedAnswer === correctAns;
                    const justCorrect = selectedJust === correctJust;

                    const base = BASE_POINTS[q.difficulty] || 100;
                    let points = 0;
                    let isCorrect = false;

                    if (ansCorrect && justCorrect) {
                        points = base;
                        isCorrect = true;
                    } else if (ansCorrect) {
                        points = Math.round(base * TWO_STAGE_PARTIAL);
                    }

                    // Show correct/incorrect on both
                    cards[correctAns].classList.add('correct');
                    if (!ansCorrect) cards[selectedAnswer].classList.add('incorrect');
                    jCards[correctJust].classList.add('correct');
                    if (!justCorrect) jCards[selectedJust].classList.add('incorrect');
                    updateStreak(isCorrect);

                    recordAnswer(q, isCorrect, points);

                    const feedbackType = ansCorrect && !justCorrect ? 'wrongReason' : (isCorrect ? 'correct' : 'incorrect');
                    setTimeout(() => showFeedback(q, isCorrect, points, feedbackType), ADVANCE_DELAY);
                });
            });
        }

        /* ─── Assertion-Reason Renderer ─── */
        function renderAssertionReason(q, container) {
            let selected = '';

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="statement-cards">';
            html += '<div class="statement-card"><div class="label">Assertion</div>' + escapeHtml(q.assertion) + '</div>';
            html += '<div class="statement-card reason-card"><div class="label">Reason</div>' + escapeHtml(q.reason) + '</div>';
            html += '</div>';
            html += '<div class="relationship-options">';
            RELATIONSHIP_KEYS.forEach(key => {
                html += '<div class="relationship-option" tabindex="0" data-value="' + key + '">'
                    + '<span class="radio-dot"></span>'
                    + '<span>' + escapeHtml(RELATIONSHIP_LABELS[key]) + '</span></div>';
            });
            html += '</div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-ar-submit" disabled>Submit</button></div>';
            container.innerHTML = html;

            const opts = container.querySelectorAll('.relationship-option');
            const submitBtn = container.querySelector('#btn-ar-submit');

            function selectRel(val) {
                selected = val;
                opts.forEach(o => o.classList.toggle('selected', o.dataset.value === val));
                submitBtn.disabled = false;
            }

            opts.forEach(opt => {
                opt.addEventListener('click', () => selectRel(opt.dataset.value));
                opt.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRel(opt.dataset.value); }
                });
            });

            submitBtn.addEventListener('click', () => {
                if (!selected) return;
                if (checkRapidGuess(q)) return;
                submitBtn.disabled = true;
                opts.forEach(o => o.classList.add('disabled'));

                const correctRel = deobfuscate(q._oCR);
                const isCorrect = selected === correctRel;
                const base = BASE_POINTS[q.difficulty] || 100;
                const points = isCorrect ? base : 0;

                opts.forEach(o => {
                    if (o.dataset.value === correctRel) o.classList.add('correct');
                    if (!isCorrect && o.dataset.value === selected) o.classList.add('incorrect');
                });
                updateStreak(isCorrect);

                recordAnswer(q, isCorrect, points);
                setTimeout(() => showFeedback(q, isCorrect, points), ADVANCE_DELAY);
            });
        }

        /* ─── Agreement Matrix Renderer ─── */
        function renderAgreementMatrix(q, container) {
            const statements = q._shuffledStatements || q.statements;
            const categories = ['always', 'sometimes', 'never'];
            const catLabels = { always: 'Always True', sometimes: 'Sometimes True', never: 'Never True' };

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="matrix-container"><table class="matrix-table"><thead><tr>';
            html += '<th>Statement</th>';
            categories.forEach(c => { html += '<th>' + catLabels[c] + '</th>'; });
            html += '</tr></thead><tbody>';
            statements.forEach((s, i) => {
                html += '<tr class="matrix-row" data-index="' + i + '">';
                html += '<td>' + escapeHtml(s.text) + '</td>';
                categories.forEach(c => {
                    html += '<td><input type="radio" class="matrix-radio" name="stmt-' + i + '" value="' + c + '"'
                        + ' aria-label="' + escapeHtml(s.text) + ' - ' + catLabels[c] + '"></td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-matrix-submit" disabled>Submit</button></div>';
            container.innerHTML = html;

            const submitBtn = container.querySelector('#btn-matrix-submit');
            const radios = container.querySelectorAll('.matrix-radio');

            radios.forEach(r => {
                r.addEventListener('change', () => {
                    // Enable submit only when all rows have a selection
                    const answered = new Set();
                    radios.forEach(radio => { if (radio.checked) answered.add(radio.name); });
                    submitBtn.disabled = answered.size < statements.length;
                });
            });

            submitBtn.addEventListener('click', () => {
                if (checkRapidGuess(q)) return;
                submitBtn.disabled = true;
                radios.forEach(r => { r.disabled = true; });

                let correctCount = 0;
                const rows = container.querySelectorAll('.matrix-row');
                statements.forEach((s, i) => {
                    const sel = container.querySelector('input[name="stmt-' + i + '"]:checked');
                    const userVal = sel ? sel.value : '';
                    const correctVal = deobfuscate(s._oC);
                    const isRight = userVal === correctVal;
                    if (isRight) correctCount++;
                    rows[i].classList.add(isRight ? 'correct' : 'incorrect');
                });

                const ratio = correctCount / statements.length;
                const base = BASE_POINTS[q.difficulty] || 100;
                const points = Math.round(base * ratio);
                const isCorrect = ratio >= MATRIX_CORRECT_THRESHOLD;
                updateStreak(isCorrect);

                recordAnswer(q, isCorrect, points);
                setTimeout(() => showFeedback(q, isCorrect, points, null, correctCount + '/' + statements.length + ' correct'), ADVANCE_DELAY);
            });
        }

        /* ─── Confidence-Weighted Renderer ─── */
        function renderConfidenceWeighted(q, container) {
            let selectedAnswer = -1;
            let answerLocked = false;
            const options = q._shuffledOptions || q.options;

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="options-list" id="cw-options">';
            options.forEach((opt, i) => {
                const letter = String.fromCharCode(65 + i);
                html += '<div class="option-card" tabindex="0" data-index="' + i + '">'
                    + '<span class="option-letter">' + letter + '</span>'
                    + '<span class="option-text">' + escapeHtml(opt) + '</span></div>';
            });
            html += '</div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-cw-answer" disabled>Lock Answer</button></div>';
            html += '<div id="confidence-area"></div>';
            container.innerHTML = html;

            const cards = container.querySelectorAll('#cw-options .option-card');
            const answerBtn = container.querySelector('#btn-cw-answer');
            const confArea = container.querySelector('#confidence-area');

            function selectOpt(i) {
                if (answerLocked) return;
                selectedAnswer = i;
                cards.forEach((c, ci) => c.classList.toggle('selected', ci === i));
                answerBtn.disabled = false;
            }

            cards.forEach((card, i) => {
                card.addEventListener('click', () => selectOpt(i));
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOpt(i); }
                });
            });

            answerBtn.addEventListener('click', () => {
                if (selectedAnswer < 0 || answerLocked) return;
                answerLocked = true;
                answerBtn.classList.add('hidden');
                cards.forEach(c => c.classList.add('disabled'));

                // Show confidence selector
                let chtml = '<div class="confidence-panel">';
                chtml += '<div class="confidence-prompt">How confident are you?</div>';
                chtml += '<div class="confidence-buttons">';
                chtml += '<button class="confidence-btn" tabindex="0" data-level="low"><span class="emoji">\\uD83E\\uDD14</span><span class="conf-label">Not Sure</span></button>';
                chtml += '<button class="confidence-btn" tabindex="0" data-level="medium"><span class="emoji">\\uD83D\\uDE42</span><span class="conf-label">Somewhat</span></button>';
                chtml += '<button class="confidence-btn" tabindex="0" data-level="high"><span class="emoji">\\uD83D\\uDE0E</span><span class="conf-label">Very Sure</span></button>';
                chtml += '</div></div>';
                confArea.innerHTML = chtml;

                confArea.querySelectorAll('.confidence-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (checkRapidGuess(q)) return;
                        const level = btn.dataset.level;
                        const correctIdx = parseInt(deobfuscate(q._oCI), 10);
                        const ansCorrect = selectedAnswer === correctIdx;
                        const base = BASE_POINTS[q.difficulty] || 100;
                        const mult = CONFIDENCE_MULTIPLIERS[level];
                        const points = Math.round(base * (ansCorrect ? mult.correct : mult.incorrect));
                        const isCorrect = ansCorrect;

                        cards[correctIdx].classList.add('correct');
                        if (!ansCorrect) cards[selectedAnswer].classList.add('incorrect');
                        updateStreak(isCorrect);

                        recordAnswer(q, isCorrect, points, null, level);

                        const confLabel = level === 'high' ? 'Very Sure' : level === 'medium' ? 'Somewhat Sure' : 'Not Sure';
                        setTimeout(() => showFeedback(q, isCorrect, points, null, confLabel), ADVANCE_DELAY);
                    });
                });
            });
        }

        /* ─── Slider Estimation Renderer ─── */
        function renderSliderEstimation(q, container) {
            const mid = Math.round((q.sliderMin + q.sliderMax) / 2);

            let html = '';
            if (q.isSpacedReview) html += '<div class="spaced-review-badge">Review Question</div>';
            html += '<h3 class="question-stem" tabindex="-1">' + escapeHtml(q.stem) + '</h3>';
            html += '<div class="slider-container">';
            html += '<div class="slider-value-display">';
            html += '<span class="slider-current-value" id="slider-val">' + mid + '</span>';
            html += '<span class="slider-unit">' + escapeHtml(q.unit) + '</span>';
            html += '</div>';
            html += '<div class="slider-track-wrapper">';
            html += '<input type="range" class="slider-input" id="slider-input"'
                + ' min="' + q.sliderMin + '" max="' + q.sliderMax + '" value="' + mid + '"'
                + ' aria-label="' + escapeHtml(q.stem) + '"'
                + ' aria-valuemin="' + q.sliderMin + '" aria-valuemax="' + q.sliderMax + '"'
                + ' aria-valuenow="' + mid + '">';
            html += '</div>';
            html += '<div class="slider-labels">';
            html += '<span>' + q.sliderMin + ' ' + escapeHtml(q.unit) + '</span>';
            html += '<span>' + q.sliderMax + ' ' + escapeHtml(q.unit) + '</span>';
            html += '</div>';
            html += '<div class="slider-result-overlay hidden" id="slider-result"></div>';
            html += '</div>';
            html += '<div class="submit-row"><button class="btn btn-primary" id="btn-slider-submit">Submit</button></div>';
            container.innerHTML = html;

            const slider = container.querySelector('#slider-input');
            const valDisplay = container.querySelector('#slider-val');
            const submitBtn = container.querySelector('#btn-slider-submit');
            const resultOverlay = container.querySelector('#slider-result');

            slider.addEventListener('input', () => {
                valDisplay.textContent = slider.value;
                slider.setAttribute('aria-valuenow', slider.value);
            });

            submitBtn.addEventListener('click', () => {
                if (checkRapidGuess(q)) return;
                submitBtn.disabled = true;
                slider.disabled = true;

                const userVal = parseFloat(slider.value);
                const correctValue = parseFloat(deobfuscate(q._oCV));
                const acceptableRange = JSON.parse(deobfuscate(q._oAR));
                const distance = Math.abs(userVal - correctValue);
                const rangeLo = acceptableRange[0];
                const rangeHi = acceptableRange[1];
                const halfRange = (rangeHi - rangeLo) / 2;
                const base = BASE_POINTS[q.difficulty] || 100;

                let points;
                if (distance <= halfRange) {
                    points = base;
                } else if (distance <= halfRange * 2) {
                    points = Math.round(base * (1 - (distance - halfRange) / halfRange));
                } else {
                    points = 0;
                }
                points = Math.max(0, points);
                const isCorrect = points >= base * 0.5;

                updateStreak(isCorrect);

                // Show correct value indicator
                const range = q.sliderMax - q.sliderMin;
                const correctPct = ((correctValue - q.sliderMin) / range) * 100;
                const rangeLoPct = ((rangeLo - q.sliderMin) / range) * 100;
                const rangeHiPct = ((rangeHi - q.sliderMin) / range) * 100;

                resultOverlay.classList.remove('hidden');
                resultOverlay.innerHTML = '<div class="slider-range-highlight" style="left:' + rangeLoPct + '%;width:' + (rangeHiPct - rangeLoPct) + '%"></div>'
                    + '<div class="slider-correct-marker" style="left:' + correctPct + '%"></div>'
                    + '<div class="slider-correct-label" style="left:' + correctPct + '%">' + correctValue + ' ' + escapeHtml(q.unit) + '</div>';

                recordAnswer(q, isCorrect, points);
                setTimeout(() => showFeedback(q, isCorrect, points, null, 'You estimated: ' + userVal + ' ' + q.unit), ADVANCE_DELAY);
            });
        }

        /* ─── Record Answer ─── */
        function recordAnswer(q, isCorrect, points, _response, extra) {
            state.answers.push({
                questionIndex: state.currentIndex,
                isCorrect: isCorrect,
                pointsEarned: points,
                extra: extra || null,
            });
            state.score += points;
            if (isCorrect) state.totalCorrect++;
            updateProgress();
        }

        /* ─── Feedback Screen ─── */
        function showFeedback(q, isCorrect, points, feedbackType, extraText) {
            showScreen('feedback-screen');

            const icon = document.getElementById('feedback-icon');
            const verdict = document.getElementById('feedback-verdict');
            const pointsEl = document.getElementById('feedback-points');
            const explanation = document.getElementById('feedback-explanation');

            if (isCorrect) {
                icon.textContent = '\\u2705';
                verdict.textContent = 'Correct!';
                verdict.className = 'feedback-verdict correct';
            } else if (points > 0) {
                icon.textContent = '\\u2796';
                verdict.textContent = 'Partial Credit';
                verdict.className = 'feedback-verdict partial';
            } else {
                icon.textContent = '\\u274C';
                verdict.textContent = 'Not Quite';
                verdict.className = 'feedback-verdict incorrect';
            }

            const sign = points >= 0 ? '+' : '';
            pointsEl.textContent = sign + points + ' points' + (extraText ? ' \\u2014 ' + extraText : '');

            // Choose feedback text
            let fbKey = isCorrect ? 'correct' : 'incorrect';
            if (feedbackType === 'wrongReason' && q.feedback.wrongReason) {
                fbKey = 'wrongReason';
            }
            explanation.innerHTML = '<strong>' + (isCorrect ? 'Why this is correct:' : 'Key insight:') + '</strong> ' + escapeHtml(q.feedback[fbKey] || q.feedback.incorrect || '');

            // Float points animation
            if (points > 0) {
                const floater = document.createElement('div');
                floater.className = 'points-float';
                floater.textContent = '+' + points;
                floater.style.left = '50%';
                floater.style.top = '40%';
                document.body.appendChild(floater);
                setTimeout(() => floater.remove(), 1000);
            }

            // Confetti on correct challenge/boss questions
            if (isCorrect && (q.tier === 'challenge' || q.tier === 'boss')) {
                fireConfetti();
            }

            const continueBtn = document.getElementById('btn-continue');
            const newBtn = continueBtn.cloneNode(true);
            continueBtn.parentNode.replaceChild(newBtn, continueBtn);
            newBtn.addEventListener('click', () => {
                state.currentIndex++;
                if (state.currentIndex >= state.questions.length) {
                    showReflection();
                } else {
                    showQuestion();
                }
            });
        }

        /* ─── Reflection Screen ─── */
        function showReflection() {
            showScreen('reflection-screen');

            // Confidence scale buttons
            document.querySelectorAll('#reflection-confidence .confidence-scale-btn').forEach(btn => {
                btn.classList.remove('selected');
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#reflection-confidence .confidence-scale-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    state.reflectionData.confidence = parseInt(this.dataset.val, 10);
                });
            });

            const toResultsBtn = document.getElementById('btn-to-results');
            const newBtn = toResultsBtn.cloneNode(true);
            toResultsBtn.parentNode.replaceChild(newBtn, toResultsBtn);
            newBtn.addEventListener('click', () => {
                const textarea = document.getElementById('reflection-review');
                state.reflectionData.review = textarea ? textarea.value : '';
                showResults();
            });
        }

        /* ─── Results Screen ─── */
        function showResults() {
            showScreen('results-screen');

            const pct = state.maxPossibleScore > 0 ? state.score / state.maxPossibleScore : 0;
            const passed = pct >= MASTERY_THRESHOLD;

            document.getElementById('mastery-icon').textContent = passed ? '\\uD83C\\uDFC6' : '\\uD83D\\uDCAA';
            const verdictEl = document.getElementById('mastery-verdict');
            verdictEl.textContent = passed ? 'Mastery Achieved!' : 'Keep Practicing';
            verdictEl.className = 'mastery-verdict ' + (passed ? 'passed' : 'failed');
            document.getElementById('mastery-score').textContent = Math.round(pct * 100) + '%';
            document.getElementById('mastery-threshold').textContent = passed
                ? 'You met the 85% mastery threshold'
                : 'You need 85% to demonstrate mastery \\u2014 you can retake anytime';

            // Stats
            const statsEl = document.getElementById('results-stats');
            statsEl.innerHTML = '<div class="result-stat"><div class="stat-value">' + Math.max(0, Math.round(state.score)) + '</div><div class="stat-label">Points</div></div>'
                + '<div class="result-stat"><div class="stat-value">' + state.totalCorrect + '/' + state.questions.length + '</div><div class="stat-label">Correct</div></div>'
                + '<div class="result-stat"><div class="stat-value">' + Math.round(pct * 100) + '%</div><div class="stat-label">Score</div></div>'
                + (state.bestStreak >= 3 ? '<div class="result-stat"><div class="stat-value">\\uD83D\\uDD25 ' + state.bestStreak + '</div><div class="stat-label">Best Streak</div></div>' : '');

            // Tier breakdown
            const tierBreakdown = document.getElementById('tier-breakdown');
            let tbHtml = '<h3>Performance by Tier</h3>';
            TIER_ORDER.forEach(tier => {
                const tierQs = state.questions.map((q, i) => ({ q, a: state.answers[i] })).filter(x => x.q.tier === tier);
                if (tierQs.length === 0) return;
                const tierCorrect = tierQs.filter(x => x.a && x.a.isCorrect).length;
                const tierPct = Math.round((tierCorrect / tierQs.length) * 100);
                const color = tier === 'warmup' ? 'var(--tier-warmup)' : tier === 'core' ? 'var(--tier-core)' : tier === 'challenge' ? 'var(--tier-challenge)' : 'var(--tier-boss)';
                tbHtml += '<div class="tier-bar-row">'
                    + '<span class="tier-bar-label" style="color:' + color + '">' + (TIER_ICONS[tier] || '') + ' ' + (TIER_LABELS[tier] || tier) + '</span>'
                    + '<div class="tier-bar-track"><div class="tier-bar-fill" style="width:' + tierPct + '%;background:' + color + '"></div></div>'
                    + '<span class="tier-bar-value">' + tierPct + '%</span>'
                    + '</div>';
            });
            tierBreakdown.innerHTML = tbHtml;

            // Reflection summary (shown back to the student)
            const reviewSection = document.getElementById('review-section');
            const existingSummary = document.querySelector('.reflection-summary');
            if (existingSummary) existingSummary.remove();
            if (state.reflectionData.review || state.reflectionData.confidence) {
                const summaryDiv = document.createElement('div');
                summaryDiv.className = 'reflection-summary';
                let sHtml = '<h3>Your Reflection</h3>';
                if (state.reflectionData.review) {
                    sHtml += '<div class="refl-row"><span class="refl-label">Want to review</span>' + escapeHtml(state.reflectionData.review) + '</div>';
                }
                if (state.reflectionData.confidence) {
                    const stars = '\\u2B50'.repeat(state.reflectionData.confidence);
                    sHtml += '<div class="refl-row"><span class="refl-label">Confidence</span>' + stars + ' ' + state.reflectionData.confidence + '/5</div>';
                }
                summaryDiv.innerHTML = sHtml;
                reviewSection.parentNode.insertBefore(summaryDiv, reviewSection);
            }

            // Review
            const reviewList = document.getElementById('review-list');
            let rHtml = '';
            state.questions.forEach((q, i) => {
                const a = state.answers[i];
                if (!a) return;
                rHtml += '<div class="review-item">';
                rHtml += '<div class="review-q-num">' + (TIER_ICONS[q.tier] || '') + ' Question ' + (i + 1) + ' \\u2014 ' + q.type.replace(/-/g, ' ') + '</div>';
                rHtml += '<div class="review-stem">' + escapeHtml(q.stem) + '</div>';
                rHtml += '<div class="review-answer ' + (a.isCorrect ? 'user-correct' : 'user-incorrect') + '">'
                    + (a.isCorrect ? '\\u2705 Correct' : '\\u274C Incorrect') + ' (' + (a.pointsEarned >= 0 ? '+' : '') + a.pointsEarned + ' pts)'
                    + (a.extra ? ' \\u2014 ' + escapeHtml(String(a.extra)) : '') + '</div>';
                rHtml += '<div class="review-feedback">' + escapeHtml(a.isCorrect ? q.feedback.correct : q.feedback.incorrect) + '</div>';
                rHtml += '</div>';
            });
            reviewList.innerHTML = rHtml;

            // Retake button
            const retakeBtn = document.getElementById('btn-retake');
            const newRetake = retakeBtn.cloneNode(true);
            retakeBtn.parentNode.replaceChild(newRetake, retakeBtn);
            newRetake.addEventListener('click', () => {
                init();
                showScreen('welcome-screen');
            });

            // Fire confetti on mastery!
            if (passed) {
                setTimeout(() => fireConfetti(), 300);
                setTimeout(() => fireConfetti(), 800);
            }

            // SCORM reporting
            reportToSCORM(pct, passed);
        }

        /* ─── Confetti ─── */
        function fireConfetti() {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;

            const pieces = [];
            const colors = [
                getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6',
                getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#22c55e',
                getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#f59e0b',
                getComputedStyle(document.documentElement).getPropertyValue('--warm-accent').trim() || '#f59e0b',
                getComputedStyle(document.documentElement).getPropertyValue('--accent-light').trim() || '#a78bfa',
            ];

            for (let i = 0; i < CONFETTI_COUNT; i++) {
                pieces.push({
                    x: Math.random() * confettiCanvas.width,
                    y: -10 - Math.random() * 50,
                    w: 6 + Math.random() * 6,
                    h: 4 + Math.random() * 4,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rotation: Math.random() * 360,
                    rotSpeed: (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 3,
                    vy: 2 + Math.random() * 3,
                    delay: Math.random() * 500,
                    shape: Math.random() > 0.5 ? 'rect' : 'circle',
                });
            }

            const startTime = performance.now();
            const duration = CONFETTI_MAX_DURATION + 500;

            function animate(now) {
                const elapsed = now - startTime;
                if (elapsed > duration) {
                    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                    return;
                }

                confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

                pieces.forEach(p => {
                    const t = Math.max(0, elapsed - p.delay);
                    if (t <= 0) return;
                    const progress = t / (CONFETTI_MAX_DURATION - p.delay);

                    const x = p.x + p.vx * t * 0.05;
                    const y = p.y + p.vy * t * 0.08;
                    const rotation = p.rotation + p.rotSpeed * t * 0.05;
                    const alpha = Math.max(0, 1 - progress);

                    confettiCtx.save();
                    confettiCtx.translate(x, y);
                    confettiCtx.rotate((rotation * Math.PI) / 180);
                    confettiCtx.globalAlpha = alpha;
                    confettiCtx.fillStyle = p.color;

                    if (p.shape === 'circle') {
                        confettiCtx.beginPath();
                        confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
                        confettiCtx.fill();
                    } else {
                        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                    }
                    confettiCtx.restore();
                });

                requestAnimationFrame(animate);
            }

            requestAnimationFrame(animate);
        }

        /* ─── SCORM 2004 Wrapper ─── */
        function findSCORM2004API(win) {
            let attempts = 0;
            while (win && attempts < 10) {
                if (win.API_1484_11) return win.API_1484_11;
                if (win === win.parent) break;
                win = win.parent;
                attempts++;
            }
            return null;
        }

        // findSCORM2004API walks up to window.parent; in a sandboxed / cross-
        // origin embed (e.g. ClassBuild's preview iframe, which has no
        // allow-same-origin) reading win.API_1484_11 on the parent throws a
        // SecurityError. Without this guard the throw aborts init before the
        // "Begin Challenge" button is wired, so the preview looks dead while the
        // downloaded file (not sandboxed) works. Guard it: a missing LMS just
        // means run standalone.
        let scormAPI = null;
        try { scormAPI = findSCORM2004API(window); } catch (e) { scormAPI = null; }
        let scormConnected = false;

        function scormInit() {
            if (!scormAPI) return;
            try {
                const result = scormAPI.Initialize('');
                scormConnected = (result === 'true' || result === true);
            } catch (e) { /* no SCORM environment */ }
        }

        function scormSetValue(key, value) {
            if (!scormConnected || !scormAPI) return;
            try { scormAPI.SetValue(key, String(value)); } catch (e) { /* ignore */ }
        }

        function scormCommit() {
            if (!scormConnected || !scormAPI) return;
            try { scormAPI.Commit(''); } catch (e) { /* ignore */ }
        }

        function scormTerminate() {
            if (!scormConnected || !scormAPI) return;
            try { scormAPI.Terminate(''); scormConnected = false; } catch (e) { /* ignore */ }
        }

        function reportToSCORM(scaledScore, mastery) {
            scormSetValue('cmi.score.scaled', scaledScore.toFixed(2));
            scormSetValue('cmi.score.raw', Math.round(state.score));
            scormSetValue('cmi.score.min', '0');
            scormSetValue('cmi.score.max', Math.round(state.maxPossibleScore));
            scormSetValue('cmi.completion_status', 'completed');
            scormSetValue('cmi.success_status', mastery ? 'passed' : 'failed');
            scormSetValue('cmi.suspend_data', JSON.stringify({
                answers: state.answers,
                score: state.score,
                bestStreak: state.bestStreak,
                reflection: state.reflectionData,
                completed: true,
            }));
            scormCommit();
        }

        window.addEventListener('beforeunload', function() {
            if (scormConnected) {
                if (state.answers.length > 0 && state.answers.length < state.questions.length) {
                    scormSetValue('cmi.suspend_data', JSON.stringify({
                        currentIndex: state.currentIndex,
                        answers: state.answers,
                        score: state.score,
                        completed: false,
                    }));
                    scormCommit();
                }
                scormTerminate();
            }
        });

        /* ─── Start ─── */
        scormInit();
        init();

        document.getElementById('btn-start').addEventListener('click', () => {
            showScreen('question-screen');
            showQuestion();
        });
    });
    </script>
</body>

</html>`;
}
