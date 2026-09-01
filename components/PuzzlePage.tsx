'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TetrisGame from './TetrisGame';
import { type Puzzle, DIFFICULTY_COLORS, CATEGORY_LABELS, PUZZLES } from './puzzleData';

// ---------------------------------------------------------------------------
// Persist solve
// ---------------------------------------------------------------------------

function markSolved(id: string) {
  try {
    const raw = localStorage.getItem('puzzle-solved');
    const set: string[] = JSON.parse(raw ?? '[]');
    if (!set.includes(id)) {
      localStorage.setItem('puzzle-solved', JSON.stringify([...set, id]));
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// Piece name helper
// ---------------------------------------------------------------------------
const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };

// ---------------------------------------------------------------------------
// Result overlay
// ---------------------------------------------------------------------------

function ResultOverlay({
  result,
  puzzle,
  onRetry,
  nextPuzzle,
}: {
  result: 'pass' | 'fail';
  puzzle: Puzzle;
  onRetry: () => void;
  nextPuzzle: Puzzle | null;
}) {
  const isPass = result === 'pass';
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: isPass
        ? 'radial-gradient(ellipse at center, rgba(74,222,128,0.18) 0%, rgba(0,0,0,0.88) 70%)'
        : 'radial-gradient(ellipse at center, rgba(248,113,113,0.18) 0%, rgba(0,0,0,0.88) 70%)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ textAlign: 'center', fontFamily: 'monospace', padding: '0 24px' }}>
        <div style={{
          fontSize: isPass ? 64 : 48, lineHeight: 1, marginBottom: 12,
        }}>
          {isPass ? '✓' : '✗'}
        </div>
        <h2 style={{
          color: isPass ? '#4ade80' : '#f87171',
          fontSize: 28, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', margin: '0 0 6px',
        }}>
          {isPass ? 'Perfect Clear!' : 'Pieces Used Up'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '0 0 28px' }}>
          {isPass
            ? `${puzzle.name} — solved`
            : 'The board wasn\'t cleared. Try again!'}
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onRetry}
            style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 6, padding: '8px 20px',
              fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            Try Again
          </button>

          {isPass && nextPuzzle && (
            <Link
              href={`/puzzle/${nextPuzzle.id}`}
              style={{
                background: 'var(--tt-accent)', border: 'none',
                color: '#000', borderRadius: 6, padding: '8px 20px',
                fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
                letterSpacing: '0.05em', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              Next Puzzle →
            </Link>
          )}

          <Link
            href="/puzzle"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '8px 20px',
              fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
              letterSpacing: '0.05em', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center',
            }}
          >
            All Puzzles
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main puzzle page
// ---------------------------------------------------------------------------

export default function PuzzlePage({ puzzle }: { puzzle: Puzzle }) {
  const router = useRouter();
  const [result, setResult] = useState<'playing' | 'pass' | 'fail'>('playing');
  const [gameKey, setGameKey] = useState(0);
  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty];

  const currentIdx = PUZZLES.findIndex(p => p.id === puzzle.id);
  const nextPuzzle = currentIdx >= 0 && currentIdx < PUZZLES.length - 1
    ? PUZZLES[currentIdx + 1]
    : null;

  const handlePass = useCallback(() => {
    markSolved(puzzle.id);
    setResult('pass');
  }, [puzzle.id]);

  const handleFail = useCallback(() => {
    setResult('fail');
  }, []);

  const handleRetry = useCallback(() => {
    setResult('playing');
    setGameKey(k => k + 1);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <Link href="/puzzle" style={{
          color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← Puzzles
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{puzzle.name}</span>
        <span style={{
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'capitalize',
          color: diffColor, fontWeight: 700,
        }}>
          {puzzle.difficulty}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {CATEGORY_LABELS[puzzle.category]}
        </span>
      </div>

      {/* Main area */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 40, padding: '24px', overflow: 'hidden',
      }}>
        {/* Left info panel */}
        <div style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              Goal
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {puzzle.description}
            </p>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              Pieces
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {puzzle.queue.map((t, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 4,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                }}>
                  {PIECE_NAMES[t]}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              Objective
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              Place all pieces to completely clear the board — no cells remaining.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
              Controls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {[
                ['← →', 'Move'],
                ['↑ / X', 'Rotate CW'],
                ['Z', 'Rotate CCW'],
                ['Space', 'Hard drop'],
                ['↓', 'Soft drop'],
                ['C', 'Hold'],
                ['R', 'Restart'],
              ].map(([key, label]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.08)', borderRadius: 3,
                    padding: '1px 5px', color: 'rgba(255,255,255,0.7)',
                  }}>{key}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game area */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {/* Scale TetrisGame up for better puzzle visibility */}
          <div style={{
            transform: 'scale(1.15)',
            transformOrigin: 'center center',
          }}>
            <TetrisGame
              key={gameKey}
              mode="standard"
              initialBoard={puzzle.board.map(r => [...r])}
              fixedQueue={[...puzzle.queue]}
              onPerfectClear={handlePass}
              onQueueExhausted={handleFail}
              suppressPauseOverlay
              suppressCountdown
              onMenu={() => router.push('/puzzle')}
            />
          </div>

          {/* Result overlay covers the scaled TetrisGame */}
          {result !== 'playing' && (
            <div style={{
              position: 'absolute',
              // Extend the overlay to cover the scaled (1.15×) game area
              inset: '-8%',
              zIndex: 50,
            }}>
              <ResultOverlay
                result={result}
                puzzle={puzzle}
                onRetry={handleRetry}
                nextPuzzle={nextPuzzle}
              />
            </div>
          )}
        </div>

        {/* Right spacer (mirror left panel width for centering) */}
        <div style={{ width: 200, flexShrink: 0 }} />
      </div>
    </div>
  );
}
