'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BlockGame from './BlockGame';
import { type PuzzleDifficulty, type PuzzleCategory } from './puzzleData';
import { supabase } from '../app/utils/supabaseClient';
import { useAuth } from './useAuth';


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };
const PIECE_COLORS: Record<number, string> = {
  1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',
};
const CELL_COLORS: Record<number, string> = {
  1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',
};

// ---------------------------------------------------------------------------
// Mini board preview
// ---------------------------------------------------------------------------

function BoardPreview({ board, cellSize = 5 }: { board: number[][]; cellSize?: number }) {
  const PAD = 2;
  const w = 10 * cellSize + PAD * 2;
  const h = 20 * cellSize + PAD * 2;
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.5)" rx={2} />
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={PAD + c * cellSize}
              y={PAD + r * cellSize}
              width={cellSize - 1}
              height={cellSize - 1}
              fill={CELL_COLORS[cell] ?? '#888'}
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
      width: 22, height: 22, borderRadius: 4,
      background: PIECE_COLORS[type] ?? '#888',
      color: '#000', fontSize: 11, fontWeight: 700, flexShrink: 0,
    }}>
      {PIECE_NAMES[type]}
    </span>
  );
}


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapturedPuzzle {
  board: number[][];
  queue: number[];
  timestamp: number;
}

type Phase = 'idle' | 'setup' | 'recording' | 'done';
type RecordMode = 'position' | 'opener';

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function Step({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, opacity: done ? 0.45 : active ? 1 : 0.4 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 700,
        background: done ? 'rgba(74,222,128,0.3)' : active ? 'var(--tt-accent)' : 'rgba(255,255,255,0.1)',
        color: done ? '#4ade80' : active ? '#000' : 'rgba(255,255,255,0.5)',
        border: done ? '1px solid rgba(74,222,120,0.5)' : active ? 'none' : '1px solid rgba(255,255,255,0.15)',
      }}>
        {done ? '✓' : number}
      </div>
      <span style={{ fontSize: 11, color: active ? '#fff' : 'rgba(255,255,255,0.55)', lineHeight: 1.3 }}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PuzzleEditor
// ---------------------------------------------------------------------------

