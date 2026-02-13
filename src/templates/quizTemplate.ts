/**
 * Quiz HTML Template Generator
 *
 * Generates a complete, self-contained HTML quiz page with dark theme,
 * gamification features (calibration meter, achievements, confetti,
 * power-ups, streak counter, scoring system), and review screen.
 *
 * Based on the PSYC2371 practice quiz design.
 */
import { getTheme } from '../themes';

export function buildQuizHtml(
  quizTitle: string,
  quizData: string,
  courseTitle: string,
  themeId?: string,
): string {
  const escapedQuizData = JSON.stringify(quizData);
  const t = getTheme(themeId);

  return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${quizTitle}</title>
    <style>
        :root {
            --primary-purple: ${t.accent};
            --light-purple: ${t.accentLight};
            --red: #ef4444;
            --green: #22c55e;
            --gold: #f59e0b;
            --orange: #f97316;
            --yellow: #fbbf24;
            --blue: #3b82f6;
            --aqua: #06b6d4;
            --light-grey: ${t.isDark ? '#334155' : '#cbd5e1'};
            --dark-grey: ${t.isDark ? '#64748b' : '#94a3b8'};
            --white: ${t.textPrimary};
            --black: ${t.textPrimary};
            --on-accent: ${t.isDark ? '#1a1a2e' : '#ffffff'};
            --shadow: 0 4px 12px rgba(0, 0, 0, ${t.isDark ? '0.4' : '0.15'});
            --transition: all 0.3s ease;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: var(--black);
            background-color: ${t.pageBg};
            padding: 20px;
            min-height: 100vh;
            font-size: 12pt;
        }

        .quiz-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: ${t.cardBg};
            border-radius: 12px;
            box-shadow: var(--shadow);
            overflow: hidden;
            position: relative;
        }

        .header {
            background-color: ${t.elevated};
            color: var(--white);
            padding: 20px 20px 30px 20px;
            text-align: center;
            position: relative;
        }

        .header h1 {
            margin-bottom: 5px;
            font-size: 1.8rem;
            font-weight: 600;
        }

        .header-subtitle {
            font-size: 1rem;
            opacity: 0.8;
            margin-bottom: 15px;
        }

        .progress-container {
            margin-top: 15px;
            position: relative;
        }

        .progress-stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 1rem;
        }

        .progress-bar-container {
            height: 10px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 5px;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background-color: var(--light-purple);
            width: 0%;
            transition: width 0.4s ease;
        }

        /* New Calibration Meter Design */
        .calibration-display {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            position: relative;
        }

        .calibration-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .calibration-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--light-purple);
        }

        .info-icon {
            width: 20px;
            height: 20px;
            background-color: var(--light-purple);
            color: var(--on-accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            cursor: help;
            position: relative;
        }

        .calibration-info-tooltip {
            position: absolute;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            width: 280px;
            background-color: #1e1e2e;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-size: 0.85rem;
            line-height: 1.5;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            z-index: 200;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-icon:hover .calibration-info-tooltip {
            opacity: 1;
            visibility: visible;
        }

        .calibration-score-display {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--light-purple);
        }

        .calibration-visual {
            position: relative;
            height: 40px;
            margin-bottom: 4px;
            margin-top: 20px;
        }

        .calibration-segments {
            display: flex;
            height: 100%;
            border-radius: 20px;
            overflow: hidden;
        }

        .calibration-segment {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .calibration-segment.seg-over {
            background-color: rgba(239, 68, 68, 0.35);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .calibration-segment.seg-good {
            background-color: rgba(34, 197, 94, 0.35);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
        }

        .calibration-segment.seg-under {
            background-color: rgba(59, 130, 246, 0.3);
        }

        .calibration-zone-labels {
            display: flex;
            justify-content: space-around;
            margin-bottom: 8px;
        }

        .calibration-zone-labels span {
            flex: 1;
            text-align: center;
            font-size: 0.75rem;
            color: var(--dark-grey);
            font-weight: 600;
        }

        .calibration-pointer {
            position: absolute;
            top: -14px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--light-purple);
            color: var(--on-accent);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 700;
            transition: left 0.6s ease;
            z-index: 2;
            white-space: nowrap;
        }

        .calibration-pointer::after {
            content: '';
            position: absolute;
            bottom: -4px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 4px solid var(--light-purple);
        }

        .calibration-status {
            text-align: center;
            margin-top: 10px;
        }

        .calibration-status-text {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .calibration-status-description {
            font-size: 0.85rem;
            color: var(--dark-grey);
            line-height: 1.4;
        }

        /* Streak counter styles */
        .streak-counter {
            position: relative;
            display: flex;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.1);
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 0.9rem;
            cursor: help;
            overflow: visible;
        }

        .streak-counter .tooltip {
            left: auto;
            right: 0;
            transform: none;
        }

        .streak-counter .flame {
            margin-right: 5px;
            font-size: 1.2rem;
        }

        /* Score display */
        .score-display {
            position: absolute;
            top: auto;
            bottom: -30px;
            right: 20px;
            background-color: var(--gold);
            color: #1a1a2e;
            border-radius: 50%;
            width: 90px;
            height: 90px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            box-shadow: var(--shadow);
            border: 3px solid \${t.elevated};
            transition: all 0.3s ease;
            z-index: 10;
            overflow: hidden;
            cursor: help;
        }

        .score-value {
            font-size: clamp(1.2rem, 2rem, 2rem);
            line-height: 1;
        }

        .score-label {
            font-size: 0.85rem;
            text-transform: uppercase;
        }

        .score-percentage {
            font-size: 0.9rem;
            margin-top: 2px;
        }

        .quiz-section {
            padding: 30px;
        }

        /* Power-ups Section */
        .powerups-container {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 15px;
            position: relative;
        }

        .powerup-info {
            background-color: rgba(139, 92, 246, 0.1);
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 15px;
            font-size: 0.9rem;
            color: var(--light-purple);
            text-align: center;
        }

        .powerup {
            position: relative;
            background-color: var(--light-grey);
            color: var(--white);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: all 0.2s ease;
        }

        .powerup:hover {
            transform: translateY(-2px);
            background-color: var(--light-purple);
            color: var(--on-accent);
        }

        .powerup:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .powerup-count {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: var(--red);
            color: white;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 0.7rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Tooltip styles */
        .tooltip {
            position: absolute;
            background-color: #1e1e2e;
            color: #e2e8f0;
            font-size: 11px;
            padding: 6px 10px;
            border-radius: 6px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            font-weight: normal;
            transition: opacity 0.2s ease;
            z-index: 200;
            top: -35px;
            left: 50%;
            transform: translateX(-50%);
            visibility: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        *:hover>.tooltip {
            opacity: 1;
            visibility: visible;
        }

        /* Confidence Rating Section */
        .confidence-section {
            text-align: center;
            padding: 20px;
        }

        .confidence-prompt {
            font-size: 1.3rem;
            color: var(--light-purple);
            margin-bottom: 25px;
            font-weight: 600;
        }

        .confidence-options {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .confidence-btn {
            background-color: \${t.cardBg};
            border: 3px solid var(--light-grey);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 140px;
            position: relative;
            overflow: hidden;
            color: var(--white);
        }

        .confidence-btn:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .confidence-btn.low:hover {
            border-color: var(--blue);
            background-color: rgba(59, 130, 246, 0.1);
        }

        .confidence-btn.medium:hover {
            border-color: var(--gold);
            background-color: rgba(245, 158, 11, 0.1);
        }

        .confidence-btn.high:hover {
            border-color: var(--green);
            background-color: rgba(34, 197, 94, 0.1);
        }

        .confidence-emoji {
            font-size: 3rem;
            margin-bottom: 10px;
            display: block;
        }

        .confidence-label {
            font-size: 1rem;
            color: var(--dark-grey);
            font-weight: 600;
        }

        /* Metacognitive Feedback */
        .meta-feedback {
            background-color: rgba(139, 92, 246, 0.1);
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            border-left: 4px solid var(--light-purple);
            animation: fadeSlideIn 0.3s ease-out;
        }

        .meta-feedback.calibrated {
            border-left-color: var(--green);
            background-color: rgba(34, 197, 94, 0.08);
        }

        .meta-feedback.partial {
            border-left-color: var(--gold);
            background-color: rgba(245, 158, 11, 0.08);
        }

        .meta-feedback.miscalibrated {
            border-left-color: var(--orange);
            background-color: rgba(249, 115, 22, 0.08);
        }

        @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .meta-feedback-title {
            font-weight: bold;
            color: var(--light-purple);
            margin-bottom: 10px;
            font-size: 1.1rem;
        }

        .meta-feedback-message {
            line-height: 1.8;
        }

        .meta-points {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: var(--primary-purple);
            color: var(--on-accent);
            padding: 6px 14px;
            border-radius: 20px;
            font-weight: 700;
            font-size: 0.95rem;
            margin-top: 12px;
        }

        .hidden {
            display: none;
        }

        .loading-container {
            text-align: center;
            padding: 40px;
        }

        .loading-spinner {
            border: 6px solid var(--light-grey);
            border-top: 6px solid var(--light-purple);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .btn {
            display: inline-block;
            background-color: var(--light-purple);
            color: var(--on-accent);
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: var(--transition);
            margin-top: 20px;
        }

        .btn:hover {
            background-color: var(--primary-purple);
            color: var(--on-accent);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .btn:active {
            transform: translateY(0);
        }

        /* Hint */
        .hint-message {
            padding: 10px;
            margin: 15px 0;
            background-color: rgba(59, 130, 246, 0.1);
            border-left: 4px solid var(--blue);
            border-radius: 4px;
        }

        /* Options */
        .options-container {
            margin: 20px 0;
        }

        .option {
            display: block;
            padding: 15px;
            margin-bottom: 12px;
            border: 2px solid var(--light-grey);
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
            position: relative;
            padding-left: 50px;
        }

        .option:hover {
            border-color: var(--light-purple);
            background-color: rgba(139, 92, 246, 0.1);
        }

        .option.selected {
            border-color: var(--light-purple);
            background-color: rgba(167, 139, 250, 0.15);
        }

        .option.disabled {
            opacity: 0.6;
            cursor: not-allowed;
            text-decoration: line-through;
        }

        .option-marker {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            height: 30px;
            width: 30px;
            border: 2px solid var(--dark-grey);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            background-color: \${t.cardBg};
        }

        .option.selected .option-marker {
            border-color: var(--light-purple);
            background-color: var(--light-purple);
            color: var(--on-accent);
        }

        #question-text h3 {
            margin-bottom: 20px;
            line-height: 1.5;
            color: var(--light-purple);
        }

        #feedback-container {
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
            background-color: rgba(255, 255, 255, 0.05);
        }

        #feedback-result {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--light-grey);
            word-break: break-word;
        }

        .point-animation {
            position: absolute;
            color: var(--green);
            font-weight: bold;
            font-size: 1.1rem;
            animation: floatUp 1.5s forwards;
            opacity: 0;
            z-index: 100;
        }

        @keyframes floatUp {
            0% {
                transform: translateY(0);
                opacity: 0;
            }

            20% {
                opacity: 1;
            }

            80% {
                opacity: 1;
            }

            100% {
                transform: translateY(-60px);
                opacity: 0;
            }
        }

        .correct {
            color: var(--green);
        }

        .incorrect {
            color: var(--red);
        }

        /* Trophy Case */
        .trophy-case {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 20px 0;
            padding: 15px;
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            justify-content: center;
        }

        .trophy {
            width: 60px;
            height: 60px;
            background-color: \${t.elevated};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            position: relative;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            opacity: 0.4;
            transition: all 0.3s ease;
        }

        .trophy.earned {
            opacity: 1;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
        }

        .trophy.earned:hover {
            transform: scale(1.1);
        }

        .trophy-tooltip {
            position: absolute;
            background-color: #1e1e2e;
            color: #e2e8f0;
            font-size: 11px;
            padding: 6px 10px;
            border-radius: 6px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            font-weight: normal;
            transition: opacity 0.2s ease;
            z-index: 200;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 5px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .trophy:hover .trophy-tooltip {
            opacity: 1;
        }

        /* Results screen */
        .final-score {
            text-align: center;
            margin: 25px 0;
            padding: 30px 20px;
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
        }

        .final-score-title {
            font-size: 1.8rem;
            color: var(--light-purple);
            margin-bottom: 10px;
        }

        .final-score-value {
            font-size: 4rem;
            color: var(--gold);
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
        }

        .final-details {
            font-size: 1.2rem;
            color: var(--dark-grey);
        }

        .stats-summary {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
        }

        .stat-item {
            background-color: \${t.elevated};
            border-radius: 8px;
            padding: 10px 15px;
            text-align: center;
            min-width: 120px;
        }

        .stat-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--light-purple);
        }

        .stat-label {
            font-size: 0.8rem;
            color: var(--dark-grey);
        }

        /* Calibration chart */
        .calibration-chart {
            margin: 30px auto;
            max-width: 500px;
            background-color: \${t.elevated};
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .calibration-chart-title {
            text-align: center;
            color: var(--light-purple);
            margin-bottom: 20px;
            font-weight: 600;
        }

        .calibration-bars {
            display: flex;
            justify-content: space-around;
            margin-bottom: 10px;
        }

        .calibration-bar-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .calibration-bar-area {
            position: relative;
            width: 100%;
            height: 150px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
        }

        .calibration-bar {
            width: 60%;
            background-color: var(--light-purple);
            border-radius: 4px 4px 0 0;
            transition: height 0.5s ease;
            position: relative;
        }

        .calibration-bar[data-level="low"] {
            background: linear-gradient(to top, var(--blue), rgba(59, 130, 246, 0.6));
        }

        .calibration-bar[data-level="medium"] {
            background: linear-gradient(to top, var(--gold), rgba(245, 158, 11, 0.6));
        }

        .calibration-bar[data-level="high"] {
            background: linear-gradient(to top, var(--green), rgba(34, 197, 94, 0.6));
        }

        .calibration-bar-expected {
            position: absolute;
            left: 10%;
            right: 10%;
            border-top: 2px dashed rgba(255, 255, 255, 0.25);
            pointer-events: none;
        }

        .expected-label {
            position: absolute;
            top: -14px;
            right: -2px;
            font-size: 0.55rem;
            color: var(--dark-grey);
            white-space: nowrap;
            letter-spacing: 0.02em;
        }

        .calibration-bar-label {
            margin-top: 10px;
            font-size: 0.85rem;
            text-align: center;
            color: var(--dark-grey);
        }

        .calibration-bar-count {
            font-size: 0.7rem;
            color: var(--dark-grey);
            text-align: center;
            margin-top: 2px;
        }

        .calibration-bar-value {
            position: absolute;
            top: -22px;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
            font-size: 0.85rem;
            white-space: nowrap;
        }

        /* Review section */
        .review-container {
            margin-top: 30px;
        }

        .review-item {
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            background-color: rgba(255, 255, 255, 0.05);
            border-left: 5px solid var(--light-grey);
        }

        .review-item.correct-review {
            border-left-color: var(--green);
        }

        .review-item.incorrect-review {
            border-left-color: var(--red);
        }

        .review-question {
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--light-purple);
        }

        .review-answer {
            margin-bottom: 5px;
            padding: 8px 12px;
            border-radius: 4px;
        }

        .review-confidence {
            display: inline-block;
            margin-top: 10px;
            padding: 5px 10px;
            background-color: rgba(139, 92, 246, 0.15);
            border-radius: 20px;
            font-size: 0.9rem;
        }

        .review-feedback {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid var(--light-grey);
        }

        .subtitle {
            color: var(--dark-grey);
            margin-bottom: 20px;
        }

        .footnote {
            margin-top: 30px;
            font-size: 0.9rem;
            color: var(--dark-grey);
            text-align: center;
        }

        /* Animations */
        .score-bump {
            animation: bump 0.3s ease-out;
        }

        @keyframes bump {
            0% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.2);
            }

            100% {
                transform: scale(1);
            }
        }

        .calibration-pulse {
            animation: calibrationPulse 0.6s ease-out;
        }

        @keyframes calibrationPulse {
            0% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.05);
                filter: brightness(1.2);
            }

            100% {
                transform: scale(1);
                filter: brightness(1);
            }
        }

        /* Achievement notification */
        .achievement {
            background-color: \${t.elevated};
            color: var(--white);
            padding: 15px;
            border-radius: 8px;
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
            z-index: 100;
            animation: slideIn 0.5s forwards, slideOut 0.5s forwards 4.5s;
            display: flex;
            align-items: center;
            border: 1px solid var(--light-purple);
        }

        .achievement-icon {
            font-size: 2rem;
            margin-right: 15px;
        }

        .achievement-text {
            flex: 1;
        }

        .achievement-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        @keyframes slideIn {
            from {
                transform: translateX(110%);
            }

            to {
                transform: translateX(0);
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
            }

            to {
                transform: translateX(110%);
            }
        }

        /* Confetti Canvas */
        #confetti-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
        }

        /* Mobile responsiveness */
        @media (max-width: 600px) {
            .quiz-container {
                width: 100%;
                border-radius: 8px;
            }

            .header {
                padding-top: 15px;
                padding-bottom: 40px;
            }

            .header h1 {
                font-size: 1.3rem;
            }

            .calibration-display {
                padding: 15px;
                margin: 15px 0;
            }

            .calibration-title {
                font-size: 1rem;
            }

            .calibration-score-display {
                font-size: 1.5rem;
            }

            .calibration-visual {
                height: 50px;
            }

            .calibration-zone {
                font-size: 0.7rem;
            }

            .btn {
                width: 100%;
            }

            .quiz-section {
                padding: 20px;
            }

            .confidence-options {
                gap: 10px;
            }

            .confidence-btn {
                min-width: 100px;
                padding: 15px;
            }

            .confidence-emoji {
                font-size: 2.5rem;
            }

            .score-display {
                width: 70px;
                height: 70px;
                bottom: -25px;
                right: 15px;
            }

            .score-value {
                font-size: clamp(1rem, 4vw, 1.5rem);
            }

            .score-label {
                font-size: 0.7rem;
            }

            .score-percentage {
                font-size: 0.8rem;
            }

            .trophy {
                width: 50px;
                height: 50px;
                font-size: 1.2rem;
            }

            .calibration-info-tooltip {
                width: 240px;
                font-size: 0.8rem;
            }
        }
    </style>
