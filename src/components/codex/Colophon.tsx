import type { CSSProperties } from 'react';

type Mode = 'parchment' | 'vespers';

interface Props {
  size?: number;
  mode?: Mode;
  style?: CSSProperties;
}

const FLEURON_THRESHOLD = 32;

export function Colophon({ size = 48, mode = 'parchment', style }: Props) {
  const useFull = size >= FLEURON_THRESHOLD;
  const src = useFull
    ? mode === 'vespers'
      ? '/classbuild-colophon-vespers.svg'
      : '/classbuild-colophon.svg'
    : '/classbuild-colophon-simple.svg';

  const height = useFull ? size * (128 / 106) : size * (120 / 100);

  return (
    <img
      src={src}
      width={size}
      height={height}
      alt="ClassBuild"
      draggable={false}
      style={{
        width: `${size}px`,
        height: `${height}px`,
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
