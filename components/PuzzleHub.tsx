'use client';

import React from 'react';
import Link from 'next/link';
import { PUZZLES, getDailyPuzzleByDate, fetchDailyPuzzle, DIFFICULTY_COLORS, CATEGORY_LABELS, PIECE_COLORS, PIECE_NAMES, type Puzzle, type PuzzleDifficulty } from './puzzleData';

function getSolvedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem('puzzle-solved');
    return new Set(JSON.parse(raw ?? '[]'));
  } catch {
    return new Set();
  }
}

function BoardPreview({ board }: { board: number[][] }) {
  const CELL = 4;
  const PAD = 2;
  const w = 10 * CELL + PAD * 2;
  const h = 20 * CELL + PAD * 2;

  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.4)" rx={2} />
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={PAD + c * CELL}
              y={PAD + r * CELL}
              width={CELL - 1}
              height={CELL - 1}
              fill={PIECE_COLORS[cell] ?? '#0ea5e9'}
              rx={0.5}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function PieceBadge({ type }: { type: number }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: 3,
      background: PIECE_COLORS[type] ?? '#888',
      color: '#000', fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    }}>
      {PIECE_NAMES[type]}
    </span>
  );
}

function PuzzleCard({ puzzle, solved, isDaily }: { puzzle: Puzzle; solved: boolean; isDaily?: boolean }) {
  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty];
  return (
    <Link
      href={`/puzzle/${puzzle.id}`}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 12,
        background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
        borderRadius: 8, padding: '10px 14px', textDecoration: 'none',
        transition: 'background 0.15s, border-color 0.15s',
        position: 'relative',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'var(--tt-surface-hover)';
        e.currentTarget.style.borderColor = 'var(--tt-border-strong)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'var(--tt-surface)';
        e.currentTarget.style.borderColor = 'var(--tt-border)';
      }}
    >
      <BoardPreview board={puzzle.board} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
            {puzzle.name}
          </span>
          {isDaily && (
            <span style={{
              fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
              border: '1px solid var(--tt-accent)', color: 'var(--tt-accent)',
              borderRadius: 4, padding: '1px 5px',
            }}>
              Daily
            </span>
          )}
          {solved && (
            <span style={{ fontSize: 14, lineHeight: 1, color: '#4ade80' }}>✓</span>
          )}
        </div>

        <span style={{ fontSize: 11, color: 'var(--tt-text-muted)', fontFamily: 'monospace' }}>
          {puzzle.description}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{
            fontSize: 10, letterSpacing: '0.08em', textTransform: 'capitalize',
            color: diffColor, fontFamily: 'monospace', fontWeight: 600,
          }}>
            {puzzle.difficulty}
          </span>
          <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', fontFamily: 'monospace' }}>
            {CATEGORY_LABELS[puzzle.category]}
          </span>
          <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
            {puzzle.queue.map((t, i) => <PieceBadge key={i} type={t} />)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          color, fontFamily: 'monospace', fontWeight: 700,
        }}>
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: `${color}33` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

export default function PuzzleHub() {
  const [solvedSet, setSolvedSet] = React.useState<Set<string>>(new Set());
  const [daily, setDaily] = React.useState<Puzzle>(getDailyPuzzleByDate);
  React.useEffect(() => {
    setSolvedSet(getSolvedSet());
    fetchDailyPuzzle().then(setDaily);
  }, []);
  const groups: Record<PuzzleDifficulty, Puzzle[]> = { easy: [], medium: [], hard: [] };
  for (const p of PUZZLES) groups[p.difficulty].push(p);

  return (
    <div style={{
      maxWidth: 560, margin: '0 auto', padding: '40px 24px 60px',
      fontFamily: 'monospace',
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: 'var(--tt-text)', fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', margin: '0 0 6px' }}>
          Puzzles
        </h1>
        <p style={{ color: 'var(--tt-text-muted)', fontSize: 12, margin: 0 }}>
          Perfect Clear training — solve each setup with the exact pieces given.
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Section label="Daily" color="var(--tt-accent)">
          <PuzzleCard puzzle={daily} solved={solvedSet.has(daily.id)} isDaily />
        </Section>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <Section label="Easy" color={DIFFICULTY_COLORS.easy}>
          {groups.easy.map(p => (
            <PuzzleCard key={p.id} puzzle={p} solved={solvedSet.has(p.id)} />
          ))}
        </Section>
        <Section label="Medium" color={DIFFICULTY_COLORS.medium}>
          {groups.medium.map(p => (
            <PuzzleCard key={p.id} puzzle={p} solved={solvedSet.has(p.id)} />
          ))}
        </Section>
        <Section label="Hard" color={DIFFICULTY_COLORS.hard}>
          {groups.hard.map(p => (
            <PuzzleCard key={p.id} puzzle={p} solved={solvedSet.has(p.id)} />
          ))}
        </Section>
      </div>

      {/* Community section */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--tt-border)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
          <span style={{
            fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--tt-text-muted)', fontFamily: 'monospace', fontWeight: 700,
          }}>
            Community
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--tt-border)' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--tt-text-muted)', margin: '0 0 14px', fontFamily: 'monospace', lineHeight: 1.6 }}>
          Player-submitted PC puzzles. Browse, vote, and share your own.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/puzzle/community" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 16px', borderRadius: 20,
            border: '1px solid var(--tt-border)',
            color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
            textDecoration: 'none', letterSpacing: '0.04em',
            transition: 'border-color 0.12s, color 0.12s',
          }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--tt-accent)'; e.currentTarget.style.color = 'var(--tt-accent)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--tt-border)'; e.currentTarget.style.color = 'var(--tt-text)'; }}
          >
            Browse Community →
          </Link>
          <Link href="/puzzle/editor" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--tt-text-faint)', fontSize: 11, textDecoration: 'none',
            fontFamily: 'monospace', letterSpacing: '0.04em',
          }}>
            <span style={{ fontSize: 13 }}>✎</span>
            Create a puzzle
          </Link>
        </div>
      </div>
    </div>
  );
}
