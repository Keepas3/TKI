'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDailyPuzzle, DIFFICULTY_COLORS, CATEGORY_LABELS, PIECE_COLORS, PIECE_NAMES } from './puzzleData';

const CELL = 24;
const PAD = 4;
const BOARD_W = 10 * CELL + PAD * 2;
const BOARD_H = 20 * CELL + PAD * 2;

export default function DailyPuzzleHero() {
  const puzzle = getDailyPuzzle();
  const [solved, setSolved] = useState(false);
  const [hoverBoard, setHoverBoard] = useState(false);

  useEffect(() => {
    try {
      const ids: string[] = JSON.parse(localStorage.getItem('puzzle-solved') ?? '[]');
      setSolved(ids.includes(puzzle.id));
    } catch {}
  }, [puzzle.id]);

  const queueDisplay = puzzle.queue.slice(0, 7);
  const queueExtra = puzzle.queue.length - queueDisplay.length;

  return (
    <section style={{
      padding: '3.5rem 2rem 4rem',
      background: 'radial-gradient(ellipse 70% 60% at 50% 40%, color-mix(in srgb, var(--tt-accent) 6%, transparent), transparent 70%)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        display: 'flex', gap: '2.5rem', alignItems: 'flex-start', justifyContent: 'center',
      }}>

        {/* ── Left panel ── */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>
              Today&apos;s Puzzle
            </div>
            <h1 style={{ margin: 0, fontSize: '1.45rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--tt-accent)', lineHeight: 1.2 }}>
              {puzzle.name}
            </h1>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '0.2rem 0.55rem', borderRadius: '4px',
              color: '#000', backgroundColor: DIFFICULTY_COLORS[puzzle.difficulty],
            }}>
              {puzzle.difficulty}
            </span>
            <span style={{
              fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase',
              padding: '0.2rem 0.55rem', borderRadius: '4px',
              color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.18)',
              backgroundColor: 'rgba(255,255,255,0.06)',
            }}>
              {CATEGORY_LABELS[puzzle.category]}
            </span>
          </div>

          {/* Solved badge */}
          {solved && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0.3rem 0.65rem', borderRadius: '6px',
              backgroundColor: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ade80', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700,
            }}>
              ✓ Solved today
            </div>
          )}

          {/* Description */}
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
            {puzzle.description}
          </p>

          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            {puzzle.queue.length} pieces in queue
          </div>
        </div>

        {/* ── Board column ── */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link
            href={`/puzzle/${puzzle.id}`}
            style={{ display: 'block', textDecoration: 'none' }}
            onMouseEnter={() => setHoverBoard(true)}
            onMouseLeave={() => setHoverBoard(false)}
          >
            <div style={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: hoverBoard
                ? '0 0 60px color-mix(in srgb, var(--tt-accent) 16%, transparent)'
                : '0 0 40px color-mix(in srgb, var(--tt-accent) 8%, transparent)',
              transition: 'box-shadow 0.2s',
            }}>
              <svg width={BOARD_W} height={BOARD_H}>
                <rect width={BOARD_W} height={BOARD_H} fill="rgba(0,0,0,0.55)" />
                {puzzle.board.map((row, r) =>
                  row.map((cell, c) => (
                    <rect
                      key={`${r}-${c}`}
                      x={PAD + c * CELL}
                      y={PAD + r * CELL}
                      width={CELL - 1}
                      height={CELL - 1}
                      rx={1}
                      fill={cell ? (PIECE_COLORS[cell] ?? '#0ea5e9') : 'rgba(255,255,255,0.025)'}
                    />
                  ))
                )}
              </svg>
            </div>
          </Link>
          <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
            click to play
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ flex: '0 0 180px', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '0.75rem' }}>
          {/* Queue */}
          <div>
            <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>
              Queue
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {queueDisplay.map((type, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 4,
                  backgroundColor: PIECE_COLORS[type] ?? '#888',
                  color: '#000', fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                }}>
                  {PIECE_NAMES[type]}
                </span>
              ))}
              {queueExtra > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 10,
                }}>
                  +{queueExtra}
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <Link
              href={`/puzzle/${puzzle.id}`}
              style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                padding: '0.7rem 1.25rem', borderRadius: '8px',
                backgroundColor: solved ? 'transparent' : 'var(--tt-accent)',
                border: solved ? '1px solid color-mix(in srgb, var(--tt-accent) 50%, transparent)' : 'none',
                color: solved ? 'var(--tt-accent)' : '#000',
                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.04em',
              }}
            >
              {solved ? 'Play Again' : 'Play Daily Puzzle'}
            </Link>
            <Link
              href="/puzzle"
              style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
              }}
            >
              See all puzzles →
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
