import { motion } from 'framer-motion';
import type { ChapterSyllabus } from '../../types/course';

interface SpacingArcsProps {
  chapters: ChapterSyllabus[];
}

/**
 * SVG visualization of spacing connections between chapters.
 * Draws curved arcs from each chapter to the chapters it references,
 * creating a visual web showing how concepts are revisited.
 */
export function SpacingArcs({ chapters }: SpacingArcsProps) {
  // Collect all connections
  const connections: { from: number; to: number }[] = [];
  for (const ch of chapters) {
    for (const target of ch.spacingConnections) {
      connections.push({ from: ch.number, to: target });
    }
  }

  if (connections.length === 0) return null;

  const totalChapters = chapters.length;
  const nodeSpacing = 72;
  const svgWidth = totalChapters * nodeSpacing;
  const maxArcHeight = 80;
  const nodeY = maxArcHeight + 30;
  const svgHeight = nodeY + 40;

  function getX(chapterNum: number): number {
    return (chapterNum - 1) * nodeSpacing + nodeSpacing / 2;
  }

  function getArcPath(from: number, to: number): string {
    const x1 = getX(Math.min(from, to));
    const x2 = getX(Math.max(from, to));
    const span = Math.abs(from - to);
    const arcHeight = Math.min(maxArcHeight, 20 + span * 12);
    const midX = (x1 + x2) / 2;
    const midY = nodeY - arcHeight;

    return `M ${x1} ${nodeY} Q ${midX} ${midY} ${x2} ${nodeY}`;
  }

  return (
    <div className="overflow-x-auto mt-6 pb-2">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="mx-auto"
      >
        {/* Connection arcs */}
        {connections.map(({ from, to }, i) => (
          <motion.path
            key={`${from}-${to}`}
            d={getArcPath(from, to)}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeDasharray="4 3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
          />
        ))}

        {/* Chapter nodes */}
        {chapters.map((ch, i) => {
          const x = getX(ch.number);
          const hasConnections = connections.some(
            c => c.from === ch.number || c.to === ch.number
          );
          return (
            <motion.g
              key={ch.number}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              {/* Node glow */}
              {hasConnections && (
                <circle
                  cx={x}
                  cy={nodeY}
                  r="14"
                  fill="#8b5cf6"
                  fillOpacity="0.1"
                />
              )}
              {/* Node circle */}
              <circle
                cx={x}
                cy={nodeY}
                r="10"
                fill={hasConnections ? '#1a1a2e' : '#252540'}
                stroke={hasConnections ? '#8b5cf6' : '#64748b'}
                strokeWidth={hasConnections ? '2' : '1'}
              />
              {/* Chapter number */}
              <text
                x={x}
                y={nodeY + 4}
                textAnchor="middle"
                fill={hasConnections ? '#a78bfa' : '#94a3b8'}
                fontSize="10"
                fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {ch.number}
              </text>
              {/* Label */}
              <text
                x={x}
                y={nodeY + 28}
                textAnchor="middle"
                fill="#64748b"
                fontSize="8"
                fontFamily="Inter, system-ui, sans-serif"
              >
                {ch.title.length > 10 ? ch.title.slice(0, 10) + '...' : ch.title}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