</head>

<body>
    <canvas id="confetti-canvas" class="hidden"></canvas>
    <div class="quiz-container">
        <div class="header">
            <h1>${quizTitle}</h1>
            <div class="header-subtitle">${courseTitle}</div>
            <div class="score-display" id="score-display">
                <div class="score-value" id="score-value">0</div>
                <div class="score-label">Score</div>
                <div class="score-percentage" id="score-percentage">0%</div>
            </div>
            <div class="progress-container">
                <div class="progress-stats">
                    <span id="question-number">Question 0 of 0</span>
                    <span class="streak-counter hidden" id="streak-counter">
                        <span class="flame">&#127919;</span>
                        <span id="streak-count">0</span>
                        <div class="tooltip">Well-calibrated streak!</div>
                    </span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progress-bar"></div>
                </div>
            </div>
        </div>

        <div id="loading-screen" class="quiz-section">
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <h2>Loading Quiz Questions...</h2>
                <p class="subtitle">Please wait while we prepare your practice quiz</p>
            </div>
        </div>

        <div id="question-screen" class="quiz-section hidden">
            <div class="calibration-display hidden" id="calibration-display">
                <div class="calibration-header">
                    <div class="calibration-title">
                        <span>Your Calibration</span>
                        <div class="info-icon">
                            ?
                            <div class="calibration-info-tooltip">
                                <strong>What is calibration?</strong><br><br>
                                Calibration measures how well your confidence matches your actual performance.
                                Good calibration means:<br>
                                &#8226; Being confident when you're right<br>
                                &#8226; Being uncertain when you're wrong<br>
                                &#8226; Avoiding overconfidence<br><br>
                                This helps you become a better learner!
                            </div>
                        </div>
                    </div>
                    <div class="calibration-score-display" id="calibration-score-display">--</div>
                </div>
                <div class="calibration-visual">
                    <div class="calibration-segments">
                        <div class="calibration-segment seg-over"></div>
                        <div class="calibration-segment seg-good"></div>
                        <div class="calibration-segment seg-under"></div>
                    </div>
                    <div class="calibration-pointer" id="calibration-pointer">--%</div>
                </div>
                <div class="calibration-zone-labels">
                    <span>Overconfident</span>
                    <span>Well-Calibrated</span>
                    <span>Underconfident</span>
                </div>
                <div class="calibration-status">
                    <div class="calibration-status-text" id="calibration-status-text">Building calibration data...</div>
                    <div class="calibration-status-description" id="calibration-status-description">
                        Answer a few more questions to see your calibration score
                    </div>
                </div>
            </div>

            <div class="powerups-container">
                <button class="powerup" id="fifty-fifty">
                    50:50
                    <span class="powerup-count">2</span>
                    <div class="tooltip">
                        50/50: Removes two incorrect answers
                    </div>
                </button>
                <button class="powerup" id="hint-powerup">
                    &#128161;
                    <span class="powerup-count">1</span>
                    <div class="tooltip">
                        Hint: Provides a clue about the correct answer
                    </div>
                </button>
            </div>
            <div class="powerup-info" id="powerup-info">
                Power-ups help you answer difficult questions. Use them wisely as they're limited!
            </div>
            <div id="question-text"></div>
            <div id="hint-container"></div>
            <div id="options-container" class="options-container"></div>
            <button id="submit-btn" class="btn">Submit Answer</button>
        </div>

        <div id="confidence-screen" class="quiz-section hidden">
            <div class="confidence-section">
                <h2 class="confidence-prompt">How confident are you in your answer?</h2>
                <div class="confidence-options">
                    <button class="confidence-btn low" data-level="low">
                        <span class="confidence-emoji">&#128528;</span>
                        <span class="confidence-label">Not Sure</span>
                    </button>
                    <button class="confidence-btn medium" data-level="medium">
                        <span class="confidence-emoji">&#128522;</span>
                        <span class="confidence-label">Somewhat<br>Confident</span>
                    </button>
                    <button class="confidence-btn high" data-level="high">
                        <span class="confidence-emoji">&#128526;</span>
                        <span class="confidence-label">Very<br>Confident</span>
                    </button>
                </div>
            </div>
        </div>

        <div id="feedback-screen" class="quiz-section hidden">
            <div id="feedback-container">
                <div id="feedback-result"></div>
                <div id="feedback-text"></div>
            </div>
            <div id="meta-feedback" class="meta-feedback"></div>
            <button id="next-btn" class="btn">Next Question</button>
        </div>

        <div id="results-screen" class="quiz-section hidden">
            <div class="final-score" id="final-score">
                <div class="final-score-title">Quiz Complete!</div>
                <div class="final-score-value">0%</div>
                <div class="final-details">0 correct out of 0 questions</div>

                <div class="stats-summary">
                    <div class="stat-item">
                        <div class="stat-value" id="points-stat">0</div>
                        <div class="stat-label">Total Points</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="accuracy-stat">0%</div>
                        <div class="stat-label">Accuracy</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="calibration-stat">0</div>
                        <div class="stat-label">Calibration Score</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value" id="streak-stat">0</div>
                        <div class="stat-label">Best Streak</div>
                    </div>
                </div>
            </div>

            <div class="calibration-chart">
                <h3 class="calibration-chart-title">Your Confidence vs. Accuracy</h3>
                <div class="calibration-bars">
                    <div class="calibration-bar-group">
                        <div class="calibration-bar-area">
                            <div class="calibration-bar-expected" style="bottom: 33%">
                                <span class="expected-label">33%</span>
                            </div>
                            <div class="calibration-bar" id="low-conf-bar" data-level="low" style="height: 0%">
                                <div class="calibration-bar-value">0%</div>
                            </div>
                        </div>
                        <div class="calibration-bar-label">Not Sure</div>
                        <div class="calibration-bar-count" id="low-conf-count">0 questions</div>
                    </div>
                    <div class="calibration-bar-group">
                        <div class="calibration-bar-area">
                            <div class="calibration-bar-expected" style="bottom: 66%">
                                <span class="expected-label">66%</span>
                            </div>
                            <div class="calibration-bar" id="med-conf-bar" data-level="medium" style="height: 0%">
                                <div class="calibration-bar-value">0%</div>
                            </div>
                        </div>
                        <div class="calibration-bar-label">Somewhat<br>Confident</div>
                        <div class="calibration-bar-count" id="med-conf-count">0 questions</div>
                    </div>
                    <div class="calibration-bar-group">
                        <div class="calibration-bar-area">
                            <div class="calibration-bar-expected" style="bottom: 90%">
                                <span class="expected-label">90%</span>
                            </div>
                            <div class="calibration-bar" id="high-conf-bar" data-level="high" style="height: 0%">
                                <div class="calibration-bar-value">0%</div>
                            </div>
                        </div>
                        <div class="calibration-bar-label">Very<br>Confident</div>
                        <div class="calibration-bar-count" id="high-conf-count">0 questions</div>
                    </div>
                </div>
            </div>

            <h3 style="text-align:center; margin-top:30px; color:var(--light-purple);">Your Achievements</h3>
            <div class="trophy-case" id="trophy-case">
                <div class="trophy" data-id="first-correct">
                    &#127775;
                    <span class="trophy-tooltip">First Correct Answer</span>
                </div>
                <div class="trophy" data-id="self-aware">
                    &#128302;
                    <span class="trophy-tooltip">Self-Aware (Low confidence when wrong)</span>
                </div>
                <div class="trophy" data-id="confident-correct">
                    &#128170;
                    <span class="trophy-tooltip">Confident &amp; Correct (5 times)</span>
                </div>
                <div class="trophy" data-id="calibration-streak">
                    &#127919;
                    <span class="trophy-tooltip">Calibration Streak (3 in a row)</span>
                </div>
                <div class="trophy" data-id="knows-limits">
                    &#129504;
                    <span class="trophy-tooltip">Knows When Unsure</span>
                </div>
                <div class="trophy" data-id="perfect">
                    &#128081;
                    <span class="trophy-tooltip">Perfect Score</span>
                </div>
                <div class="trophy" data-id="calibration-master">
                    &#9878;&#65039;
                    <span class="trophy-tooltip">Calibration Master</span>
                </div>
                <div class="trophy" data-id="powerup-master">
                    &#127914;
                    <span class="trophy-tooltip">Used All Powerups</span>
                </div>
            </div>

            <div class="review-container" id="review-container"></div>
            <button id="restart-btn" class="btn">Take Quiz Again</button>
        </div>

        <div class="footnote">
            ${courseTitle}
        </div>
    </div>

    <div id="achievement-container"></div>

    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // Quiz state
            let quizQuestions = [];
            let currentQuestionIndex = 0;
            let score = 0; // Gamified points
            let userAnswers = [];
            let powerups = {
                fiftyFifty: 2,
                hint: 1
            };
            let usedPowerups = {
                fiftyFifty: false,
                hint: false
            };
            let achievements = {
                firstCorrect: false,
                selfAware: 0, // Count of low confidence when wrong
                confidentCorrect: 0, // Count of high confidence when right
                calibrationStreak: 0,
                maxCalibrationStreak: 0,
                knowsLimits: 0, // Count of appropriate uncertainty
                perfect: false,
                calibrationMaster: false,
                powerupMaster: false
            };
            let showedPowerupInfo = false;
            let calibrationData = {
                low: { correct: 0, total: 0 },
                medium: { correct: 0, total: 0 },
                high: { correct: 0, total: 0 }
            };

            // DOM elements
            const loadingScreen = document.getElementById('loading-screen');
            const questionScreen = document.getElementById('question-screen');
            const confidenceScreen = document.getElementById('confidence-screen');
            const feedbackScreen = document.getElementById('feedback-screen');
            const resultsScreen = document.getElementById('results-screen');
            const confettiCanvas = document.getElementById('confetti-canvas');
            const powerupInfo = document.getElementById('powerup-info');
            const hintContainer = document.getElementById('hint-container');

            const submitBtn = document.getElementById('submit-btn');
            const nextBtn = document.getElementById('next-btn');
            const restartBtn = document.getElementById('restart-btn');
            const fiftyFiftyBtn = document.getElementById('fifty-fifty');
            const hintBtn = document.getElementById('hint-powerup');
            const confidenceBtns = document.querySelectorAll('.confidence-btn');

            const questionText = document.getElementById('question-text');
            const optionsContainer = document.getElementById('options-container');
            const feedbackResult = document.getElementById('feedback-result');
            const feedbackText = document.getElementById('feedback-text');
            const metaFeedback = document.getElementById('meta-feedback');
            const questionNumber = document.getElementById('question-number');
            const streakCounter = document.getElementById('streak-counter');
            const streakCount = document.getElementById('streak-count');
            const scoreDisplay = document.getElementById('score-display');
            const scoreValue = document.getElementById('score-value');
            const scorePercentage = document.getElementById('score-percentage');
            const progressBar = document.getElementById('progress-bar');

            // New calibration elements
            const calibrationDisplay = document.getElementById('calibration-display');
            const calibrationScoreDisplay = document.getElementById('calibration-score-display');
            const calibrationPointer = document.getElementById('calibration-pointer');
            const calibrationStatusText = document.getElementById('calibration-status-text');
            const calibrationStatusDescription = document.getElementById('calibration-status-description');

            const finalScoreValue = document.querySelector('.final-score-value');
            const finalDetails = document.querySelector('.final-details');
            const pointsStat = document.getElementById('points-stat');
            const accuracyStat = document.getElementById('accuracy-stat');
            const calibrationStat = document.getElementById('calibration-stat');
            const streakStat = document.getElementById('streak-stat');
            const trophyCase = document.getElementById('trophy-case');
            const reviewContainer = document.getElementById('review-container');
            const achievementContainer = document.getElementById('achievement-container');

            // Event listeners
            submitBtn.addEventListener('click', submitAnswer);
            nextBtn.addEventListener('click', nextQuestion);
            restartBtn.addEventListener('click', resetQuiz);
            fiftyFiftyBtn.addEventListener('click', useFiftyFifty);
            hintBtn.addEventListener('click', useHint);
            confidenceBtns.forEach(btn => {
                btn.addEventListener('click', () => submitConfidence(btn.dataset.level));
            });

            // Hide powerup info after 5 seconds on first question
            setTimeout(() => {
                if (powerupInfo && !showedPowerupInfo) {
                    powerupInfo.style.opacity = "0";
                    powerupInfo.style.transition = "opacity 1s";
                    setTimeout(() => {
                        powerupInfo.style.display = "none";
                    }, 1000);
                    showedPowerupInfo = true;
                }
            }, 5000);

            // Load quiz with inline data
            loadQuizData();

            // Function to load the inline quiz data
            function loadQuizData() {
                try {
                    const quizMarkdown = ${escapedQuizData};
                    startQuiz(quizMarkdown);
                } catch (error) {
                    console.error('Error loading quiz data:', error);
                    loadingScreen.innerHTML = \`
                        <div class="loading-container">
                            <h2>Error Loading Quiz</h2>
                            <p class="subtitle">Unable to load quiz data. Please try again.</p>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            // Function to parse markdown and extract questions
            function parseMarkdown(markdown) {
                const questions = [];

                const normalizedMarkdown = markdown.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');
                const sections = normalizedMarkdown.split(/\\n\\s*---\\s*\\n/);

                sections.forEach((section, index) => {
                    const trimmedSection = section.trim();
                    if (!trimmedSection) return;

                    try {
                        const questionMatch = trimmedSection.match(/^\\s*\\d+\\.\\s+\\*\\*([^*]+)\\*\\*/);
                        if (!questionMatch) {
                            return;
                        }

                        const questionText = questionMatch[1].trim();

                        const options = [];
                        const optionRegex = /\\s+([a-d])\\.\\s+(.*?)(?=\\s+[a-d]\\.\\s+|\\s+\\*\\*Answer|\\s*$)/gs;
                        let optionMatch;

                        while ((optionMatch = optionRegex.exec(trimmedSection)) !== null) {
                            if (['a', 'b', 'c', 'd'].includes(optionMatch[1])) {
                                options.push({
                                    id: optionMatch[1],
                                    text: optionMatch[2].trim()
                                });
                            }
                            if (options.length >= 4) {
                                break;
                            }
                        }

                        if (options.length === 0) {
                            return;
                        }

                        const answerMatch = trimmedSection.match(/\\*\\*Answer\\*\\*:\\s*(.*?)(?=\\s*\\*\\*Feedback|\\s*$)/s);
                        if (!answerMatch) {
                            return;
                        }

                        const answerText = answerMatch[1].trim();

                        const feedbackMatch = trimmedSection.match(/\\*\\*Feedback\\*\\*:\\s*([\\s\\S]*?)(?=\\s*$)/);
                        if (!feedbackMatch) {
                            return;
                        }

                        const feedback = feedbackMatch[1].trim();

                        const correctAnswer = options.find(o => o.id === 'a');
                        if (!correctAnswer) {
                            return;
                        }

                        questions.push({
                            number: index + 1,
                            text: questionText,
                            options: options,
                            correctOptionText: correctAnswer.text,
                            feedback: feedback
                        });

                    } catch (error) {
                        console.error("Error parsing section " + (index + 1) + ":", error);
                    }
                });

                return questions;
            }

            // Function to start the quiz
            function startQuiz(markdown) {
                try {
                    quizQuestions = parseMarkdown(markdown);

                    if (quizQuestions.length === 0) {
                        loadingScreen.innerHTML = \`
                            <div class="loading-container">
                                <h2>Error Processing Quiz</h2>
                                <p class="subtitle">No valid questions found in the Markdown content. Please check the format.</p>
                            </div>
                        \`;
                        return;
                    }

                    // Randomize questions
                    shuffleArray(quizQuestions);

                    // Initialize quiz state
                    currentQuestionIndex = 0;
                    score = 0;
                    userAnswers = [];
                    powerups = {
                        fiftyFifty: 2,
                        hint: 1
                    };
                    usedPowerups = {
                        fiftyFifty: false,
                        hint: false
                    };
                    achievements = {
                        firstCorrect: false,
                        selfAware: 0,
                        confidentCorrect: 0,
                        calibrationStreak: 0,
                        maxCalibrationStreak: 0,
                        knowsLimits: 0,
                        perfect: false,
                        calibrationMaster: false,
                        powerupMaster: false
                    };
                    calibrationData = {
                        low: { correct: 0, total: 0 },
                        medium: { correct: 0, total: 0 },
                        high: { correct: 0, total: 0 }
                    };
                    showedPowerupInfo = false;

                    // Update UI
                    loadingScreen.classList.add('hidden');
                    questionScreen.classList.remove('hidden');
                    resultsScreen.classList.add('hidden');
                    feedbackScreen.classList.add('hidden');
                    confidenceScreen.classList.add('hidden');

                    updateProgressDisplay();
                    updatePowerupDisplay();
                    updateCalibrationMeter();
                    powerupInfo.style.opacity = "1";
                    powerupInfo.style.display = "block";
                    displayQuestion();

                } catch (error) {
                    console.error("Error starting quiz:", error);
                    loadingScreen.innerHTML = \`
                        <div class="loading-container">
                            <h2>Error Processing Quiz</h2>
                            <p class="subtitle">An error occurred while processing the quiz questions.</p>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }

            // Function to update powerup display
            function updatePowerupDisplay() {
                fiftyFiftyBtn.querySelector('.powerup-count').textContent = powerups.fiftyFifty;
                fiftyFiftyBtn.disabled = powerups.fiftyFifty <= 0;

                hintBtn.querySelector('.powerup-count').textContent = powerups.hint;
                hintBtn.disabled = powerups.hint <= 0;
            }

            // Function to use 50/50 powerup
            function useFiftyFifty() {
                if (powerups.fiftyFifty <= 0) return;

                const question = quizQuestions[currentQuestionIndex];
                const correctId = question.answer;

                const incorrectOptions = Array.from(optionsContainer.querySelectorAll('.option'))
                    .filter(option => option.dataset.id !== correctId && !option.classList.contains('disabled'));

                shuffleArray(incorrectOptions);
                const toDisableCount = Math.min(2, incorrectOptions.length);
                const toDisable = incorrectOptions.slice(0, toDisableCount);

                toDisable.forEach(option => {
                    option.classList.add('disabled');
                    option.style.pointerEvents = 'none';
                });

                powerups.fiftyFifty--;
                usedPowerups.fiftyFifty = true;
                updatePowerupDisplay();
                checkPowerupMasterAchievement();
            }

            // Function to use hint powerup
            function useHint() {
                if (powerups.hint <= 0) return;

                const question = quizQuestions[currentQuestionIndex];

                const hintMsg = document.createElement('div');
                hintMsg.className = 'hint-message';
                hintMsg.innerHTML = '<strong>Hint:</strong> Look for an answer that mentions ' + getHintText(question) + '.';

                hintContainer.innerHTML = '';
                hintContainer.appendChild(hintMsg);

                powerups.hint--;
                usedPowerups.hint = true;
                updatePowerupDisplay();
                checkPowerupMasterAchievement();
            }

            // Function to generate a hint text
            function getHintText(question) {
                const correctText = question.correctOptionText;
                const words = correctText.split(' ');

                if (words.length <= 5) {
                    return '"' + words.slice(0, 2).join(' ') + '..."';
                } else {
                    const startIdx = Math.floor(words.length / 3);
                    return '"' + words.slice(startIdx, startIdx + 2).join(' ') + '..."';
                }
            }

            // Function to check powerup master achievement
            function checkPowerupMasterAchievement() {
                if (usedPowerups.fiftyFifty && usedPowerups.hint && !achievements.powerupMaster) {
                    achievements.powerupMaster = true;
                    showAchievement('Powerup Master', '\\u{1F3AA}', 'You\\'ve used all available powerups!');
                }
            }

            // Function to display the current question
            function displayQuestion() {
                const question = quizQuestions[currentQuestionIndex];

                hintContainer.innerHTML = '';
                questionText.innerHTML = '<h3>' + question.text + '</h3>';

                let options = question.options.filter(option => ['a', 'b', 'c', 'd'].includes(option.id));
                options = options.slice(0, 4);

                shuffleArray(options);

                let correctOptionId = null;
                const optionLetters = ['a', 'b', 'c', 'd'];

                options.forEach((option, index) => {
                    const optionText = option.text;
                    option.id = optionLetters[index];

                    if (optionText === question.correctOptionText) {
                        correctOptionId = option.id;
                    }
                });

                question.answer = correctOptionId;

                optionsContainer.innerHTML = '';
                options.forEach(option => {
                    const optionElement = document.createElement('div');
                    optionElement.className = 'option';
                    optionElement.dataset.id = option.id;

                    optionElement.innerHTML = '<span class="option-marker">' + option.id.toUpperCase() + '</span>' + option.text;

                    optionElement.addEventListener('click', selectOption);
                    optionsContainer.appendChild(optionElement);
                });

                updatePowerupDisplay();
                updateProgressDisplay();
            }

            // Function to select an option
            function selectOption(event) {
                const selectedOption = event.currentTarget;
                if (selectedOption.classList.contains('disabled')) {
                    return;
                }

                const options = optionsContainer.querySelectorAll('.option');
                options.forEach(option => option.classList.remove('selected'));

                selectedOption.classList.add('selected');
            }

            // Function to submit an answer
            function submitAnswer() {
                const selectedOption = optionsContainer.querySelector('.option.selected');
                if (!selectedOption) {
                    alert('Please select an answer before submitting.');
                    return;
                }

                const question = quizQuestions[currentQuestionIndex];
                const selectedAnswerId = selectedOption.dataset.id;
                const isCorrect = selectedAnswerId === question.answer;

                // Store temporary answer data
                userAnswers.push({
                    questionIndex: currentQuestionIndex,
                    selectedId: selectedAnswerId,
                    isCorrect: isCorrect,
                    confidence: null, // Will be filled after confidence selection
                    pointsEarned: 0 // Will be calculated after confidence selection
                });

                // Show confidence screen
                questionScreen.classList.add('hidden');
                confidenceScreen.classList.remove('hidden');
            }

            // Function to submit confidence level
            function submitConfidence(confidenceLevel) {
                const currentAnswer = userAnswers[userAnswers.length - 1];
                currentAnswer.confidence = confidenceLevel;

                const isCorrect = currentAnswer.isCorrect;

                // Update calibration data
                calibrationData[confidenceLevel].total++;
                if (isCorrect) {
                    calibrationData[confidenceLevel].correct++;
                }

                // Calculate points based on confidence and correctness
                let pointsEarned = 0;
                let isWellCalibrated = false;

                if (isCorrect) {
                    // Base points for correct answer
                    if (confidenceLevel === 'high') {
                        pointsEarned = 150; // High risk, high reward
                        isWellCalibrated = true;
                        achievements.confidentCorrect++;
                    } else if (confidenceLevel === 'medium') {
                        pointsEarned = 100;
                        isWellCalibrated = true;
                    } else {
                        pointsEarned = 50; // Low confidence but correct
                        achievements.knowsLimits++;
                    }

                    // Check for first correct achievement
                    if (!achievements.firstCorrect) {
                        achievements.firstCorrect = true;
                        showAchievement('First Correct Answer!', '\\u{1F31F}', 'You got your first answer right!');
                    }
                } else {
                    // Wrong answer
                    if (confidenceLevel === 'low') {
                        pointsEarned = 25; // Points for being appropriately uncertain
                        isWellCalibrated = true;
                        achievements.selfAware++;
                    } else if (confidenceLevel === 'medium') {
                        pointsEarned = 0;
                    } else {
                        pointsEarned = -25; // Penalty for overconfidence
                    }
                }

                // Update calibration streak
                if (isWellCalibrated) {
                    achievements.calibrationStreak++;
                    achievements.maxCalibrationStreak = Math.max(
                        achievements.maxCalibrationStreak,
                        achievements.calibrationStreak
                    );

                    // Check for calibration streak achievement
                    if (achievements.calibrationStreak === 3) {
                        showAchievement('Calibration Streak!', '\\u{1F3AF}', 'Three well-calibrated answers in a row!');
                    }
                } else {
                    achievements.calibrationStreak = 0;
                }

                // Update score
                currentAnswer.pointsEarned = pointsEarned;
                score = Math.max(0, score + pointsEarned); // Don't let score go below 0

                // Animate score
                scoreDisplay.classList.add('score-bump');
                if (isWellCalibrated) {
                    calibrationDisplay.classList.add('calibration-pulse');
                }
                setTimeout(() => {
                    scoreDisplay.classList.remove('score-bump');
                    calibrationDisplay.classList.remove('calibration-pulse');
                }, 600);

                // Show floating points animation
                if (pointsEarned !== 0) {
                    showPointsAnimation(pointsEarned);
                }

                // Update displays
                updateProgressDisplay();
                updateCalibrationMeter();
                updateStreakDisplay();

                // Show feedback
                showFeedback();
            }

            // Function to show floating points animation
            function showPointsAnimation(points) {
                const pointsElem = document.createElement('div');
                pointsElem.className = 'point-animation';
                pointsElem.textContent = points > 0 ? '+' + points : '' + points;

                if (points < 0) {
                    pointsElem.style.color = 'var(--red)';
                }

                const scoreRect = scoreDisplay.getBoundingClientRect();
                pointsElem.style.position = 'fixed';
                pointsElem.style.top = (scoreRect.top - 20) + 'px';
                pointsElem.style.left = (scoreRect.left + scoreRect.width / 2 - 15) + 'px';

                document.body.appendChild(pointsElem);

                setTimeout(() => {
                    pointsElem.remove();
                }, 1500);
            }

            // Function to update calibration meter
            function updateCalibrationMeter() {
                if (userAnswers.length < 3) {
                    // Not enough data yet
                    calibrationDisplay.classList.add('hidden');
                    return;
                }

                calibrationDisplay.classList.remove('hidden');

                // Calculate calibration score
                let totalCalibrationScore = 0;
                let count = 0;

                Object.keys(calibrationData).forEach(level => {
                    const data = calibrationData[level];
                    if (data.total > 0) {
                        const accuracy = data.correct / data.total;
                        let expectedAccuracy;

                        if (level === 'low') expectedAccuracy = 0.33;
                        else if (level === 'medium') expectedAccuracy = 0.66;
                        else expectedAccuracy = 0.90;

                        const calibrationError = Math.abs(accuracy - expectedAccuracy);
                        totalCalibrationScore += (1 - calibrationError);
                        count++;
                    }
                });

                if (count > 0) {
                    const avgCalibration = totalCalibrationScore / count;
                    const calibrationPercentage = Math.round(avgCalibration * 100);

                    // Update score display
                    calibrationScoreDisplay.textContent = calibrationPercentage + '%';
                    calibrationPointer.textContent = calibrationPercentage + '%';

                    // Position pointer based on calibration
                    // Map calibration score to position on the meter
                    let position;
                    if (avgCalibration >= 0.8) {
                        // Well-calibrated zone (center)
                        position = 40 + (avgCalibration - 0.8) * 100;
                    } else if (avgCalibration >= 0.5) {
                        // Transitioning to well-calibrated
                        position = 20 + (avgCalibration - 0.5) * 80;
                    } else {
                        // Poor calibration (could be over or under confident)
                        // Check tendency
                        let overconfidentCount = 0;
                        let underconfidentCount = 0;

                        userAnswers.forEach(answer => {
                            if (answer.isCorrect && answer.confidence === 'low') {
                                underconfidentCount++;
                            } else if (!answer.isCorrect && answer.confidence === 'high') {
                                overconfidentCount++;
                            }
                        });

                        if (overconfidentCount > underconfidentCount) {
                            position = avgCalibration * 40; // Left side
                        } else {
                            position = 60 + avgCalibration * 40; // Right side
                        }
                    }

                    calibrationPointer.style.left = position + '%';

                    // Update status text
                    if (avgCalibration >= 0.8) {
                        calibrationStatusText.textContent = 'Excellent Calibration!';
                        calibrationStatusText.style.color = 'var(--green)';
                        calibrationStatusDescription.textContent = 'Your confidence matches your performance very well. Keep it up!';
                    } else if (avgCalibration >= 0.6) {
                        calibrationStatusText.textContent = 'Good Calibration';
                        calibrationStatusText.style.color = 'var(--gold)';
                        calibrationStatusDescription.textContent = 'You\\'re generally aware of what you know and don\\'t know.';
                    } else {
                        calibrationStatusText.textContent = 'Needs Improvement';
                        calibrationStatusText.style.color = 'var(--orange)';
                        if (position < 50) {
                            calibrationStatusDescription.textContent = 'You tend to be overconfident. Try being more cautious when unsure.';
                        } else {
                            calibrationStatusDescription.textContent = 'You tend to underestimate your knowledge. Trust yourself more when you know the answer!';
                        }
                    }
                }
            }

            // Function to update streak display
            function updateStreakDisplay() {
                if (achievements.calibrationStreak >= 2) {
                    streakCounter.classList.remove('hidden');
                    streakCount.textContent = achievements.calibrationStreak;
                } else {
                    streakCounter.classList.add('hidden');
                }
            }

            // Function to show feedback
            function showFeedback() {
                confidenceScreen.classList.add('hidden');
                feedbackScreen.classList.remove('hidden');

                const currentAnswer = userAnswers[userAnswers.length - 1];
                const question = quizQuestions[currentAnswer.questionIndex];
                const isCorrect = currentAnswer.isCorrect;
                const confidence = currentAnswer.confidence;

                // Show answer feedback
                if (isCorrect) {
                    feedbackResult.textContent = 'Correct!';
                    feedbackResult.className = 'correct';
                } else {
                    const correctOptionLetter = question.answer.toUpperCase();
                    const correctOption = question.options.find(o => o.id === question.answer);
                    feedbackResult.textContent = 'Incorrect. The correct answer was: ' + correctOptionLetter + '. ' + correctOption.text;
                    feedbackResult.className = 'incorrect';
                }

                feedbackText.innerHTML = question.feedback;

                // Generate metacognitive feedback
                let metaTitle = '';
                let metaMessage = '';
                let metaClass = '';
                let metaIcon = '';

                if (isCorrect) {
                    if (confidence === 'high') {
                        metaTitle = 'Excellent Calibration!';
                        metaMessage = 'You were confident and correct. This shows good self-awareness of your knowledge. Keep trusting your instincts when you feel certain!';
                        metaClass = 'calibrated';
                        metaIcon = '&#127919; ';
                    } else if (confidence === 'medium') {
                        metaTitle = 'Good Balance!';
                        metaMessage = 'You showed appropriate caution while still getting it right. This balanced approach is often the wisest strategy.';
                        metaClass = 'partial';
                        metaIcon = '&#9878;&#65039; ';
                    } else {
                        metaTitle = 'Hidden Knowledge!';
                        metaMessage = 'You got it right despite low confidence. Consider whether you might be underestimating your knowledge in this area.';
                        metaClass = 'miscalibrated';
                        metaIcon = '&#128161; ';
                    }
                } else {
                    if (confidence === 'high') {
                        metaTitle = 'Overconfidence Alert';
                        metaMessage = 'Being wrong when confident is a valuable learning opportunity. Take note of what made you certain - it will help refine your judgment.';
                        metaClass = 'miscalibrated';
                        metaIcon = '&#9888;&#65039; ';
                    } else if (confidence === 'medium') {
                        metaTitle = 'Room to Grow';
                        metaMessage = 'Your moderate confidence was appropriate given the outcome. Focus on strengthening your understanding of this topic.';
                        metaClass = 'partial';
                        metaIcon = '&#127793; ';
                    } else {
                        metaTitle = 'Good Self-Awareness!';
                        metaMessage = 'You correctly identified your uncertainty. This metacognitive awareness is a valuable skill that helps guide effective learning.';
                        metaClass = 'calibrated';
                        metaIcon = '&#129504; ';
                    }
                }

                metaFeedback.className = 'meta-feedback ' + metaClass;
                metaFeedback.innerHTML = '<div class="meta-feedback-title">' + metaIcon + metaTitle + '</div>' +
                    '<div class="meta-feedback-message">' + metaMessage + '</div>' +
                    '<div style="margin-top: 10px; text-align: center;">' +
                    '<span class="meta-points">' + (currentAnswer.pointsEarned > 0 ? '+' : '') + currentAnswer.pointsEarned + ' points</span>' +
                    '</div>';

                // Check achievements
                checkAchievements();

                // Show confetti for great calibration
                if ((isCorrect && confidence === 'high') || (!isCorrect && confidence === 'low')) {
                    if (Math.random() < 0.3) { // 30% chance to avoid too much confetti
                        showConfetti();
                    }
                }
            }

            // Function to check achievements
            function checkAchievements() {
                // Self-aware achievement
                if (achievements.selfAware >= 3 && !achievements.selfAwareUnlocked) {
                    achievements.selfAwareUnlocked = true;
                    showAchievement('Self-Aware', '\\u{1F52E}', 'You\\'ve shown great awareness of your limitations!');
                }

                // Confident and correct achievement
                if (achievements.confidentCorrect >= 5 && !achievements.confidentCorrectUnlocked) {
                    achievements.confidentCorrectUnlocked = true;
                    showAchievement('Confident & Correct', '\\u{1F4AA}', 'Five times very confident and right!');
                }

                // Knows limits achievement
                if (achievements.knowsLimits >= 3 && !achievements.knowsLimitsUnlocked) {
                    achievements.knowsLimitsUnlocked = true;
                    showAchievement('Knows When Unsure', '\\u{1F9E0}', 'You recognize when you\\'re not certain!');
                }
            }

            // Function to show achievement notification
            function showAchievement(title, icon, description) {
                const achievementElement = document.createElement('div');
                achievementElement.className = 'achievement';
                achievementElement.innerHTML = '<div class="achievement-icon">' + icon + '</div>' +
                    '<div class="achievement-text">' +
                    '<div class="achievement-title">' + title + '</div>' +
                    '<div>' + description + '</div>' +
                    '</div>';

                achievementContainer.appendChild(achievementElement);

                setTimeout(() => {
                    achievementElement.remove();
                }, 5000);
            }

            // Function to show confetti
            function showConfetti() {
                if (!confettiCanvas) return;

                confettiCanvas.classList.remove('hidden');

                const confetti = [];
                const confettiCount = 100;
                const ctx = confettiCanvas.getContext('2d');
                confettiCanvas.width = window.innerWidth;
                confettiCanvas.height = window.innerHeight;

                const colors = ['#f59e0b', '${t.accent}', '${t.accentLight}', '#22c55e', '#ef4444', '#fbbf24'];

                for (let i = 0; i < confettiCount; i++) {
                    confetti.push({
                        x: Math.random() * confettiCanvas.width,
                        y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                        size: Math.random() * 10 + 5,
                        color: colors[Math.floor(Math.random() * colors.length)],
                        speedY: Math.random() * 3 + 2,
                        speedX: Math.random() * 4 - 2,
                        rotation: Math.random() * 360,
                        rotationSpeed: Math.random() * 10 - 5
                    });
                }

                const animateConfetti = () => {
                    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

                    let stillFalling = false;
                    confetti.forEach(particle => {
                        particle.y += particle.speedY;
                        particle.x += particle.speedX;
                        particle.rotation += particle.rotationSpeed;

                        if (particle.y < confettiCanvas.height) {
                            stillFalling = true;
                        }

                        ctx.save();
                        ctx.translate(particle.x + particle.size / 2, particle.y + particle.size / 2);
                        ctx.rotate(particle.rotation * Math.PI / 180);

                        ctx.fillStyle = particle.color;
                        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);

                        ctx.restore();
                    });

                    if (stillFalling) {
                        requestAnimationFrame(animateConfetti);
                    } else {
                        confettiCanvas.classList.add('hidden');
                    }
                };

                animateConfetti();
            }

            // Function to move to the next question
            function nextQuestion() {
                currentQuestionIndex++;

                if (currentQuestionIndex < quizQuestions.length) {
                    feedbackScreen.classList.add('hidden');
                    questionScreen.classList.remove('hidden');
                    displayQuestion();
                } else {
                    showResults();
                }
            }

            // Function to show final results
            function showResults() {
                feedbackScreen.classList.add('hidden');
                questionScreen.classList.add('hidden');
                resultsScreen.classList.remove('hidden');

                const numCorrect = userAnswers.filter(a => a.isCorrect).length;
                const totalQuestions = quizQuestions.length;

                let finalAccuracyPercentage = 0;
                if (totalQuestions > 0) {
                    finalAccuracyPercentage = Math.round((numCorrect / totalQuestions) * 100);
                }

                // Update header elements to their final state
                questionNumber.textContent = 'Quiz Complete!';
                progressBar.style.width = '100%';
                scoreValue.textContent = score;
                scorePercentage.textContent = finalAccuracyPercentage + '%';
                if (streakCounter) streakCounter.classList.add('hidden');

                // Update main results screen content
                finalScoreValue.textContent = finalAccuracyPercentage + '%';
                finalDetails.textContent = numCorrect + ' correct out of ' + totalQuestions + ' questions';

                // Update stats
                pointsStat.textContent = score;
                accuracyStat.textContent = finalAccuracyPercentage + '%';

                // Calculate overall calibration score
                let overallCalibrationScore = calculateOverallCalibration();
                calibrationStat.textContent = Math.round(overallCalibrationScore) + '%';

                streakStat.textContent = achievements.maxCalibrationStreak;

                // Update calibration chart
                updateCalibrationChart();

                // Update trophies
                updateTrophyCase();

                // Check for perfect score achievement
                if (userAnswers.length === quizQuestions.length &&
                    quizQuestions.length > 0 &&
                    userAnswers.every(a => a.isCorrect) &&
                    !achievements.perfect) {
                    achievements.perfect = true;
                    showConfetti();
                    setTimeout(() => {
                        showAchievement('Perfect Score!', '\\u{1F451}', 'You answered every question correctly!');
                    }, 500);
                }

                // Check calibration master achievement
                if (overallCalibrationScore >= 80 && !achievements.calibrationMaster) {
                    achievements.calibrationMaster = true;
                    showAchievement('Calibration Master', '\\u2696\\uFE0F', 'Outstanding metacognitive awareness!');
                }

                // Create review of all questions
                reviewContainer.innerHTML = '';

                userAnswers.forEach((answer, loopIndex) => {
                    const question = quizQuestions[answer.questionIndex];
                    const selectedOption = question.options.find(o => o.id === answer.selectedId);
                    const correctOption = question.options.find(o => o.id === question.answer);

                    const reviewItem = document.createElement('div');
                    reviewItem.className = 'review-item ' + (answer.isCorrect ? 'correct-review' : 'incorrect-review');

                    const confidenceEmoji = {
                        'low': '\\u{1F610}',
                        'medium': '\\u{1F60A}',
                        'high': '\\u{1F60E}'
                    }[answer.confidence];

                    const confidenceText = {
                        'low': 'Not Sure',
                        'medium': 'Somewhat Confident',
                        'high': 'Very Confident'
                    }[answer.confidence];

                    reviewItem.innerHTML = '<div class="review-question">' + (loopIndex + 1) + '. ' + question.text + '</div>' +
                        '<div class="review-answer">Your answer: ' + answer.selectedId.toUpperCase() + '. ' + (selectedOption ? selectedOption.text : 'N/A') + '</div>' +
                        '<div class="review-answer ' + (answer.isCorrect ? 'correct' : 'incorrect') + '">' +
                        'Correct answer: ' + question.answer.toUpperCase() + '. ' + (correctOption ? correctOption.text : 'N/A') +
                        '</div>' +
                        '<div class="review-confidence">' +
                        confidenceEmoji + ' Confidence: ' + confidenceText + ' | Points: ' + (answer.pointsEarned > 0 ? '+' : '') + answer.pointsEarned +
                        '</div>' +
                        '<div class="review-feedback">' + question.feedback + '</div>';

                    reviewContainer.appendChild(reviewItem);
                });
            }

            // Function to calculate overall calibration score
            function calculateOverallCalibration() {
                let totalScore = 0;
                let weightedCount = 0;

                Object.keys(calibrationData).forEach(level => {
                    const data = calibrationData[level];
                    if (data.total > 0) {
                        const accuracy = data.correct / data.total;
                        let expectedAccuracy;
                        let weight;

                        if (level === 'low') {
                            expectedAccuracy = 0.25;
                            weight = data.total;
                        } else if (level === 'medium') {
                            expectedAccuracy = 0.60;
                            weight = data.total;
                        } else {
                            expectedAccuracy = 0.85;
                            weight = data.total;
                        }

                        const calibrationError = Math.abs(accuracy - expectedAccuracy);
                        const calibrationScore = Math.max(0, 1 - (calibrationError * 2)) * 100;

                        totalScore += calibrationScore * weight;
                        weightedCount += weight;
                    }
                });

                return weightedCount > 0 ? totalScore / weightedCount : 0;
            }

            // Function to update calibration chart
            function updateCalibrationChart() {
                const levels = ['low', 'medium', 'high'];
                const bars = {
                    'low': document.getElementById('low-conf-bar'),
                    'medium': document.getElementById('med-conf-bar'),
                    'high': document.getElementById('high-conf-bar')
                };
                const counts = {
                    'low': document.getElementById('low-conf-count'),
                    'medium': document.getElementById('med-conf-count'),
                    'high': document.getElementById('high-conf-count')
                };
                const barColors = {
                    'low': 'var(--blue)',
                    'medium': 'var(--gold)',
                    'high': 'var(--green)'
                };

                levels.forEach(level => {
                    const data = calibrationData[level];
                    const bar = bars[level];
                    const countEl = counts[level];
                    const valueEl = bar.querySelector('.calibration-bar-value');

                    if (data.total > 0) {
                        const accuracy = Math.round((data.correct / data.total) * 100);
                        bar.style.height = accuracy + '%';
                        valueEl.textContent = accuracy + '%';
                    } else {
                        bar.style.height = '0%';
                        valueEl.textContent = 'N/A';
                    }

                    valueEl.style.color = barColors[level];
                    countEl.textContent = data.total + (data.total === 1 ? ' question' : ' questions');
                });
            }

            // Function to update trophy case
            function updateTrophyCase() {
                const trophyMap = {
                    'first-correct': achievements.firstCorrect,
                    'self-aware': achievements.selfAwareUnlocked || achievements.selfAware >= 3,
                    'confident-correct': achievements.confidentCorrectUnlocked || achievements.confidentCorrect >= 5,
                    'calibration-streak': achievements.maxCalibrationStreak >= 3,
                    'knows-limits': achievements.knowsLimitsUnlocked || achievements.knowsLimits >= 3,
                    'perfect': achievements.perfect,
                    'calibration-master': achievements.calibrationMaster,
                    'powerup-master': achievements.powerupMaster
                };

                Array.from(trophyCase.querySelectorAll('.trophy')).forEach(trophy => {
                    const trophyId = trophy.dataset.id;
                    if (trophyMap[trophyId]) {
                        trophy.classList.add('earned');
                    } else {
                        trophy.classList.remove('earned');
                    }
                });
            }

            // Function to reset the quiz
            function resetQuiz() {
                resultsScreen.classList.add('hidden');
                feedbackScreen.classList.add('hidden');
                questionScreen.classList.add('hidden');
                confidenceScreen.classList.add('hidden');
                loadingScreen.classList.remove('hidden');

                // Reset UI elements to initial state
                questionNumber.textContent = 'Question 0 of 0';
                scoreValue.textContent = '0';
                scorePercentage.textContent = '0%';
                progressBar.style.width = '0%';
                if (streakCounter) streakCounter.classList.add('hidden');
                if (streakCount) streakCount.textContent = '0';

                // Clear any hints
                hintContainer.innerHTML = '';

                // Reset calibration display
                calibrationDisplay.classList.add('hidden');
                calibrationScoreDisplay.textContent = '--';
                calibrationPointer.textContent = '--%';
                calibrationPointer.style.left = '50%';
                calibrationStatusText.textContent = 'Building calibration data...';
                calibrationStatusText.style.color = 'var(--primary-purple)';
                calibrationStatusDescription.textContent = 'Answer a few more questions to see your calibration score';

                // Show powerup info again
                if (powerupInfo) {
                    powerupInfo.style.opacity = "1";
                    powerupInfo.style.display = "block";
                }
                showedPowerupInfo = false;

                // Load questions fresh with inline data
                loadQuizData();
            }

            // Helper function to update the progress display
            function updateProgressDisplay() {
                if (quizQuestions.length === 0) return;

                scoreValue.textContent = score;

                if (resultsScreen.classList.contains('hidden')) {
                    questionNumber.textContent = 'Question ' + (currentQuestionIndex + 1) + ' of ' + quizQuestions.length;

                    const numCorrectSoFar = userAnswers.filter(a => a.isCorrect).length;
                    const questionsAnswered = userAnswers.length;

                    let accuracyPercentage = 0;
                    if (questionsAnswered > 0) {
                        accuracyPercentage = Math.round((numCorrectSoFar / questionsAnswered) * 100);
                    }
                    scorePercentage.textContent = accuracyPercentage + '%';

                    let progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
                    progressBar.style.width = progress + '%';
                }
            }

            // Helper function to shuffle an array (Fisher-Yates algorithm)
            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }
        });
    </script>
</body>

</html>`;
}
