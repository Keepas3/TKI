'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlockGame from './BlockGame';
import { type Puzzle, DIFFICULTY_COLORS, CATEGORY_LABELS, PUZZLES } from './puzzleData';

type Controls = Record<string, string>;

function loadControls(): Controls {
  const defaults: Controls = {
    'Left': 'ArrowLeft', 'Right': 'ArrowRight', 'Down': 'ArrowDown',
    'Rotate CW': 'ArrowUp', 'Rotate CCW': 'z', 'Rotate 180': 'a',
    'Hard Drop': ' ', 'Hold': 'c',
    'Undo': 'u', 'Redo': 'y', 'Toggle 0-G': 'g',
  };
  try {
    const saved = localStorage.getItem('gameControls') ?? localStorage.getItem('tetrisControls');
    if (saved) return { ...defaults, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return defaults;
}

function fmtKey(k: string): string {
  if (k === ' ') return 'Space';
  return k.replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('ArrowUp', '↑').replace('ArrowDown', '↓');
}

function markSolved(id: string) {
  try {
    const raw = localStorage.getItem('puzzle-solved');
    const set: string[] = JSON.parse(raw ?? '[]');
    if (!set.includes(id)) {
      localStorage.setItem('puzzle-solved', JSON.stringify([...set, id]));
    }
  } catch {}
}

const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };

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
        <div style={{ fontSize: isPass ? 64 : 48, lineHeight: 1, marginBottom: 12 }}>
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

export default function PuzzlePage({ puzzle }: { puzzle: Puzzle }) {
  const router = useRouter();
  const [result, setResult] = useState<'playing' | 'pass' | 'fail'>('playing');
  const [gameKey, setGameKey] = useState(0);
  const [controls, setControls] = useState<Controls>({});
  const [piecesPlaced, setPiecesPlaced] = useState(0);
  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty];

  useEffect(() => { setControls(loadControls()); }, []);

  const handlePiecePlaced = useCallback((remaining?: number) => {
    if (remaining !== undefined) setPiecesPlaced(puzzle.queue.length - remaining);
  }, [puzzle.queue.length]);

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
    setPiecesPlaced(0);
    setGameKey(k => k + 1);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
      fontFamily: 'monospace',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 20px', borderBottom: '1px solid var(--tt-border)',
        flexShrink: 0,
      }}>
        <Link href="/puzzle" style={{
          color: 'var(--tt-text-muted)', textDecoration: 'none', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← Puzzles
        </Link>
        <span style={{ color: 'var(--tt-text-dim)' }}>|</span>
        <span style={{ color: 'var(--tt-text)', fontSize: 13, fontWeight: 600 }}>{puzzle.name}</span>
        <span style={{
          fontSize: 10, letterSpacing: '0.08em', textTransform: 'capitalize',
          color: diffColor, fontWeight: 700,
        }}>
          {puzzle.difficulty}
        </span>
        <span style={{ fontSize: 10, color: 'var(--tt-text-faint)' }}>
          {CATEGORY_LABELS[puzzle.category]}
        </span>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 40, padding: '24px', overflow: 'hidden',
      }}>
        <div style={{
          width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)', marginBottom: 6 }}>
              Goal
            </div>
            <p style={{ color: 'var(--tt-text-muted)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {puzzle.description}
            </p>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)', marginBottom: 6 }}>
              Pieces
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {puzzle.queue.map((t, i) => {
                const placed = i < piecesPlaced;
                const active = i === piecesPlaced && result === 'playing';
                return (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 4,
                    background: placed ? 'transparent' : 'var(--tt-kbd-bg)',
                    border: active
                      ? '1px solid var(--tt-accent)'
                      : placed
                        ? '1px solid var(--tt-border)'
                        : '1px solid var(--tt-border-strong)',
                    color: placed ? 'var(--tt-text-faint)' : active ? 'var(--tt-accent)' : 'var(--tt-text)',
                    fontSize: 11, fontWeight: 700,
                    opacity: placed ? 0.35 : 1,
                    textDecoration: placed ? 'line-through' : 'none',
                  }}>
                    {PIECE_NAMES[t]}
                  </span>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)', marginBottom: 6 }}>
              Pieces Left
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: result === 'playing' ? 'var(--tt-text)' : result === 'pass' ? '#4ade80' : '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                {Math.max(0, puzzle.queue.length - piecesPlaced)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--tt-text-faint)' }}>/ {puzzle.queue.length}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)', marginBottom: 6 }}>
              Objective
            </div>
            <p style={{ color: 'var(--tt-text-muted)', fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              Place all pieces to completely clear the board — no cells remaining.
            </p>
          </div>

          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)', marginBottom: 6 }}>
              Controls
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {([
                [`${fmtKey(controls['Left'] ?? 'ArrowLeft')} ${fmtKey(controls['Right'] ?? 'ArrowRight')}`, 'Move'],
                [fmtKey(controls['Rotate CW'] ?? 'ArrowUp'), 'Rotate CW'],
                [fmtKey(controls['Rotate CCW'] ?? 'z'), 'Rotate CCW'],
                [fmtKey(controls['Hard Drop'] ?? ' '), 'Hard drop'],
                [fmtKey(controls['Down'] ?? 'ArrowDown'), 'Soft drop'],
                [fmtKey(controls['Hold'] ?? 'c'), 'Hold'],
                [fmtKey(controls['Undo'] ?? 'u'), 'Undo'],
                [fmtKey(controls['Redo'] ?? 'y'), 'Redo'],
                [fmtKey(controls['Toggle 0-G'] ?? 'g'), '0-G toggle'],
              ] as [string, string][]).map(([key, label]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                  <span style={{
                    background: 'var(--tt-kbd-bg)', borderRadius: 3,
                    padding: '1px 5px', color: 'var(--tt-kbd-text)',
                  }}>{key}</span>
                  <span style={{ color: 'var(--tt-text-faint)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ transform: 'scale(1.15)', transformOrigin: 'center center', margin: '60px 80px' }}>
            <BlockGame
              key={gameKey}
              mode="standard"
              initialBoard={puzzle.board.map(r => [...r])}
              fixedQueue={[...puzzle.queue]}
              onPerfectClear={handlePass}
              onQueueExhausted={handleFail}
              onPiecePlaced={handlePiecePlaced}
              suppressPauseOverlay
              suppressCountdown
              limitedSandbox
              onMenu={() => router.push('/puzzle')}
            />
          </div>

          {result !== 'playing' && (
            <div style={{
              position: 'absolute',
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

        <div style={{ width: 200, flexShrink: 0 }} />
      </div>
    </div>
  );
}
