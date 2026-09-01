import React from 'react';
import { TOPICS } from './useStudy';

const TOPIC_MAP = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

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

const TOPIC_SHAPES: Record<string, [number, number][]> = {
  opening: [[0,1],[1,1],[2,1],[1,0]],
  '40l':   [[0,0],[1,0],[2,0],[3,0]],
  pc:      [[0,0],[1,0],[0,1],[1,1]],
  blitz:   [[0,0],[1,0],[1,1],[2,1]],
  combo:   [[0,1],[1,1],[1,0],[2,0]],
  general: [[0,0],[0,1],[1,1],[2,1]],
};

export function StudyIcon({ topic, size = 40 }: { topic: string; size?: number }) {
  const color = topicColor(topic);
  const cells = TOPIC_SHAPES[topic] ?? TOPIC_SHAPES.general;
  const cell = Math.floor(size / 5);
  const pad = Math.floor((size - cell * 4) / 2);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect width={size} height={size} rx={8} fill={`color-mix(in srgb, ${color} 18%, #0a0a0e)`} />
      {cells.map(([cx, cy], i) => (
        <rect
          key={i}
          x={pad + cx * cell}
          y={pad + cy * cell + cell}
          width={cell - 1}
          height={cell - 1}
          rx={1}
          fill={color}
          opacity={0.9}
        />
      ))}
    </svg>
  );
}