export default function PuzzleEditor() {
  const router = useRouter();

  // Focus mode: game only captures keys when clicked into.
  const [gameFocused, setGameFocused] = useState(false);
  const focusRef = useRef(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (gameAreaRef.current && !gameAreaRef.current.contains(e.target as Node)) {
        setGameFocused(false);
        focusRef.current = false;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const liveStateRef = useRef<{
    board: number[][];
    pieceMatrix: number[][];
    pieceType: number;
    pieceX: number;
    pieceY: number;
    ghostY: number;
    nextPieces: number[];
    holdPiece: number | null;
  } | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const phaseRef = useRef<Phase>('idle');
  const [recordMode, setRecordMode] = useState<RecordMode>('position');
  const [showOpenerPrompt, setShowOpenerPrompt] = useState(false);
  const [usedSetup, setUsedSetup] = useState(false);

  const [frozenBoard, setFrozenBoard] = useState<number[][] | null>(null);
  const piecesRecordedRef = useRef<number[]>([]);
  const [piecesRecorded, setPiecesRecorded] = useState<number[]>([]);
  // When we pre-seed the queue with the in-hand piece at freeze time, the
  // same piece's upcoming lock event must be skipped to avoid double-counting.
  const skipFirstLockRef = useRef(false);

  const [captured, setCaptured] = useState<CapturedPuzzle | null>(null);
  const [gameKey, setGameKey] = useState(0);
  // Imperative handle set by TetrisGame on mount — clears the board without
  // remounting so the current active piece stays as recording piece 0.
  const clearBoardRef = useRef<(() => void) | null>(null);

  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>('easy');
  const [category, setCategory] = useState<PuzzleCategory>('finisher');
  const [description, setDescription] = useState('');

  // Freeze: snapshot the board at this exact moment. liveStateRef.board is
  // always the static board WITHOUT the active piece (TetrisGame never writes
  // the falling piece into board.current — it draws it on the canvas only).
  // We pre-seed the queue with the in-hand piece type right now so it is
  // never excluded — if the piece auto-locks in the same animation frame as
  // the click, onPieceLock fires before this handler runs (phaseRef is still
  // 'idle') and would silently drop it. skipFirstLockRef lets handlePieceLock
  // skip that upcoming lock event to avoid double-counting.
  const handleFreeze = useCallback(() => {
    const live = liveStateRef.current;
    if (!live) return;
    const cleanBoard = live.board.map(row => row.map(v => v >= 8 ? 0 : v));
    setFrozenBoard(cleanBoard);
    piecesRecordedRef.current = [live.pieceType];
    setPiecesRecorded([live.pieceType]);
    skipFirstLockRef.current = true;
    phaseRef.current = 'recording';
    setPhase('recording');
  }, []);

  // onPieceLock: TetrisGame fires this (in sandbox mode) each time a piece
  // locks into the board. We accumulate pieces from freeze → PC.
  const handlePieceLock = useCallback((type: number) => {
    if (phaseRef.current !== 'recording') return;
    if (skipFirstLockRef.current) {
      skipFirstLockRef.current = false;
      return;
    }
    const next = [...piecesRecordedRef.current, type];
    piecesRecordedRef.current = next;
    setPiecesRecorded(next);
  }, []);

  // onAllClear: fires when the board goes fully empty after a sweep in sandbox
  // mode — that's the PC. Finalize the puzzle.
  const handleAllClear = useCallback(() => {
    if (phaseRef.current !== 'recording') return;
    phaseRef.current = 'done';
    setPhase('done');
    setFrozenBoard(prev => {
      const board = prev ?? [];
      setCaptured({
        board: board.map(r => [...r]),
        queue: [...piecesRecordedRef.current],
        timestamp: Date.now(),
      });
      return prev;
    });
  }, []);

  const handleUndo = useCallback((_restoredType: number) => {
    if (phaseRef.current !== 'recording') return;
    if (piecesRecordedRef.current.length > 1) {
      const next = piecesRecordedRef.current.slice(0, -1);
      piecesRecordedRef.current = next;
      setPiecesRecorded(next);
      if (next.length === 1) skipFirstLockRef.current = true;
    } else {
      skipFirstLockRef.current = true;
    }
  }, []);

  const handleRedo = useCallback((replacedType: number) => {
    if (phaseRef.current !== 'recording') return;
    if (skipFirstLockRef.current) {
      skipFirstLockRef.current = false;
      return;
    }
    const next = [...piecesRecordedRef.current, replacedType];
    piecesRecordedRef.current = next;
    setPiecesRecorded(next);
  }, []);

  // "Record Opener PC": shows a prompt asking whether the user needs setup
  // time first. Two paths from there — see handleOpenerPCNow / handleStartSetup.
  const handleOpenerPC = useCallback(() => {
    setShowOpenerPrompt(true);
  }, []);

  // "No — start now": classic empty-board path. Clear the board, keep the
  // current piece at the top, and begin recording immediately.
  const handleOpenerPCNow = useCallback(() => {
    setShowOpenerPrompt(false);
    const live = liveStateRef.current;
    const emptyBoard: number[][] = Array.from({ length: 20 }, () => Array(10).fill(0));
    setFrozenBoard(emptyBoard);
    const initial = live ? [live.pieceType] : [];
    piecesRecordedRef.current = initial;
    setPiecesRecorded(initial);
    skipFirstLockRef.current = live !== null;
    phaseRef.current = 'recording';
    setPhase('recording');
    setRecordMode('opener');
    clearBoardRef.current?.();
  }, []);

  // "Yes — set up first": enters setup phase. Player stacks freely; clicking
  // Ready snapshots the current board and starts recording from that state.
  // Auto-focus the game so the player can immediately stack without having to
  // re-click the board (the "Yes" button click would otherwise unfocus it).
  const handleStartSetup = useCallback(() => {
    setShowOpenerPrompt(false);
    setUsedSetup(true);
    phaseRef.current = 'setup';
    setPhase('setup');
    setRecordMode('opener');
    setGameFocused(true);
    focusRef.current = true;
  }, []);

  // Called when the player clicks "Ready" from the setup phase. Snapshots the
  // current board (same logic as handleFreeze) and transitions to recording.
  const handleReadyFromSetup = useCallback(() => {
    const live = liveStateRef.current;
    if (!live) return;
    const cleanBoard = live.board.map(row => row.map(v => v >= 8 ? 0 : v));
    setFrozenBoard(cleanBoard);
    piecesRecordedRef.current = [live.pieceType];
    setPiecesRecorded([live.pieceType]);
    skipFirstLockRef.current = true;
    phaseRef.current = 'recording';
    setPhase('recording');
  }, []);

  const handleReset = useCallback(() => {
    phaseRef.current = 'idle';
    setPhase('idle');
    setFrozenBoard(null);
    setCaptured(null);
    piecesRecordedRef.current = [];
    setPiecesRecorded([]);
    skipFirstLockRef.current = false;
    setRecordMode('position');
    setShowOpenerPrompt(false);
    setUsedSetup(false);
    setGameKey(k => k + 1);
  }, []);

  const { user, displayName } = useAuth();
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  interface MySubmission { id: string; name: string; difficulty: string; status: string; board: number[][]; queue: number[]; }
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);

  const loadMySubmissions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('puzzle_submissions')
      .select('id, name, difficulty, status, board, queue')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setMySubmissions((data as MySubmission[]) ?? []);
  }, [user]);

  useEffect(() => { loadMySubmissions(); }, [loadMySubmissions]);

  const handleSubmit = useCallback(async () => {
    if (!captured) return;
    setSubmitState('loading');
    const { error } = await supabase.from('puzzle_submissions').insert({
      name: name || 'Untitled',
      difficulty,
      category,
      description: description || null,
      board: captured.board,
      queue: captured.queue,
      author_username: displayName || null,
      author_id: user?.id ?? null,
    });
    if (error) console.error('[puzzle submit]', error.message);
    setSubmitState(error ? 'error' : 'done');
    if (!error) loadMySubmissions();
  }, [captured, name, difficulty, category, description, displayName, user, loadMySubmissions]);

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0',
    }}>

      {/* ── Left panel: controls + guide ── */}
      <div style={{
        width: 200, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <Link href="/puzzle" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 11 }}>
            ← Puzzles
          </Link>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>Puzzle Editor</span>
            <span style={{
              fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
              border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)',
              borderRadius: 3, padding: '1px 4px',
            }}>Dev</span>
          </div>
        </div>

        {/* Steps */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {recordMode === 'opener' ? (
            usedSetup ? (
              <>
                <Step number={1} label="Pick: Opener PC" active={false} done={true} />
                <Step number={2} label="Set up the board" active={phase === 'setup'} done={phase === 'recording' || phase === 'done'} />
                <Step number={3} label="Play & solve the PC" active={phase === 'recording'} done={phase === 'done'} />
                <Step number={4} label="Submit to community" active={phase === 'done'} done={false} />
              </>
            ) : (
              <>
                <Step number={1} label="Pick: Opener PC" active={phase === 'idle'} done={phase !== 'idle'} />
                <Step number={2} label="Play & solve the PC" active={phase === 'recording'} done={phase === 'done'} />
                <Step number={3} label="Submit to community" active={phase === 'done'} done={false} />
              </>
            )
          ) : (
            <>
              <Step number={1} label="Play to a setup" active={phase === 'idle'} done={phase !== 'idle'} />
              <Step number={2} label="Freeze position" active={false} done={phase === 'recording' || phase === 'done'} />
              <Step number={3} label="Solve the PC" active={phase === 'recording'} done={phase === 'done'} />
              <Step number={4} label="Submit to community" active={phase === 'done'} done={false} />
            </>
          )}
        </div>

        {/* Action */}
        <div style={{ padding: '12px 14px', flexShrink: 0 }}>
          {phase === 'idle' && !showOpenerPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={handleOpenerPC}
                style={{
                  width: '100%', background: 'var(--tt-accent)', border: 'none',
                  color: '#000', borderRadius: 6, padding: '8px 0',
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                ⏺ Record Opener PC
              </button>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 1.4 }}>
                Empty board → play → PC auto-detected
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
              <button
                onClick={handleFreeze}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '7px 0',
                  fontFamily: 'monospace', fontSize: 11,
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                ❄ Freeze Position
              </button>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', textAlign: 'center', lineHeight: 1.4 }}>
                Play to a setup, freeze it, then solve
              </div>
            </div>
          )}

          {phase === 'idle' && showOpenerPrompt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, letterSpacing: '0.02em' }}>
                ⏺ Record Opener PC
              </div>
              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5,
                background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '7px 9px',
              }}>
                Need time to set up the board first?
              </div>
              <button
                onClick={handleStartSetup}
                style={{
                  width: '100%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)',
                  color: '#818cf8', borderRadius: 6, padding: '7px 0',
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes — set up first
              </button>
              <button
                onClick={handleOpenerPCNow}
                style={{
                  width: '100%', background: 'var(--tt-accent)', border: 'none',
                  color: '#000', borderRadius: 6, padding: '7px 0',
                  fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                No — start now
              </button>
              <button
                onClick={() => setShowOpenerPrompt(false)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'rgba(255,255,255,0.3)', fontSize: 10,
                  cursor: 'pointer', padding: '2px 0', fontFamily: 'monospace',
                }}
              >
                ← Back
              </button>
            </div>
          )}

          {phase === 'setup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 6, padding: '8px 10px', fontSize: 10,
                color: '#818cf8', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Stack your setup on the board</div>
                <div style={{ opacity: 0.75 }}>
                  Play pieces until the board looks the way you want the puzzle to start. When you&apos;re happy with the position, click Ready — that exact board state will be the puzzle&apos;s starting position.
                </div>
              </div>
              <button
                onClick={handleReadyFromSetup}
                style={{
                  width: '100%', background: 'var(--tt-accent)', border: 'none',
                  color: '#000', borderRadius: 6, padding: '8px 0',
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', letterSpacing: '0.04em',
                }}
              >
                ✓ Ready — Start Recording
              </button>
              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '6px 0',
                  fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {phase === 'recording' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                borderRadius: 6, padding: '8px 10px', fontSize: 11,
                color: '#4ade80', textAlign: 'center', lineHeight: 1.5,
              }}>
                Solve the PC!<br />
                <span style={{ opacity: 0.7, fontSize: 10 }}>Clear the board completely</span>
              </div>
              {frozenBoard && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>Start board</div>
                  <BoardPreview board={frozenBoard} cellSize={4} />
                </div>
              )}
              {piecesRecorded.length > 0 && (
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                    Pieces placed ({piecesRecorded.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {piecesRecorded.map((t, i) => <PieceBadge key={i} type={t} />)}
                  </div>
                </div>
              )}
              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '6px 0',
                  fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {phase === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)',
                borderRadius: 6, padding: '8px 10px', fontSize: 11,
                color: '#a78bfa', textAlign: 'center',
              }}>
                PC captured ✓
              </div>
              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '6px 0',
                  fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                }}
              >
                Start over
              </button>
            </div>
          )}
        </div>

        {/* My Submissions */}
        {user && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '10px 0 6px' }}>
              My Submissions ({mySubmissions.length})
            </div>
            {mySubmissions.length === 0 ? (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: '4px 0 0', lineHeight: 1.5 }}>
                No submissions yet.<br />Capture a PC and submit.
              </p>
            ) : (
              mySubmissions.map((s) => {
                const statusColor = s.status === 'approved' ? '#4ade80' : s.status === 'rejected' ? '#f87171' : '#fbbf24';
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <BoardPreview board={s.board} cellSize={3} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <span style={{ fontSize: 8, color: statusColor, border: `1px solid ${statusColor}55`, borderRadius: 3, padding: '0 4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          {s.status}
                        </span>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>{s.difficulty}</span>
                      </div>
                      {s.status === 'approved' && (
                        <Link href={`/puzzle/${s.id}`} target="_blank" style={{ fontSize: 8, color: 'var(--tt-accent)', textDecoration: 'none', display: 'block', marginTop: 2 }}>
                          Play →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ── Center: live game ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', background: 'rgba(0,0,0,0.2)', position: 'relative',
      }}>
        {phase !== 'idle' && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: phase === 'setup' ? 'rgba(99,102,241,0.15)' : phase === 'recording' ? 'rgba(74,222,128,0.15)' : 'rgba(167,139,250,0.15)',
            border: `1px solid ${phase === 'setup' ? 'rgba(99,102,241,0.4)' : phase === 'recording' ? 'rgba(74,222,128,0.4)' : 'rgba(167,139,250,0.4)'}`,
            color: phase === 'setup' ? '#818cf8' : phase === 'recording' ? '#4ade80' : '#a78bfa',
            borderRadius: 20, padding: '4px 14px', fontSize: 11,
            letterSpacing: '0.06em', zIndex: 10, whiteSpace: 'nowrap',
          }}>
            {phase === 'setup'
              ? '◎ Setup — stack pieces, then click Ready'
              : phase === 'recording'
              ? `● ${recordMode === 'opener' ? 'Opener PC' : 'Recording'} — ${piecesRecorded.length} piece${piecesRecorded.length === 1 ? '' : 's'} placed`
              : '✓ PC captured — fill in details on the right'}
          </div>
        )}
        {/* Game with click-to-focus overlay */}
        <div
          ref={gameAreaRef}
          style={{ position: 'relative', flexShrink: 0, transform: 'scale(1.2)', transformOrigin: 'center center', margin: '60px 30px' }}
        >
          <BlockGame
            key={gameKey}
            mode="standard"
            liveStateRef={liveStateRef}
            focusRef={focusRef}
            clearBoardRef={clearBoardRef}
            onMenu={() => router.push('/puzzle')}
            suppressCountdown
            onPieceLock={handlePieceLock}
            onAllClear={handleAllClear}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
          {!gameFocused && (
            <div
              onClick={() => { setGameFocused(true); focusRef.current = true; }}
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(0,0,0,0.6)', cursor: 'pointer', userSelect: 'none',
              }}
            >
              <div style={{ fontSize: 28, opacity: 0.6 }}>▶</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', letterSpacing: 1, textAlign: 'center', lineHeight: 1.5 }}>
                Click to play<br />
                <span style={{ fontSize: 9, opacity: 0.6 }}>Click outside to type</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: output ── */}
      <div style={{
        width: 340, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Puzzle Output
          </span>
        </div>

        {!captured ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.18)', fontSize: 12, textAlign: 'center', padding: 24,
          }}>
            {phase === 'idle'
              ? 'Play to a position, press Freeze, then clear the board'
              : 'Keep playing — waiting for a perfect clear…'}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>Start</div>
                <BoardPreview board={captured.board} cellSize={5} />
              </div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>
                  Queue ({captured.queue.length}pc)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {captured.queue.map((t, i) => <PieceBadge key={i} type={t} />)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TKI Opener"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: '#fff', fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>Difficulty</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value as PuzzleDifficulty)}
                    style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 8px', color: '#fff', fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value as PuzzleCategory)}
                    style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 8px', color: '#fff', fontFamily: 'monospace', fontSize: 12, colorScheme: 'dark' }}>
                    <option value="opening">Opening</option>
                    <option value="middlegame">Middlegame</option>
                    <option value="finisher">Finisher</option>
                    <option value="survival">Survival</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 3 }}>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short hint for players"
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: '#fff', fontFamily: 'monospace', fontSize: 12 }} />
              </div>
            </div>

            {/* Share with Community */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
                Share with Community
              </div>
              {submitState === 'done' ? (
                <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5 }}>
                  ✓ Submitted! It&apos;ll appear on the community page once reviewed.
                </div>
              ) : (
                <>
                  {user && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                      Submitting as <span style={{ color: 'rgba(255,255,255,0.7)' }}>{displayName}</span>
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitState === 'loading'}
                    style={{
                      width: '100%',
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)',
                      color: '#818cf8', borderRadius: 6, padding: '7px 0',
                      fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                      cursor: submitState === 'loading' ? 'default' : 'pointer',
                      opacity: submitState === 'loading' ? 0.6 : 1,
                    }}
                  >
                    {submitState === 'loading' ? 'Submitting…' : submitState === 'error' ? '✕ Error — try again' : '↑ Submit to Community'}
                  </button>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
                    {user ? 'Pending review before it appears publicly.' : 'Sign in to link your submission to your account.'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
