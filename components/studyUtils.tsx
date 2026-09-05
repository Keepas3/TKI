import React from 'react';

const TOPIC_MAP: Record<string, { color: string; label: string }> = {
  opening:     { color: '#38bdf8', label: 'Openings' },
  timed:       { color: '#f97316', label: 'Timed Modes' },
  pc:          { color: '#a78bfa', label: 'Perfect Clear' },
  multiplayer: { color: '#f472b6', label: 'Multiplayer' },
  combo:       { color: '#fbbf24', label: 'Combos' },
  general:     { color: '#94a3b8', label: 'General' },
};

export function topicColor(id: string): string {
  return TOPIC_MAP[id]?.color ?? '#94a3b8';
}

export function topicLabel(id: string): string {
  return TOPIC_MAP[id]?.label ?? id;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

type PixelGlyph = readonly [number, number][];

const GLYPHS: Record<string, PixelGlyph> = {
  O: [[1,0],[0,1],[2,1],[0,2],[2,2],[0,3],[2,3],[1,4]],
  T: [[0,0],[1,0],[2,0],[1,1],[1,2],[1,3],[1,4]],
  M: [[0,0],[2,0],[0,1],[1,1],[2,1],[0,2],[2,2],[0,3],[2,3],[0,4],[2,4]],
  P: [[0,0],[1,0],[0,1],[2,1],[0,2],[1,2],[0,3],[0,4]],
  C: [[1,0],[2,0],[0,1],[0,2],[0,3],[1,4],[2,4]],
  G: [[1,0],[2,0],[0,1],[0,2],[2,2],[0,3],[2,3],[1,4],[2,4]],
};

const TOPIC_LETTERS: Record<string, string[]> = {
  opening:     ['O'],
  timed:       ['T', 'M'],
  pc:          ['P', 'C'],
  multiplayer: ['M', 'P'],
  combo:       ['C'],
  general:     ['G'],
};

export function StudyIcon({ topic, size = 40 }: { topic: string; size?: number }) {
  const color = topicColor(topic);
  const letters = TOPIC_LETTERS[topic] ?? ['G'];
  const isDouble = letters.length === 2;
  const gridW = isDouble ? 7 : 3; // 3+1gap+3 for two letters
  const cellSize = Math.floor((size - 8) / Math.max(gridW, 5));
  const drawW = gridW * cellSize;
  const drawH = 5 * cellSize;
  const ox = Math.floor((size - drawW) / 2);
  const oy = Math.floor((size - drawH) / 2);

  const cells: [number, number][] = [];
  (GLYPHS[letters[0]] ?? []).forEach(([cx, cy]) => cells.push([cx, cy]));
  if (isDouble) {
    (GLYPHS[letters[1]] ?? []).forEach(([cx, cy]) => cells.push([cx + 4, cy]));
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect width={size} height={size} rx={8} fill={`color-mix(in srgb, ${color} 18%, #0a0a0e)`} />
      {cells.map(([cx, cy], i) => (
        <rect
          key={i}
          x={ox + cx * cellSize}
          y={oy + cy * cellSize}
          width={cellSize - 1}
          height={cellSize - 1}
          rx={1}
          fill={color}
          opacity={0.9}
        />
      ))}
    </svg>
  );
}
