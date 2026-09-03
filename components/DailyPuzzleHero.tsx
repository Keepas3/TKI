'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailyPuzzle, DIFFICULTY_COLORS, PIECE_COLORS } from './puzzleData';

const puzzle = getDailyPuzzle();

const SOLVED_KEY = 'puzzle-solved';
const CELL = 16;

function isSolved(id: string): boolean {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(SOLVED_KEY) ?? '[]');
    return arr.includes(id);
  } catch {
    return false;
  }
}

function PuzzleBoard({ board }: { board: number[][] }) {
  const minRow = board.findIndex((row) => row.some((c) => c !== 0));
  const displayRows = board.slice(Math.max(0, minRow - 1));
  const W = 10 * CELL;
  const H = displayRows.length * CELL;

  return (
    <svg
      width={W} height={H}
      style={{ display: 'block', borderRadius: 4, flexShrink: 0 }}
    >
      {displayRows.map((row, ri) =>
        row.map((cell, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * CELL} y={ri * CELL}
            width={CELL - 1} height={CELL - 1}
            fill={cell ? (PIECE_COLORS[cell] ?? '#888') : 'rgba(255,255,255,0.03)'}
            rx={1}
          />
        ))
      )}
    </svg>
  );
}

export default function DailyPuzzleHero() {
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSolved(isSolved(puzzle.id));
  }, []);

  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty] ?? '#94a3b8';

  return (
    <Link
      href={`/puzzle/${puzzle.id}`}
      style={{
        display: 'flex', gap: '1.5rem', alignItems: 'flex-start', textDecoration: 'none', color: 'inherit',
        padding: '1.1rem 1.25rem',
        backgroundColor: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px', marginTop: '1.5rem',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.025)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      {/* Left: metadata */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.1em', color: 'var(--tt-accent)' }}>
          TODAY&apos;S PUZZLE
        </span>
        <h3 style={{
          margin: 0, fontSize: '1.15rem', fontWeight: 'bold',
          color: solved ? '#4ade80' : '#fff', lineHeight: 1.2,
        }}>
          {solved ? `✓ ${puzzle.name}` : puzzle.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{
            padding: '0.18rem 0.55rem', borderRadius: '999px',
            fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 'bold',
            backgroundColor: diffColor, color: '#000',
          }}>
            {puzzle.difficulty.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>
            {puzzle.category}
          </span>
        </div>
        {puzzle.description && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            {puzzle.description}
          </p>
        )}
        <span style={{
          display: 'inline-flex', alignSelf: 'flex-start',
          marginTop: '0.25rem', padding: '0.35rem 0.9rem', borderRadius: '6px',
          fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 'bold',
          ...(solved
            ? { border: '1px solid var(--tt-accent)', color: 'var(--tt-accent)', background: 'transparent' }
            : { background: 'var(--tt-accent)', color: '#000' }),
        }}>
          {solved ? 'Play Again' : 'Play →'}
        </span>
      </div>

      {/* Right: board preview */}
      <PuzzleBoard board={puzzle.board} />
    </Link>
  );
}
