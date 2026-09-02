'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailyPuzzle, DIFFICULTY_COLORS } from './puzzleData';

const puzzle = getDailyPuzzle();

const SOLVED_KEY = 'puzzle-solved';

function isSolved(id: string): boolean {
  try {
    const raw = localStorage.getItem(SOLVED_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    return arr.includes(id);
  } catch {
    return false;
  }
}

export default function DailyPuzzleHero() {
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setSolved(isSolved(puzzle.id));
  }, []);

  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty] ?? '#94a3b8';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      padding: '0 1.25rem', height: 68,
      backgroundColor: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '8px', marginTop: '2rem',
    }}>
      {/* Left label */}
      <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
        TODAY&apos;S PUZZLE
      </span>

      {/* Puzzle name */}
      <span style={{
        fontWeight: 'bold', fontSize: '0.95rem', color: solved ? '#4ade80' : '#fff',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
      }}>
        {solved ? `✓ ${puzzle.name}` : puzzle.name}
      </span>

      {/* Difficulty badge */}
      <span style={{
        padding: '0.2rem 0.55rem', borderRadius: '999px',
        fontSize: '0.68rem', fontFamily: 'monospace', fontWeight: 'bold',
        backgroundColor: diffColor, color: '#000', whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        {puzzle.difficulty.toUpperCase()}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* CTA */}
      <Link
        href={`/puzzle/${puzzle.id}`}
        style={{
          padding: '0.45rem 1.1rem', borderRadius: '6px', textDecoration: 'none',
          fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 'bold',
          whiteSpace: 'nowrap', flexShrink: 0,
          ...(solved
            ? { border: '1px solid var(--tt-accent)', color: 'var(--tt-accent)', background: 'transparent' }
            : { background: 'var(--tt-accent)', color: '#000' }),
        }}
      >
        {solved ? 'Play Again' : 'Play →'}
      </Link>
    </div>
  );
}
