import type { ChangeEvent, CSSProperties } from 'react';

interface CodexSliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  showTicks?: boolean;
  suffix?: string;
}

export function CodexSlider({
  label,
  value,
  min = 1,
  max = 24,
  step = 1,
  onChange,
  showTicks = true,
  suffix,
}: CodexSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const ticks = max - min + 1;

  const sliderStyle = {
    '--cb-slider-pct': `${pct}%`,
  } as CSSProperties;

  return (
    <div>
      {label && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
          }}
        >
          <span
            className="cb-sc"
            style={{
              fontSize: 13,
              color: 'var(--cb-text-muted)',
              letterSpacing: '0.12em',
            }}
          >
            {label}
          </span>
          <span
            className="cb-mono"
            style={{ fontSize: 15, color: 'var(--cb-text-default)', fontWeight: 500 }}
          >
            {value}
            {suffix ? ` ${suffix}` : ''}
          </span>
        </div>
      )}
      <div style={{ position: 'relative', height: 24 }}>
        {/* Ticks — centered vertically on the track */}
        {showTicks && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: ticks }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 1,
                  height: 7,
                  background: 'var(--cb-border-strong)',
                }}
              />
            ))}
          </div>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="cb-slider cb-focus"
          style={{
            ...sliderStyle,
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            width: '100%',
            height: '100%',
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'transparent',
            margin: 0,
            padding: 0,
          }}
        />
        <style>{`
          .cb-slider::-webkit-slider-runnable-track {
            height: 1px;
            border: 0;
            background: linear-gradient(
              to right,
              var(--cb-accent-emphasis) 0,
              var(--cb-accent-emphasis) var(--cb-slider-pct, 0%),
              var(--cb-border-strong) var(--cb-slider-pct, 0%),
              var(--cb-border-strong) 100%
            );
          }
          .cb-slider::-moz-range-track {
            height: 1px;
            border: 0;
            background: var(--cb-border-strong);
          }
          .cb-slider::-moz-range-progress {
            height: 1px;
            background: var(--cb-accent-emphasis);
          }
          .cb-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none;
            width: 16px; height: 16px; border-radius: 999px;
            background: var(--cb-accent-emphasis);
            border: 2px solid var(--cb-ground-canvas);
            cursor: pointer;
            box-shadow: 0 0 0 1px var(--cb-accent-emphasis);
            margin-top: -8px;
          }
          .cb-slider::-moz-range-thumb {
            width: 16px; height: 16px; border-radius: 999px;
            background: var(--cb-accent-emphasis);
            border: 2px solid var(--cb-ground-canvas);
            cursor: pointer;
            box-shadow: 0 0 0 1px var(--cb-accent-emphasis);
          }
        `}</style>
      </div>
    </div>
  );
}
