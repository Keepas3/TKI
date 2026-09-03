'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailyPuzzle, DIFFICULTY_COLORS, PIECE_COLORS } from './puzzleData';

const puzzle = getDailyPuzzle();

const SOLVED_KEY = 'puzzle-solved';
const CELL = 26;

function isSolved(id: string): boolean {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(SOLVED_KEY) ?? '[]');
    return arr.includes(id);
  } catch {
    return false;
  }
}

function FullBoard({ board }: { board: number[][] }) {
  const W = 10 * CELL;
  const H = 20 * CELL;
  return (
    <svg width={W} height={H} style={{ display: 'block', borderRadius: 4 }}>
      {/* grid lines */}
      {Array.from({ length: 21 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * CELL} x2={W} y2={i * CELL} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      {Array.from({ length: 11 }).map((_, i) => (
        <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      {/* cells */}
      {board.map((row, ri) =>
        row.map((cell, ci) =>
          cell ? (
            <rect
              key={`${ri}-${ci}`}
              x={ci * CELL + 1} y={ri * CELL + 1}
              width={CELL - 2} height={CELL - 2}
              fill={PIECE_COLORS[cell] ?? '#888'}
              rx={2}
            />
          ) : null
        )
      )}
    </svg>
  );
}

export default function DailyPuzzleHero() {
  const [solved, setSolved] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setSolved(isSolved(puzzle.id));
  }, []);

  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty] ?? '#94a3b8';

  return (
    <section style={{
      width: '100%',
      background: `radial-gradient(ellipse 70% 60% at 60% 50%, color-mix(in srgb, var(--tt-accent) 7%, transparent), transparent 70%)`,
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      padding: '3rem 2rem 3.5rem',
    }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>

        {/* Left: metadata */}
        <div style={{ width: 300, flexShrink: 0, paddingTop: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.12em', color: 'var(--tt-accent)', marginBottom: '0.75rem' }}>
            TODAY&apos;S PUZZLE
          </div>
          <h1 style={{
            margin: '0 0 0.75rem', fontSize: '2rem', fontWeight: 800, lineHeight: 1.15,
            color: solved ? '#4ade80' : '#fff',
          }}>
            {solved ? `✓ ${puzzle.name}` : puzzle.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{
              padding: '0.22rem 0.65rem', borderRadius: '999px',
              fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 700,
              backgroundColor: diffColor, color: '#000',
            }}>
              {puzzle.difficulty.toUpperCase()}
            </span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
              {puzzle.category}
            </span>
          </div>
          {puzzle.description && (
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 340 }}>
              {puzzle.description}
            </p>
          )}

          {/* Queue */}
          {puzzle.queue.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.63rem', fontFamily: 'monospace', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
                PIECE QUEUE
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {puzzle.queue.map((p, i) => (
                  <span key={i} style={{
                    width: 28, height: 28, borderRadius: 5, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: PIECE_COLORS[p] ?? '#555',
                    fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: '#000',
                  }}>
                    {['', 'I', 'O', 'T', 'S', 'Z', 'J', 'L'][p] ?? '?'}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/puzzle/${puzzle.id}`}
            style={{
              display: 'inline-flex', padding: '0.6rem 1.5rem', borderRadius: '7px',
              fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 700, textDecoration: 'none',
              ...(solved
                ? { border: '1px solid var(--tt-accent)', color: 'var(--tt-accent)', background: 'transparent' }
                : { background: 'var(--tt-accent)', color: '#000' }),
            }}
          >
            {solved ? 'Play Again' : 'Solve Puzzle →'}
          </Link>
        </div>

        {/* Right: full board */}
        <Link
          href={`/puzzle/${puzzle.id}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'block', textDecoration: 'none', flexShrink: 0,
            position: 'relative',
            boxShadow: hovered
              ? `0 0 0 2px var(--tt-accent), 0 8px 32px rgba(0,0,0,0.5)`
              : `0 0 0 1px rgba(255,255,255,0.1), 0 4px 24px rgba(0,0,0,0.4)`,
            borderRadius: 6,
            transition: 'box-shadow 0.15s',
          }}
        >
          <FullBoard board={puzzle.board} />
          {hovered && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 6,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--tt-accent)',
              letterSpacing: '0.06em',
            }}>
              click to solve
            </div>
          )}
        </Link>

      </div>
    </section>
  );
}
