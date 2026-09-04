'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { COLS, ROWS, BLOCK_SIZE, COLORS, PIECES } from './gameConstants';
import { supabase } from '../app/utils/supabaseClient'; 

// Mirrors useOnlineRoom's BoardSnapshotPayload minus guestId — one object
// param rather than positional args, since this has grown from 5 fields
// (board/piece position/lives) to 10+ (co-op's score/level/lines/next/hold
// on top) and stays readable at every call site this way.
interface BoardSnapshot {
  board: number[][];
  pieceMatrix: number[][];
  pieceX: number;
  pieceY: number;
  livesRemaining: number;
  score: number;
  level: number;
  lines: number;
  next: number[];
  hold: number | null;
  // Co-op / teams-coop only, present only on an actual lock broadcast —
  // see the isCoop/isTeamsCoop adopt-effect for why board sync is
  // merge-only, not a wholesale `board` replace.
  lockedPieceMatrix?: number[][];
  lockedPieceX?: number;
  lockedPieceY?: number;
  // Teams-coop only, present only on the lock broadcast where this client
  // actually applied incoming garbage — see insertGarbageRows and the
  // adopt-effect's replay-not-reroll handling.
  insertedGarbageCount?: number;
  insertedGarbageGapCol?: number;
  // Teams-coop only, present only on the broadcast fired at the exact
  // moment this client soft-reset after topping out with team lives left.
  sharedBoardCleared?: boolean;
  // Garbage queued but not yet inserted — broadcast so opponents can see
  // incoming pressure on the preview board.
  pendingGarbage?: number;
}

interface BlockGameProps {
  mode: string;
  onMenu: () => void;
  // Versus-mode-only bridge to the room's Realtime channel (owned by
  // VersusApp/useOnlineRoom) — TetrisGame stays otherwise unaware of
  // Supabase, it just sends/receives plain data through these.
  onAttack?: (amount: number) => void;
  incomingGarbage?: { amount: number; seq: number } | null;
  // Win condition is last-player-standing: onEliminated fires once when this
  // client tops out, eliminatedOpponentIds grows as opponents broadcast their
  // own eliminations, and opponentIds is the match's starting roster (a
  // snapshot, not live presence — see VersusApp) — once every id in
  // opponentIds also appears in eliminatedOpponentIds, this client has
  // outlasted the room. Checking actual membership (not just comparing
  // lengths) matters: eliminatedOpponentIds is a room-lifetime set that only
  // gets cleared on rematch, so a stale id left over from a previous match
  // could otherwise satisfy a plain count check against a brand new,
  // unrelated roster.
  onEliminated?: () => void;
  eliminatedOpponentIds?: string[];
  // Full match roster, used both by the win-condition check above and to
  // seed a preview slot for every opponent from the moment the match starts
  // — opponentBoards below only gets an entry once that opponent's first
  // piece locks, so without this, previews would pop in one at a time as a
  // bigger lobby's players each place their first piece instead of all
  // being visible (empty) immediately.
  opponentIds?: string[];
  // Teams mode only. The win-condition check needs "every player on every
  // *other* team," not "every other player" — opponentIds stays the latter
  // (so the preview column can still show teammates), and this narrower
  // roster is what the win-check effect actually watches when present,
  // falling back to opponentIds when it's not (every other mode). See
  // VersusApp's matchOpponents/matchSelfTeam for how this is derived.
  enemyIds?: string[];
  // Teams mode only — guestId -> team number, from the same match-start
  // roster snapshot opponentIds/opponentNicknames come from. Drives the
  // preview column's team-grouped layout below.
  opponentTeams?: Record<string, number>;
  // Teams mode only — this client's own team, so the preview column can
  // label its own team's group distinctly ("Your Team") from the others.
  selfTeam?: number;
  // Keeps the room alive and returns to the lobby's ready-up screen, unlike
  // onMenu (full leave) — used by the post-match "Rematch" button, and also
  // by a passed mid-match quit vote (see quitVotes below), since both mean
  // the same thing: match's over, go back to this room's lobby together.
  onRematchMenu?: () => void;
  // Natural-game-end redirect — distinct from onRematchMenu so the group
  // quit-vote pass (which also calls onRematchMenu) can go back to the room
  // lobby while a real match finish goes home. Called automatically after a
  // 5-second delay once LEADERBOARD is reached in non-arena multiplayer, and
  // also wired to the post-match button for those modes.
  onMatchHome?: () => void;
  // Shared 7-bag RNG seed (from useOnlineRoom's matchSeed) so both players
  // see the identical piece sequence — see the mulberry32/generateBag setup.
  seed?: number;
  // Host-chosen room setting (from useOnlineRoom's matchStartingLevel),
  // defaulting to 1 — everyone in the match starts at this level instead of
  // always level 1, and the level-up-every-10-lines formula below is offset
  // from it rather than reset to it.
  startingLevel?: number;
  // Hard ceiling on the level gravity can reach via line clears — the level
  // still climbs visually but dropInterval won't go below calculateDropInterval
  // (maxLevel). Useful for modes that want controlled top-speed (e.g. Journey).
  maxLevel?: number;
  // Host-chosen room setting (from useOnlineRoom's matchLives), defaulting
  // to 1 — topping out with lives remaining soft-resets the board (like
  // sandbox's board-clear) instead of ending the match; only running out of
  // lives is a real elimination. See handleGameOver's versus branch.
  lives?: number;
  // Opponent board previews, rendered as small MiniBoard grids — one entry
  // per opponent, however many that is. Sent once per lock (see lockPiece)
  // AND periodically during play (see PREVIEW_BROADCAST_INTERVAL_MS in the
  // game loop), so previews track live movement/gravity, not just spawns.
  // pieceMatrix/pieceX/pieceY are the opponent's actual current piece shape
  // and position (already rotated), not just a type to re-derive a spawn
  // position from. livesRemaining is their current life count (see `lives`).
  // score/level/lines are co-op-only (see isCoop) — the sender's team-shared
  // values, adopted verbatim by the receiving client alongside `board`.
  // next/hold are co-op + sharedNextHold only — see BoardSnapshot.
  onBoardUpdate?: (snapshot: BoardSnapshot) => void;
  opponentBoards?: (BoardSnapshot & { guestId: string })[];
  // guestId -> nickname, from the same match-start roster snapshot opponentIds
  // comes from — labels each preview board so previews read as "who," not
  // just "how many." Falls back to a truncated guestId (matching OnlineLobby's
  // own fallback) for anyone who never set one.
  opponentNicknames?: Record<string, string>;
  // Fired once on a win — VersusApp owns the actual session win counter
  // (displayed in OnlineLobby instead of here, since this component fully
  // remounts every match and the counter needs to survive that).
  onMatchWin?: () => void;
  // Mid-match Quit is a vote, not a unilateral leave (see the quit-vote
  // effect below) — quitVotes/selfQuitVote are the same raw broadcast state
  // useOnlineRoom exposes for Ready/Unready, just for the quit vote instead.
  // onQuitVote/onRetractQuitVote cast/retract this client's own vote;
  // quitVoteDeadline is the shared window-close timestamp every client
  // agrees on (see QUIT_VOTE_WINDOW_MS in useOnlineRoom.ts).
  quitVotes?: Set<string>;
  selfQuitVote?: boolean;
  quitVoteDeadline?: number | null;
  onQuitVote?: () => void;
  onRetractQuitVote?: () => void;
  // Co-op only — when true, Hold becomes one shared slot (adopted verbatim
  // from the partner's broadcast, same rule as `board`) and each player's
  // Next queue is shown to their partner as a read-only preview. Defaults
  // to false/unset, matching Phase A's behavior exactly.
  sharedNextHold?: boolean;
  // Opt-in ruleset toggle, independent of `mode` — when true, gravity is
  // driven by elapsed match time instead of this player's own line clears
  // (ramping linearly up to ARENA_GRAVITY_MAX_LEVEL over ARENA_GRAVITY_RAMP_MS,
  // see the update() loop), and past that ramp, unclearable "sudden death"
  // rows rise from the bottom on a fixed schedule (see insertUnclearableRow)
  // to guarantee a match ends within bounded time regardless of how well
  // anyone plays. Built as a standalone prop rather than a `mode === 'arena'`
  // check specifically so any future mode can opt in the same way Arena does
  // (see ArenaApp.tsx) without touching this mechanism at all. Off by
  // default — every existing mode keeps its current per-line-clear leveling.
  timeBasedGravity?: boolean;
  // Written every frame by the game loop so the Study editor can read the
  // current board + active piece + ghost position on demand (freeze button).
  // Only written when this ref is provided; has no effect on other callers.
  liveStateRef?: React.MutableRefObject<{
    board: number[][];
    pieceMatrix: number[][];
    pieceType: number;
    pieceX: number;
    pieceY: number;
    ghostY: number;
    nextPieces: number[];
    holdPiece: number | null;
  } | null>;
  // Seed the piece queue and hold at mount — used by Study's "play from here"
  // so the viewer starts with the exact same upcoming pieces the author had.
  initialNextPieces?: number[];
  initialHoldPiece?: number | null;
  // Place a specific piece at a specific position at mount instead of spawning
  // from the queue. The matrix is already rotated; x/y is the exact position
  // the author had when they froze.
  initialActivePiece?: { type: number; x: number; y: number; matrix: number[][] } | null;
  // When provided, the game checks this ref before processing any keyboard
  // input and before running the playing-frame update. When false the game
  // pauses and ignores keys — used by the Study editor so typing in text
  // fields doesn't collide with game bindings (space, z, x, g, etc.).
  focusRef?: React.MutableRefObject<boolean>;
  // Pre-filled board state — used by Block Study's "play from here" feature
  // so viewers/editors can start a practice session from a specific position.
  // Deep-copied at mount time so TetrisGame never mutates the caller's array.
  initialBoard?: number[][];
  // Puzzle mode: fixed piece sequence that won't refill from the bag.
  // onPerfectClear fires when the board is completely empty after a line clear.
  // onQueueExhausted fires when pieces run out without a perfect clear.
  // Both freeze the game so the caller can overlay pass/fail UI on top.
  // suppressPauseOverlay hides the built-in "PAUSED" banner so the caller's
  // overlay isn't obscured.
  fixedQueue?: number[];
  onPerfectClear?: () => void;
  onQueueExhausted?: () => void;
  suppressPauseOverlay?: boolean;
  suppressCountdown?: boolean;
  // Sandbox/editor callbacks — fired from lockPiece in isSandboxRules mode.
  onPieceLock?: (pieceType: number) => void;
  onAllClear?: () => void;
  onUndo?: (restoredPieceType: number) => void;
  onRedo?: (replacedPieceType: number) => void;
  // PuzzleEditor: imperative handle to clear the board in place without
  // remounting or touching the piece queue. Lets "Record Opener PC" keep
  // the current active piece as the recording's first piece instead of
  // starting a fresh random bag.
  clearBoardRef?: React.MutableRefObject<(() => void) | null>;
  // Journey-mode event callbacks — thin emitters fired from the game engine,
  // work for any mode. JourneyApp wires these to track challenge progress
  // without TetrisGame knowing anything about challenge state.
  onTRotate?: (type: 'single' | 'double' | 'triple') => void;
  onLinesCleared?: (count: number, isQuad: boolean, isPerfectClear: boolean) => void;
  onCombo?: (streak: number) => void;
  // remaining is passed in fixedQueue (puzzle) mode; undefined otherwise.
  onPiecePlaced?: (remaining?: number) => void;
  onTopout?: () => void;
  // Build Battle: freeze all input + gravity so the board is locked in place
  // when the timer expires. The board state can still be read externally for
  // scoring; pieces just stop responding and falling.
  inputFrozen?: boolean;
  // Build Battle: imperative spawn handle populated at mount — the piece
  // picker calls this to queue a specific piece type (1–7) instead of
  // waiting for the random bag. Only works when mode is isSandboxRules.
  externalSpawnRef?: React.MutableRefObject<((type: number) => void) | null>;
  // Build Battle: skip sweepLines after each lock so completed rows are NOT
  // cleared — lets players build arbitrary structures including full rows.
  noLineClear?: boolean;
  // Puzzle player mode: keep undo/redo/gravity but disable piece-spawn hotkeys
  // (1-7) and the Clear Board action so the player can't alter the queue or
  // blank the initial setup. The sandbox panel still shows undo/redo/gravity.
  limitedSandbox?: boolean;
  // Siege: Commander powerup effects on this P1's board
  fogActive?: boolean;
  boardPaused?: boolean;
  gravityMultiplier?: number;
  lockRotationActive?: boolean;
  incomingLineClear?: { count: number; seq: number };
  incomingClearBoard?: number;
  incomingMinoCannon?: { pieceType: number; column: number; seq: number };
}

interface ScoreEntry {
  name: string;
  score: number;
  level: number;
  mode: string;
}

const MAX_LEADERBOARD = 8;
const SPRINT_GOAL = 40;
const BLITZ_TIME_LIMIT = 3 * 60 * 1000; // 3 minutes in milliseconds
// Versus-only: how often the game loop broadcasts this client's live board +
// active piece to opponents (see the `update()` loop and MiniBoard), on top
// of the existing once-per-lock broadcast. Frequent enough to read as
// "closely following" their actual play, throttled well below per-frame so
// it doesn't flood the Realtime channel.
const PREVIEW_BROADCAST_INTERVAL_MS = 200;
// Piece type (matches PIECES/COLORS indexing) paired with its rebindable
// action name — defaults to keys 1-7 in that same order (I, O, T, S, Z, J, L).
const SPAWN_HOTKEY_ACTIONS = [
  { type: 1, action: 'Spawn I' as const },
  { type: 2, action: 'Spawn O' as const },
  { type: 3, action: 'Spawn T' as const },
  { type: 4, action: 'Spawn S' as const },
  { type: 5, action: 'Spawn Z' as const },
  { type: 6, action: 'Spawn J' as const },
  { type: 7, action: 'Spawn L' as const },
  { type: 10, action: 'Spawn 1×1' as const },
  { type: 11, action: 'Spawn 1×2' as const },
  { type: 12, action: 'Spawn Tri' as const },
];

// The board-level (non-piece) sandbox hotkeys, shown in their own small grid.
const SANDBOX_GENERAL_HOTKEY_ACTIONS = ['Undo', 'Redo', 'Clear Board', 'Toggle 0-G'] as const;

// Every sandbox-only action name (general + piece), rebindable the same way
// as the regular keybinds but kept out of the main Keybinds grid since they
// only do anything in standard/sandbox mode.
const SANDBOX_HOTKEY_ACTIONS = [
  ...SANDBOX_GENERAL_HOTKEY_ACTIONS,
  ...SPAWN_HOTKEY_ACTIONS.map((p) => p.action),
] as const;

// ==========================================
// 1. PURE ENGINE FUNCTIONS
// ==========================================

export const formatTime = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const calculateDropInterval = (level: number) => {
  const speed = Math.pow(0.8 - ((level - 1) * 0.007), level - 1) * 1000;
  return speed < 15 ? 0 : speed;
};

// Named gravity speeds used in sandbox/study/puzzle modes.
const GRAVITY_TIERS = [
  { name: 'Slow',    level: 3  },
  { name: 'Relaxed', level: 6  },
  { name: 'Medium',  level: 10 },
  { name: 'Fast',    level: 14 },
  { name: 'Instant', level: 20 },
] as const;
const SANDBOX_DEFAULT_TIER = 0;

const WALL_KICKS: Record<string, {x: number, y: number}[]> = {
  '0-1': [{x:0,y:0}, {x:-1,y:0}, {x:-1,y:-1}, {x:0,y:2},  {x:-1,y:2}],
  '1-0': [{x:0,y:0}, {x:1,y:0},  {x:1,y:1},   {x:0,y:-2}, {x:1,y:-2}],
  '1-2': [{x:0,y:0}, {x:1,y:0},  {x:1,y:1},   {x:0,y:-2}, {x:1,y:-2}],
  '2-1': [{x:0,y:0}, {x:-1,y:0}, {x:-1,y:-1}, {x:0,y:2},  {x:-1,y:2}],
  '2-3': [{x:0,y:0}, {x:1,y:0},  {x:1,y:-1},  {x:0,y:2},  {x:1,y:2}],
  '3-2': [{x:0,y:0}, {x:-1,y:0}, {x:-1,y:1},  {x:0,y:-2}, {x:-1,y:-2}],
  '3-0': [{x:0,y:0}, {x:-1,y:0}, {x:-1,y:1},  {x:0,y:-2}, {x:-1,y:-2}],
  '0-3': [{x:0,y:0}, {x:1,y:0},  {x:1,y:-1},  {x:0,y:2},  {x:1,y:2}],
};

const I_WALL_KICKS: Record<string, {x: number, y: number}[]> = {
  '0-1': [{x:0,y:0}, {x:-2,y:0}, {x:1,y:0},  {x:-2,y:1},  {x:1,y:-2}],
  '1-0': [{x:0,y:0}, {x:2,y:0},  {x:-1,y:0}, {x:2,y:-1},  {x:-1,y:2}],
  '1-2': [{x:0,y:0}, {x:-1,y:0}, {x:2,y:0},  {x:2,y:1},   {x:-1,y:-2}],
  '2-1': [{x:0,y:0}, {x:1,y:0},  {x:-2,y:0}, {x:1,y:2},   {x:-2,y:-1}],
  '2-3': [{x:0,y:0}, {x:2,y:0},  {x:-1,y:0}, {x:2,y:-1},  {x:-1,y:2}],
  '3-2': [{x:0,y:0}, {x:1,y:0},  {x:-2,y:0}, {x:-2,y:1},  {x:1,y:-2}],
  '3-0': [{x:0,y:0}, {x:-1,y:0}, {x:2,y:0},  {x:-1,y:-2}, {x:2,y:1}],
  '0-3': [{x:0,y:0}, {x:-1,y:0}, {x:2,y:0},  {x:-1,y:-2}, {x:2,y:1}],
};

const KICKS_180 = [{x:0, y:0}, {x:0, y:-1}, {x:-1, y:0}, {x:1, y:0}, {x:0, y:1}];

// Deterministic PRNG (mulberry32) — used only in versus mode, seeded
// identically on both clients, so both boards see the same piece sequence.
// Solo modes keep using plain Math.random() via generateBag's default.
const mulberry32 = (seed: number) => {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateBag = (rand: () => number = Math.random) => {
  const bag = [1, 2, 3, 4, 5, 6, 7];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
};

export const createMatrix = (w: number, h: number) =>
  Array.from({ length: h }, () => Array(w).fill(0));

// Shared placeholder for an opponent's preview before their board-snapshot
// broadcast has arrived — MiniBoard only reads it, never mutates it, so one
// shared instance is safe across every placeholder slot.
const EMPTY_MINI_BOARD = createMatrix(COLS, ROWS);

const collide = (boardMatrix: number[][], playerPiece: { matrix: number[][], pos: { x: number, y: number } }) => {
  const m = playerPiece.matrix;
  const o = playerPiece.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (boardMatrix[y + o.y] && boardMatrix[y + o.y][x + o.x]) !== 0) return true;
    }
  }
  return false;
};

const merge = (boardMatrix: number[][], playerPiece: { matrix: number[][], pos: { x: number, y: number } }) => {
  playerPiece.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value === 0) return;
      // Bounds-checked: normally guaranteed in-range for the local player's
      // own lock (collide() already validated pos against this exact
      // board), but teams-coop's adopt-effect replays a teammate's
      // lockedPieceMatrix/pos onto THIS client's own board copy, which can
      // momentarily be a slightly different shape/alignment than the
      // sender's (broadcast ordering isn't guaranteed) — same "accepted
      // small race, self-corrects on the next exchange" tradeoff already
      // made elsewhere in this file, just needs to not crash the tab.
      const targetRow = boardMatrix[y + playerPiece.pos.y];
      if (!targetRow || x + playerPiece.pos.x < 0 || x + playerPiece.pos.x >= targetRow.length) return;
      targetRow[x + playerPiece.pos.x] = value;
    });
  });
};

// Removes every completed row (splice + unshift an empty one at top, same
// as lockPiece always did inline) and returns how many were cleared. Pure
// function of "this board's current cell contents" — deterministic and
// order-independent regardless of which specific piece completed a row, so
// co-op's merge-only sync (see the isCoop lock-delta effect) can call this
// after merging in a partner's piece and independently arrive at the same
// resulting board shape the sender already has locally, without needing
// the sender's full board broadcast at all.
const sweepLines = (boardMatrix: number[][]): number => {
  let linesCleared = 0;
  outer: for (let y = boardMatrix.length - 1; y >= 0; --y) {
    for (let x = 0; x < boardMatrix[y].length; ++x) {
      // A row containing an unclearable (sudden-death) cell is never treated
      // as complete, full or not — see UNCLEARABLE_GARBAGE_VALUE/
      // insertUnclearableRow below. Only the timeBasedGravity ruleset ever
      // writes that value, so this check is a no-op for every other mode.
      if (boardMatrix[y][x] === 0 || boardMatrix[y][x] === UNCLEARABLE_GARBAGE_VALUE) continue outer;
    }
    const row = boardMatrix.splice(y, 1)[0].fill(0);
    boardMatrix.unshift(row);
    ++y; linesCleared++;
  }
  return linesCleared;
};

// Versus-mode garbage: attack size per clear (T-Rotate Single/Double/Triple,
// then Single/Double/Triple/Quad), a combo bonus table on top, and a row
// insertion helper — all pure so lockPiece can call straight into them.
const GARBAGE_VALUE = 8;
const COMBO_ATTACK = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];

const getBaseAttack = (linesCleared: number, tSpin: boolean): number => {
  if (tSpin) return linesCleared === 1 ? 2 : linesCleared === 2 ? 4 : linesCleared === 3 ? 6 : 0;
  return linesCleared === 2 ? 1 : linesCleared === 3 ? 2 : linesCleared === 4 ? 4 : 0;
};

// Teams-coop only: `gapCol` can be pre-chosen (a replay of another
// teammate's already-broadcast insertion) instead of freshly randomized —
// see the isCoop/isTeamsCoop adopt-effect for why a shared board can't have
// every teammate roll their own random gap independently. Returns whichever
// gapCol it actually used, so the caller can broadcast it for teammates to
// replay verbatim. Versus/Teams (one board per player, no replay needed)
// just don't pass or read the third argument/return value.
const insertGarbageRows = (boardMatrix: number[][], count: number, gapCol: number = Math.floor(Math.random() * COLS)) => {
  for (let i = 0; i < count; i++) {
    boardMatrix.shift();
    const row = new Array(COLS).fill(GARBAGE_VALUE);
    row[gapCol] = 0;
    boardMatrix.push(row);
  }
  return gapCol;
};

// timeBasedGravity only — see TetrisGameProps' own comment. Gravity ramps
// linearly from level 1 to ARENA_GRAVITY_MAX_LEVEL over ARENA_GRAVITY_RAMP_MS
// of elapsed match time (not lines cleared), and once that ramp completes,
// one fully-solid, unclearable row (see insertUnclearableRow/sweepLines)
// rises from the bottom every ARENA_SUDDEN_DEATH_ROW_INTERVAL_MS — both
// driven straight off elapsedTimeRef in the update() game loop. Tunable:
// these three numbers are the entire pacing knob for how long a match can
// run before it's forced to a close.
const ARENA_GRAVITY_MAX_LEVEL = 10;
const ARENA_GRAVITY_RAMP_MS = 3 * 60 * 1000;
const ARENA_SUDDEN_DEATH_ROW_INTERVAL_MS = 3500;
const UNCLEARABLE_GARBAGE_VALUE = 9;

// No gap column, unlike insertGarbageRows — a solid rising floor is the
// whole point (nothing to dig through, just less time before it reaches
// you), matching how this mechanic looks in every real implementation of it.
const insertUnclearableRow = (boardMatrix: number[][]) => {
  boardMatrix.shift();
  boardMatrix.push(new Array(COLS).fill(UNCLEARABLE_GARBAGE_VALUE));
};

const rotate = (matrix: number[][], dir: number) => {
  const rotated = matrix.map((_, index) => matrix.map(col => col[index]));
  if (dir > 0) return rotated.map(row => row.reverse());
  return rotated.reverse();
};

const MiniPiece = ({ type }: { type: number | null }) => {
  if (!type) return null;
  const matrix = PIECES[type];
  return (
    <div style={{ display: 'grid', gap: '1px', gridTemplateColumns: `repeat(${matrix[0].length}, 1fr)` }}>
      {matrix.map((row, y) => row.map((val, x) => (
        <div
          key={`${x}-${y}`}
          style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: val ? COLORS[val] : 'transparent', boxShadow: val ? `0 0 8px ${COLORS[val]}` : 'none' }}
        />
      )))}
    </div>
  );
};

// Compact opponent-board preview — same small-DOM-grid approach as MiniPiece
// above rather than a canvas, since there can be several of these at once (up
// to MAX_ROOM_SIZE opponents) and they only need to read as a rough shape,
// not render crisp/animated like the main board. `cellSize` is a literal
// pixel value (not a multiplier) so callers can solve for an exact overall
// board size. `gap`/`padding` default to scaling with cellSize (matching the
// original fixed-3px version's proportions, for the compact side-column
// case), but the 1v1 adjacent board below overrides both to small fixed
// values instead — a gap/padding that scales with cellSize adds a bigger
// fraction of overhead to the (shorter) width than the (taller) height,
// since COLS and ROWS differ, which skews the rendered aspect ratio away
// from the main board's own COLS:ROWS proportions the bigger cellSize gets;
// fixed overhead keeps that skew negligible so "90% of the main board" is
// accurate in both dimensions, not just the one solved for.
//
// `pieceMatrix`/`pieceX`/`pieceY`, when given, overlay the opponent's actual
// current piece (already rotated, real position) on top of the locked
// board — this is real data now, not a guess: the game loop broadcasts it
// on every lock AND periodically during play (see
// PREVIEW_BROADCAST_INTERVAL_MS), so the preview tracks live movement and
// gravity instead of freezing at spawn between locks or faking a fall
// locally. No animation/interpolation here — just render whatever the last
// broadcast said, the same way `board` itself is rendered.
//
// `eliminated` dims the board and stamps "ELIMINATED" over it — covers both
// topping out and disconnecting, since useOnlineRoom already folds a dropped
// connection into eliminatedGuestIds (see CLAUDE.md).
//
// Wrapped in memo(): with N opponents each broadcasting a fresh board every
// ~200ms (see PREVIEW_BROADCAST_INTERVAL_MS), *any one* of them updating
// changes the `opponentBoards` prop reference and re-renders all of
// TetrisGame — without memo, that meant every MiniBoard re-rendered its full
// COLS*ROWS grid of cells on *every* opponent's broadcast, not just its own,
// an O(opponents²) amount of DOM work per second that was fine at 1 opponent
// but visibly laggy at 2+ (reported: smooth with 2 players/1 opponent,
// laggy with 3/2 opponents). Safe to memo on shallow prop equality because
// `board`/`pieceMatrix` genuinely keep stable array references for any
// *unrelated* opponent — useOnlineRoom's board-snapshot reducer only
// replaces the one entry that changed (filter + push), and TetrisGame's
// previewBoards mapper spreads `real` into a new wrapper object but doesn't
// touch the nested board/pieceMatrix arrays inside it — so an unrelated
// opponent's specific props are actually unchanged references, memo can
// correctly bail out, and the fresh-array-every-render case (some other
// opponent's data, or something else in TetrisGame, changed) still
// re-renders exactly as before.
export const MiniBoard = memo(function MiniBoard({ board, cellSize = 3, gap = cellSize / 3, padding = cellSize, pieceMatrix, pieceX = 0, pieceY = 0, eliminated, eliminatedLabel = 'Eliminated', pendingGarbage }: { board: number[][]; cellSize?: number; gap?: number; padding?: number; pieceMatrix?: number[][]; pieceX?: number; pieceY?: number; eliminated?: boolean; eliminatedLabel?: string; pendingGarbage?: number }) {
  const barWidth = Math.max(3, Math.floor(cellSize * 0.4));
  const barGap = Math.max(2, Math.floor(cellSize * 0.2));
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: `${barGap}px` }}>
      {/* Pending garbage bar — same half-segment-per-2-lines scale as the
          player's own garbage bar, rendered to the left of the board. */}
      {pendingGarbage !== undefined && (
        <div style={{ width: `${barWidth}px`, display: 'flex', flexDirection: 'column', gap: '1px', alignSelf: 'stretch' }}>
          {Array.from({ length: ROWS }).map((_, i) => {
            const fullSegs = Math.floor(pendingGarbage / 2);
            const hasHalf = pendingGarbage % 2 === 1;
            const posFromBottom = ROWS - 1 - i;
            const isFull = posFromBottom < fullSegs;
            const isHalf = !isFull && posFromBottom === fullSegs && hasHalf;
            return (
              <div key={i} style={{ flex: 1, borderRadius: '1px', position: 'relative', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                {(isFull || isHalf) && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: isFull ? '100%' : '50%', backgroundColor: '#f87171', boxShadow: '0 0 4px rgba(248,113,113,0.6)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gap: `${gap}px`, gridTemplateColumns: `repeat(${COLS}, 1fr)`, backgroundColor: 'rgba(0,0,0,0.6)', padding: `${padding}px`, borderRadius: `${padding}px`, border: '1px solid rgba(255,255,255,0.1)', opacity: eliminated ? 0.35 : 1 }}>
          {board.map((row, y) => row.map((val, x) => {
            let cellVal = val;
            if (pieceMatrix) {
              const px = x - pieceX;
              const py = y - pieceY;
              if (py >= 0 && py < pieceMatrix.length && px >= 0 && px < pieceMatrix[0].length && pieceMatrix[py][px]) {
                cellVal = pieceMatrix[py][px];
              }
            }
            return (
              <div
                key={`${x}-${y}`}
                style={{ width: `${cellSize}px`, height: `${cellSize}px`, backgroundColor: cellVal ? COLORS[cellVal] : 'rgba(255,255,255,0.04)' }}
              />
            );
          }))}
        </div>
        {eliminated && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${Math.max(padding, 4)}px` }}>
            <span style={{ fontSize: `${Math.max(cellSize * 1.4, 8)}px`, color: '#f87171', fontWeight: 'bold', letterSpacing: '0.08em', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.9)', textTransform: 'uppercase', lineHeight: 1.2 }}>
              {eliminatedLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

// On-screen control used only on mobile, where there's no keyboard to drive
// the same move/rotate/drop/hold actions the desktop build binds to keydown.
const TouchControlButton = ({
  label,
  ariaLabel,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
}: {
  label: string;
  ariaLabel: string;
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  onPointerCancel?: () => void;
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    onPointerDown={onPointerDown ? (e) => { e.preventDefault(); onPointerDown(); } : undefined}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    onPointerCancel={onPointerCancel}
    style={{
      flex: 1,
      minWidth: 0,
      padding: '14px 0',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      borderRadius: '10px',
      border: '1px solid var(--tt-accent)',
      backgroundColor: 'color-mix(in srgb, var(--tt-accent) 25%, transparent)',
      color: 'var(--tt-accent)',
      touchAction: 'manipulation',
      WebkitUserSelect: 'none',
      userSelect: 'none',
      cursor: 'pointer',
    }}
  >
    {label}
  </button>
);


// ==========================================
// 2. MAIN REACT COMPONENT
// ==========================================

export default function BlockGame({ mode, onMenu, onAttack, incomingGarbage, onEliminated, eliminatedOpponentIds, opponentIds, enemyIds, opponentTeams, selfTeam, onRematchMenu, onMatchHome, seed, startingLevel, maxLevel, lives, onBoardUpdate, opponentBoards, opponentNicknames, onMatchWin, quitVotes, selfQuitVote, quitVoteDeadline, onQuitVote, onRetractQuitVote, sharedNextHold, timeBasedGravity, liveStateRef, focusRef, initialBoard, initialNextPieces, initialHoldPiece, initialActivePiece, fixedQueue, onPerfectClear, onQueueExhausted, suppressPauseOverlay, suppressCountdown, onPieceLock, onAllClear, onUndo, onRedo, clearBoardRef, onTRotate, onLinesCleared, onCombo, onPiecePlaced, onTopout, inputFrozen, externalSpawnRef, noLineClear, limitedSandbox, fogActive, boardPaused, gravityMultiplier, lockRotationActive, incomingLineClear, incomingClearBoard, incomingMinoCannon }: BlockGameProps) {
  // 'practice' = Sandbox's single-player ruleset (adjustable gravity, spawn
  // hotkeys, clear-on-topout, no leaderboard) running inside the same
  // multiplayer room/preview plumbing 'versus' uses, minus the competitive
  // parts (attacks, lives, elimination, win condition) — those stay gated on
  // mode === 'versus' exactly as before. `mode` is a prop that never changes
  // within one mount, so these are safe to read from the mount-only effect's
  // closure below the same way `mode` itself already is. Future modes
  // (co-op, powerups) should extend these two groupings rather than adding
  // scattered mode checks.
  const isSandboxRules = mode === 'standard' || mode === 'practice';
  // 'teams' shares versus's room/preview plumbing (broadcast cadence,
  // preview column, quit-vote UI) wholesale — it's competitive like versus,
  // just with garbage/win-condition scoped to enemy teams (see isTeams,
  // enemyIds) rather than every opponent. Folded into this grouping rather
  // than kept separate, unlike isCoop below, since none of isMultiplayerRoom's
  // use sites need to tell versus and teams apart.
  const isMultiplayerRoom = mode === 'versus' || mode === 'practice' || mode === 'teams';
  // Competitive-mechanics gate (attacks/lives/elimination/seeded RNG/no-
  // pause) — versus and teams share every one of these verbatim; only the
  // *targeting* (handleAttack, VersusApp) and *win-condition roster*
  // (enemyIds vs opponentIds, below) actually differ between them.
  const isTeams = mode === 'teams';
  // 'coop' = exactly two players sharing one board, each controlling their
  // own independently-falling piece — gravity climbs like versus (not
  // sandbox-rules), and the partner is overlaid directly on this client's
  // own canvas rather than shown as a side preview board, so it's kept
  // deliberately separate from isMultiplayerRoom rather than folded into it
  // (isMultiplayerRoom's other use sites — the 1-on-1/compact preview
  // column — should NOT pick coop up).
  const isCoop = mode === 'coop';
  // 'teams-coop' = the same team structure as 'teams' (targeting/win-
  // condition/enemyIds all identical, see isTeams's own comment above) —
  // except each *team* shares one board the way coop's two players do.
  // Generalizes isCoop's merge-only sync from exactly one partner to
  // however many share a team (see the adopt-effect below), and kept
  // separate from isMultiplayerRoom for the exact same reason isCoop is:
  // teammates are overlaid directly on this client's own canvas, not shown
  // as side preview boards, so isMultiplayerRoom's other use sites (the
  // 1-on-1/compact preview column) should NOT pick this up either — every
  // site that already reads `isMultiplayerRoom || isCoop` for board-sync/
  // broadcast plumbing gets `|| isTeamsCoop` alongside it instead.
  const isTeamsCoop = mode === 'teams-coop';
  // 'arena' = the auto-join public battle royale (see useArena.ts/
  // ArenaApp.tsx) — mechanically identical to versus's competitive rules
  // (attacks/lives/elimination/seeded RNG/no-pause/HUD), so it's folded into
  // every `mode === 'versus' || isTeams || isTeamsCoop` check the same way
  // Teams and Teams Co-op each were. Deliberately NOT folded into
  // isMultiplayerRoom's quit-vote use sites, though — arena's roster can be
  // up to 100 players with no fixed small room to negotiate a vote among, so
  // Quit there stays a unilateral leave (same as solo modes), not a vote.
  const isArena = mode === 'arena';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeDisplayRef = useRef<HTMLParagraphElement>(null);
  const requestRef = useRef<number>(0);
  
  const board = useRef<number[][]>(initialBoard ? initialBoard.map((r) => [...r]) : createMatrix(COLS, ROWS));
  const dropCounter = useRef(0);
  const _sandboxDefaultLevel = (mode === 'standard' || mode === 'practice') && !startingLevel
    ? GRAVITY_TIERS[SANDBOX_DEFAULT_TIER].level : (startingLevel ?? 1);
  const dropInterval = useRef(calculateDropInterval(_sandboxDefaultLevel));
  const lastTime = useRef(0);
  
  const gameStartTimeRef = useRef(0);
  const elapsedTimeRef = useRef(0);

  const isLockingRef = useRef(false);
  const lockTimerRef = useRef(0);
  const lastHardDropTimeRef = useRef(0);
  
  const lockResetsRef = useRef(0);
  const lowestYRef = useRef(0);

  const scoreRef = useRef(0); 
  const linesRef = useRef(0);
  const levelRef = useRef(_sandboxDefaultLevel);
  const lastMoveRef = useRef<'move' | 'rotate' | 'drop' | null>(null);
  const b2bRef = useRef(0);
  const b2bAnimKeyRef = useRef(0);
  const comboRef = useRef(-1);
  const actionTextRef = useRef({ text: '', timer: 0 });
  const inputFrozenRef = useRef(inputFrozen ?? false);
  useEffect(() => { inputFrozenRef.current = inputFrozen ?? false; }, [inputFrozen]);
  const noLineClearRef = useRef(noLineClear ?? false);
  useEffect(() => { noLineClearRef.current = noLineClear ?? false; }, [noLineClear]);
  const boardPausedRef = useRef(boardPaused ?? false);
  useEffect(() => { boardPausedRef.current = boardPaused ?? false; }, [boardPaused]);
  const lockRotationRef = useRef(lockRotationActive ?? false);
  useEffect(() => { lockRotationRef.current = lockRotationActive ?? false; }, [lockRotationActive]);
  const gravityMultiplierRef = useRef(gravityMultiplier ?? 1);
  useEffect(() => { gravityMultiplierRef.current = gravityMultiplier ?? 1; }, [gravityMultiplier]);

  // Seeded in versus and teams (every player's bags are identical, useful
  // for a fair race) and in co-op (per direct request: "ensure they are
  // taking blocks from the same bag" when Share Next/Hold is on — each
  // player still advances their own queue independently as they lock, but
  // starting from the same seed means both bags are the same underlying
  // sequence rather than two unrelated random streams). Solo modes and
  // practice fall through to Math.random.
  const rngRef = useRef<() => number>((mode === 'versus' || isTeams || isTeamsCoop || isArena || mode === 'coop') && seed != null ? mulberry32(seed) : Math.random);
  // Puzzle-mode refs — kept as refs (not state) so the game loop always reads
  // the latest callback without needing them as effect dependencies.
  const fixedQueueRef = useRef(fixedQueue);
  const onPerfectClearRef = useRef(onPerfectClear);
  const onQueueExhaustedRef = useRef(onQueueExhausted);
  const onPieceLockRef = useRef(onPieceLock);
  const onAllClearRef = useRef(onAllClear);
  const onUndoRef = useRef(onUndo);
  const onRedoRef = useRef(onRedo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onPerfectClearRef.current = onPerfectClear; }, [onPerfectClear]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onQueueExhaustedRef.current = onQueueExhausted; }, [onQueueExhausted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onPieceLockRef.current = onPieceLock; }, [onPieceLock]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onAllClearRef.current = onAllClear; }, [onAllClear]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onUndoRef.current = onUndo; }, [onUndo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onRedoRef.current = onRedo; }, [onRedo]);
  const onAttackRef = useRef(onAttack);
  const onTRotateRef = useRef(onTRotate);
  const onLinesClearedRef = useRef(onLinesCleared);
  const onComboRef = useRef(onCombo);
  const onPiecePlacedRef = useRef(onPiecePlaced);
  const onTopoutRef = useRef(onTopout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onAttackRef.current = onAttack; }, [onAttack]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onTRotateRef.current = onTRotate; }, [onTRotate]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onLinesClearedRef.current = onLinesCleared; }, [onLinesCleared]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onComboRef.current = onCombo; }, [onCombo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onPiecePlacedRef.current = onPiecePlaced; }, [onPiecePlaced]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { onTopoutRef.current = onTopout; }, [onTopout]);
  const nextPiecesRef = useRef<number[]>(
    fixedQueue && fixedQueue.length > 0
      ? [...fixedQueue]
      : initialNextPieces && initialNextPieces.length > 0
        ? [...initialNextPieces, ...generateBag(rngRef.current)]
        : [...generateBag(rngRef.current), ...generateBag(rngRef.current)]
  );
  const initialQueueSnapshotRef = useRef<number[]>([...nextPiecesRef.current]);
  const holdPieceRef = useRef<number | null>(initialHoldPiece ?? null);
  // Stored so restartGame can reset to initialBoard instead of empty
  const initialBoardRef = useRef<number[][] | null>(initialBoard ? initialBoard.map((r) => [...r]) : null);
  const canHoldRef = useRef(true);

  // Sandbox-only undo/redo — each entry is a snapshot of the game state at
  // the moment a piece was about to lock (board without that piece embedded).
  type UndoSnapshot = {
    board: number[][];
    activePieceType: number;
    queue: number[];
    hold: number | null;
    score: number;
    lines: number;
    level: number;
  };
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const redoStackRef = useRef<UndoSnapshot[]>([]);

  const player = useRef({ pos: { x: 0, y: 0 }, matrix: [] as number[][], type: 0, rotState: 0 });

  // draw() is only ever reachable through the requestAnimationFrame chain
  // kicked off by the mount-only effect below (deps []) — that effect's
  // closure over `update`/`draw` is captured once, at mount, and every
  // subsequent requestAnimationFrame(update) call reuses that same frozen
  // closure (same reasoning as toggleZeroGravity's comment above: anything
  // read directly from props/state inside it is stuck at its mount-time
  // value forever). The isCoop adopt-effect already routes around this for
  // game *state* (board/score/level/lines, all ref-mutated). draw()'s
  // partner-piece overlay needs the same treatment for *rendering* —
  // without this ref, the overlay would draw from whatever opponentBoards
  // was (usually empty) on the very first render and never update.
  const opponentBoardsRef = useRef(opponentBoards);
  useEffect(() => { opponentBoardsRef.current = opponentBoards; }, [opponentBoards]);

  const [gameState, setGameState] = useState<'COUNTDOWN' | 'PLAYING' | 'NAME_ENTRY' | 'LEADERBOARD'>(suppressCountdown ? 'PLAYING' : 'COUNTDOWN');
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const [countdownText, setCountdownText] = useState<number | string>(3);

  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [showControls, setShowControls] = useState(false);
  const showControlsRef = useRef(false);
  // Which content the pause overlay shows — the regular keybinds/handling
  // settings, or (sandbox mode only) the gravity/board tools. Both share the
  // same overlay + pause mechanism, just different buttons open different tabs.
  const [settingsTab, setSettingsTab] = useState<'controls' | 'sandbox'>('controls');
  // True gravity-off: the piece never auto-falls until soft/hard-dropped.
  // Distinct from the gravity slider's fast end (which still ticks, just
  // near-instantly) — this sets dropInterval to Infinity so it never ticks.
  const [zeroGravity, setZeroGravity] = useState(false);
  const zeroGravityRef = useRef(false);
  const [sandboxTierIdx, setSandboxTierIdx] = useState(SANDBOX_DEFAULT_TIER);
  // Versus-only: which end state the match hit (topping out, or outlasting
  // every other opponent), read by the LEADERBOARD-state overlay below.
  const [versusOutcome, setVersusOutcome] = useState<'won-last-standing' | 'lost-topout'>('lost-topout');
  // Two-step quit confirmation for the unilateral-leave case (solo/arena/
  // journey). First click shows "Confirm?"; second click within 3 s calls
  // onMenu. Auto-resets to 'Quit' if the player doesn't follow through.
  const [quitConfirm, setQuitConfirm] = useState(false);
  // Versus-only extra-life count (host-set via roomSettings.lives, default
  // 1). Ref is the source of truth read synchronously inside handleGameOver;
  // livesDisplay just mirrors it into the HUD, same split as
  // pendingGarbageRef/pendingGarbageDisplay above.
  const livesRemainingRef = useRef(lives ?? 1);
  const [livesDisplay, setLivesDisplay] = useState(lives ?? 1);
  // Garbage queued from incoming broadcasts, netted against this client's own
  // attack and inserted into the board on the next piece lock (see lockPiece).
  const pendingGarbageRef = useRef(0);
  // Mirrors pendingGarbageRef for the garbage-bar UI — the ref stays the
  // source of truth read inside the game loop, this just triggers a render.
  const [pendingGarbageDisplay, setPendingGarbageDisplay] = useState(0);
  // Live running total for the HUD.
  const [linesSent, setLinesSent] = useState(0);
  // PPS/APM (Sprint, Blitz, Versus) and attack/min (Versus only) — raw counts
  // live in refs (read from the mount-only keydown/touch closures, same
  // reasoning as canAct/toggleZeroGravity below, and needed synchronously to
  // compute attack/min in the same tick a new attack is sent), the displayed
  // rate is recomputed into state each time a piece locks or an action fires
  // rather than ticking every frame.
  const piecesLockedRef = useRef(0);
  const actionsRef = useRef(0);
  const linesSentRef = useRef(0);
  const [pps, setPps] = useState(0);
  const [apm, setApm] = useState(0);
  const [attackPerMin, setAttackPerMin] = useState(0);
  // Guards against a local game-over and an opponent-result broadcast both
  // trying to end the match.
  const matchEndedRef = useRef(false);
  // Throttles the live-position broadcast added to the game loop below —
  // see PREVIEW_BROADCAST_INTERVAL_MS.
  const lastPreviewBroadcastRef = useRef(0);
  // timeBasedGravity only — how many sudden-death rows have been inserted
  // so far this match, compared each frame against how many SHOULD have
  // been inserted by now given elapsed time (see the update() loop) so a
  // missed frame or two never permanently loses a row.
  const suddenDeathRowsInsertedRef = useRef(0);

  // Incoming garbage just accumulates here — it's netted against this
  // client's own attack and actually inserted into the board on the next
  // piece lock (see lockPiece), not on arrival.
  useEffect(() => {
    if (!(mode === 'versus' || isTeams || isTeamsCoop || isArena) || !incomingGarbage) return;
    pendingGarbageRef.current += incomingGarbage.amount;
    setPendingGarbageDisplay(pendingGarbageRef.current);
  }, [mode, isTeams, isTeamsCoop, isArena, incomingGarbage]);

  // Siege: Line Gift — clear N rows from the bottom of the board (ally P1 effect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!incomingLineClear) return;
    const count = Math.min(incomingLineClear.count, ROWS);
    board.current.splice(ROWS - count, count);
    while (board.current.length < ROWS) board.current.unshift(new Array(COLS).fill(0));
  }, [incomingLineClear?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Siege: Revive — wipe the entire board (ally P1 effect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (incomingClearBoard == null) return;
    board.current = createMatrix(COLS, ROWS);
    comboRef.current = -1;
    b2bRef.current = 0;
    dropCounter.current = 0;
    actionTextRef.current = { text: 'REVIVE!', timer: 1800 };
  }, [incomingClearBoard]); // eslint-disable-line react-hooks/exhaustive-deps

  // Siege: Mino Cannon — force-drop a piece from the top of a column (enemy P1 effect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!incomingMinoCannon) return;
    const { pieceType, column } = incomingMinoCannon;
    const matrix = PIECES[pieceType];
    if (!matrix) return;
    const col = Math.max(0, Math.min(column, COLS - matrix[0].length));
    const pos = { x: col, y: 0 };
    while (!collide(board.current, { matrix, pos: { x: col, y: pos.y + 1 } })) pos.y++;
    merge(board.current, { matrix, pos });
    sweepLines(board.current);
  }, [incomingMinoCannon?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Last-player-standing (versus) / last-team-standing (teams): once every
  // id in the watched roster has broadcast its own elimination, this client
  // has outlasted the room — independent of anything happening locally,
  // hence matchEndedRef to stop this double-firing against a local
  // handleGameOver call already in flight. The watched roster is enemyIds
  // when present (teams — only the opposing team's players need to be
  // gone) and falls back to opponentIds otherwise (versus — everyone else),
  // so this is the exact same check either way, just given a different
  // roster; see enemyIds' own comment on TetrisGameProps for why that's a
  // separate prop from opponentIds rather than opponentIds meaning
  // different things in different modes.
  useEffect(() => {
    if (!(mode === 'versus' || isTeams || isTeamsCoop || isArena) || matchEndedRef.current) return;
    const roster = enemyIds ?? opponentIds;
    if (!roster || roster.length === 0) return;
    if (!roster.every((id) => eliminatedOpponentIds?.includes(id))) return;
    matchEndedRef.current = true;
    scoreRef.current = elapsedTimeRef.current;
    setVersusOutcome('won-last-standing');
    setGameState('LEADERBOARD');
    onMatchWin?.();
    syncUi();
  }, [mode, isTeams, isTeamsCoop, isArena, eliminatedOpponentIds, opponentIds, enemyIds]);

  // Arena only: rather than a manual Rematch click, a finished round result
  // clears itself after a short beat and this client rejoins the waiting
  // pool for whichever round gets proposed next (see useArena's
  // returnToWaiting) — matches the "continuously running" feel the mode is
  // going for. The Rematch button (relabeled "Back to Queue" for arena, see
  // the result overlay below) still works too, for anyone who doesn't want
  // to wait out the delay.
  const arenaAutoReturnedRef = useRef(false);
  useEffect(() => {
    if (!isArena || gameState !== 'LEADERBOARD' || arenaAutoReturnedRef.current) return;
    arenaAutoReturnedRef.current = true;
    const timeout = setTimeout(() => onRematchMenu?.(), 4000);
    return () => clearTimeout(timeout);
  }, [isArena, gameState, onRematchMenu]);

  // Non-arena multiplayer: auto-redirect home after 5 s when the match ends.
  // Arena uses its own 4-second queue-return; solo modes have no auto-return.
  // Uses onMatchHome so the group quit-vote pass (onRematchMenu) can still
  // go back to the room lobby independently.
  const vsMatchHomeRef = useRef(false);
  useEffect(() => {
    if (!((isMultiplayerRoom || isCoop || isTeamsCoop) && !isArena)) return;
    if (gameState !== 'LEADERBOARD' || vsMatchHomeRef.current) return;
    vsMatchHomeRef.current = true;
    const timeout = setTimeout(() => onMatchHome?.(), 5000);
    return () => clearTimeout(timeout);
  }, [isMultiplayerRoom, isCoop, isTeamsCoop, isArena, gameState, onMatchHome]);

  // Auto-reset quitConfirm after 3 s so the button returns to 'Quit'
  // without requiring the player to click elsewhere.
  useEffect(() => {
    if (!quitConfirm) return;
    const id = setTimeout(() => setQuitConfirm(false), 3000);
    return () => clearTimeout(id);
  }, [quitConfirm]);

  // Co-op: a shared loss, not a win/lose split — the moment the partner's
  // id shows up in eliminatedOpponentIds (whether they topped out or
  // disconnected), this client's own match ends too, even though *this*
  // client never topped out. `.some()`, not versus's `.every()` — coop is
  // always exactly one partner, and either one topping out is enough.
  useEffect(() => {
    if (mode !== 'coop' || matchEndedRef.current) return;
    if (!opponentIds || opponentIds.length === 0) return;
    if (!opponentIds.some((id) => eliminatedOpponentIds?.includes(id))) return;
    matchEndedRef.current = true;
    setGameState('LEADERBOARD');
    syncUi();
  }, [mode, eliminatedOpponentIds, opponentIds]);

  // Mid-match Quit is a group vote, not a unilateral leave (see the Left
  // Panel Quit button below) — resolved independently by every client from
  // the same shared state, same style as the win-condition effect above.
  // The required roster excludes anyone already gone (eliminatedOpponentIds
  // already covers both real eliminations and silent disconnects, see
  // useOnlineRoom) — a vote among 3 whose 3rd already left only needs the
  // remaining 2 to agree, and a lone survivor's own vote passes instantly
  // (an empty activeRoster vacuously satisfies .every()). Reuses
  // onRematchMenu as the destination — same "keep the room alive, go back
  // to this room's ready-up screen" action a passed vote and a clicked
  // Rematch button both mean.
  const quitVotePassedRef = useRef(false);
  useEffect(() => {
    if (!(isMultiplayerRoom || isCoop || isTeamsCoop) || matchEndedRef.current || quitVotePassedRef.current) return;
    if (!opponentIds || opponentIds.length === 0 || !selfQuitVote) return;
    const activeRoster = opponentIds.filter((id) => !eliminatedOpponentIds?.includes(id));
    if (!activeRoster.every((id) => quitVotes?.has(id))) return;
    quitVotePassedRef.current = true;
    onRematchMenu?.();
  }, [isMultiplayerRoom, isCoop, isTeamsCoop, selfQuitVote, quitVotes, opponentIds, eliminatedOpponentIds]);

  // Co-op / Teams-coop: merge-only board sync, NOT a wholesale replace. An
  // earlier version of this effect did `board.current = partner.board` on
  // every broadcast (including the periodic ~200ms position tick) — since
  // that fires roughly 5x/second in each direction regardless of whether
  // either side actually locked anything new, any time a partner's
  // broadcast happened to be even slightly behind this client's own most
  // recent lock when it arrived, that lock would get silently erased. Not
  // a rare simultaneous-lock edge case — a near-constant race under normal
  // play, which is what was actually behind pieces intermittently
  // vanishing (and the resulting board flicker reading as "lag").
  //
  // Fix: only mutate board.current when this specific broadcast is an
  // actual lock (lockedPieceMatrix present — see BoardSnapshot/lockPiece),
  // and even then only ever ADD cells via the same merge()+sweepLines()
  // lockPiece already uses locally, never replace the array wholesale.
  // Merging is commutative — applying this client's own locks and any
  // number of teammates', in any arrival order, converges to the same
  // board shape — so a stale-relative-to-something-else broadcast can no
  // longer erase progress the sender didn't know about yet.
  //
  // Co-op is always exactly one partner (opponentBoards[0]); teams-coop
  // generalizes this to however many share the team (every same-team entry
  // in opponentBoards) — everything below is a straight loop over
  // `partners` instead of one fixed variable, plus two teams-coop-only
  // branches (garbage-insertion replay, team-lives min-merge) that coop
  // never triggers since neither field is ever populated for it.
  useEffect(() => {
    if (!isCoop && !isTeamsCoop) return;
    const partners = isTeamsCoop
      ? (opponentBoards?.filter((o) => (opponentTeams?.[o.guestId] ?? 1) === selfTeam) ?? [])
      : (opponentBoards?.[0] ? [opponentBoards[0]] : []);
    if (partners.length === 0) return;
    for (const partner of partners) {
      if (partner.lockedPieceMatrix) {
        merge(board.current, { matrix: partner.lockedPieceMatrix, pos: { x: partner.lockedPieceX ?? 0, y: partner.lockedPieceY ?? 0 } });
        sweepLines(board.current);
      }
      // Monotonic values — Math.max rather than adopt-verbatim, for the same
      // "never regress from a momentarily-behind broadcast" reason as board
      // above. Safe to run on every broadcast (periodic ticks included),
      // not just lock ones — idempotent when nothing's actually higher yet.
      scoreRef.current = Math.max(scoreRef.current, partner.score);
      linesRef.current = Math.max(linesRef.current, partner.lines);
      // Gravity speed has to stay in lockstep with the shared level, not just
      // its displayed number — otherwise a client whose partner is further
      // ahead would show the higher level but keep falling at their own
      // stale, slower speed.
      if (partner.level > levelRef.current) {
        levelRef.current = partner.level;
        dropInterval.current = calculateDropInterval(levelRef.current);
      }
      // Hold is a genuinely shared slot when sharedNextHold is on — not just
      // visible to the partner but a single resource either player can swap
      // into (see holdPiece). Still adopt-verbatim (not max-mergeable — a
      // piece type isn't a monotonic quantity), so the existing Hold box
      // (uiState.hold, driven by this same holdPieceRef via syncUi) already
      // renders it correctly with no new UI. Coop only — teams-coop doesn't
      // offer Share Next/Hold (a shared slot among 3-4 people is a bigger,
      // separate ask than what was asked for here), so `sharedNextHold` is
      // never true there and this simply never fires for it. Off (default),
      // hold stays untouched here — fully private per player, matching
      // Phase A. Next is never adopted into gameplay state either way —
      // each player's own queue stays their own; sharing it is display-only
      // (see the Partner's Next preview, reading opponentBoards directly
      // rather than through this ref-mutation path).
      if (isCoop && sharedNextHold) {
        holdPieceRef.current = partner.hold;
      }
      // Teams-coop only, from here down — coop's BoardSnapshot never
      // populates insertedGarbageCount/sharedBoardCleared (they're only
      // ever set in the mode === 'versus' || isTeams || isTeamsCoop
      // branches of lockPiece/handleGameOver), so these are no-ops for coop.
      if (isTeamsCoop) {
        // A shared board can't have every teammate independently roll their
        // own random gap column for incoming garbage (they'd diverge
        // immediately — see insertGarbageRows' own comment) — whichever
        // teammate's lock actually applied it broadcasts the exact
        // operation here, and every other teammate replays it verbatim
        // (never rerolls) and clears their own pending debt, since the
        // team's incoming garbage was just collectively paid.
        if (partner.insertedGarbageCount != null && partner.insertedGarbageGapCol != null) {
          insertGarbageRows(board.current, partner.insertedGarbageCount, partner.insertedGarbageGapCol);
          pendingGarbageRef.current = 0;
          setPendingGarbageDisplay(0);
        }
        // Team lives only ever go down — Math.min rather than adopt-
        // verbatim, so a client that hasn't yet locally detected the
        // topout itself still immediately reflects a teammate's broadcast
        // of the lower count, same reasoning as score/lines' Math.max above
        // just in the other direction.
        if (partner.livesRemaining < livesRemainingRef.current) {
          livesRemainingRef.current = partner.livesRemaining;
          setLivesDisplay(livesRemainingRef.current);
        }
        // Merge-only sync has no way to represent "wipe the board," only
        // "add these cells" — a teammate's soft-reset-with-lives-left (see
        // handleGameOver) needs this explicit instruction so every other
        // teammate's local board copy actually clears too, not just the
        // one client that topped out.
        if (partner.sharedBoardCleared) {
          board.current = createMatrix(COLS, ROWS);
          comboRef.current = -1;
          b2bRef.current = 0;
        }
      }
    }
    syncUi();
  }, [isCoop, isTeamsCoop, opponentBoards, opponentTeams, selfTeam, sharedNextHold]);

  // Live countdown for the Left Panel's vote banner — ticks locally off the
  // shared quitVoteDeadline timestamp, same "every client ticks its own
  // clock off one agreed-upon instant" approach the pre-match countdown in
  // OnlineLobby.tsx already uses.
  const [quitVoteRemainingSec, setQuitVoteRemainingSec] = useState(0);
  useEffect(() => {
    if (!quitVoteDeadline) { setQuitVoteRemainingSec(0); return; }
    const tick = () => setQuitVoteRemainingSec(Math.max(0, Math.ceil((quitVoteDeadline - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [quitVoteDeadline]);

  const [listeningAction, setListeningAction] = useState<string | null>(null);
  const listeningActionRef = useRef<string | null>(null);
  
  const [tuning, setTuning] = useState({ das: 170, arr: 30, dcd: 0, sdf: 40 });
  const tuningRef = useRef(tuning);
  
  const [controls, setControls] = useState({
    'Left': 'ArrowLeft', 'Right': 'ArrowRight', 'Down': 'ArrowDown',
    'Rotate CW': 'ArrowUp', 'Rotate CCW': 'z', 'Rotate 180': 'a',
    'Hard Drop': ' ', 'Hold': 'c',
    // Sandbox-only hotkeys — rebindable the same way as the rest, but kept
    // out of the main Keybinds grid (see SANDBOX_HOTKEY_ACTIONS) since they
    // only do anything in standard/sandbox mode.
    'Undo': 'u', 'Redo': 'y', 'Clear Board': 'r', 'Toggle 0-G': 'g',
    'Spawn I': '1', 'Spawn O': '2', 'Spawn T': '3', 'Spawn S': '4',
    'Spawn Z': '5', 'Spawn J': '6', 'Spawn L': '7',
    'Spawn 1×1': '8', 'Spawn 1×2': '9', 'Spawn Tri': '0',
  });
  const controlsRef = useRef(controls);

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Drives the mobile-only layout + on-screen touch controls below. Desktop
  // rendering is untouched — every mobile-specific style is a ternary that
  // falls back to the original desktop value when this is false.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const savedTuning = localStorage.getItem('gameTuning') ?? localStorage.getItem('tetrisTuning');
    const savedControls = localStorage.getItem('gameControls') ?? localStorage.getItem('tetrisControls');

    if (savedTuning) {
      try {
        const parsed = JSON.parse(savedTuning);
        setTuning(parsed);
        localStorage.setItem('gameTuning', JSON.stringify(parsed));
        localStorage.removeItem('tetrisTuning');
      } catch (e) { console.error('Failed to parse tuning'); }
    }
    if (savedControls) {
      // Merge onto the defaults rather than replacing outright — a saved
      // object from before the sandbox hotkeys existed wouldn't have those
      // keys, and indexing a missing key later (e.g. `.replace()` on it in
      // the Hotkeys UI) would throw.
      try {
        const parsed = JSON.parse(savedControls);
        setControls(prev => ({ ...prev, ...parsed }));
        localStorage.setItem('gameControls', JSON.stringify({ ...controls, ...parsed }));
        localStorage.removeItem('tetrisControls');
      } catch (e) { console.error('Failed to parse controls'); }
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    tuningRef.current = tuning;
    if (settingsLoaded) {
      localStorage.setItem('gameTuning', JSON.stringify(tuning));
    }
  }, [tuning, settingsLoaded]);

  useEffect(() => {
    controlsRef.current = controls;
    if (settingsLoaded) {
      localStorage.setItem('gameControls', JSON.stringify(controls));
    }
  }, [controls, settingsLoaded]);

  const keysDown = useRef({ left: false, right: false, down: false, hardDrop: false });
  const dasTimers = useRef({ das: 0, arr: 0, dcd: 0 });

  const [uiState, setUiState] = useState({
    score: 0, lines: 0, level: 1, combo: 0, next: nextPiecesRef.current.slice(0, 5), hold: null as number | null, actionText: '', b2bStreak: 0, b2bAnimKey: 0
  });

  const syncUi = () => {
    setUiState({
      score: scoreRef.current, lines: linesRef.current, level: levelRef.current, combo: comboRef.current,
      next: nextPiecesRef.current.slice(0, 5), hold: holdPieceRef.current, actionText: actionTextRef.current.text,
      b2bStreak: b2bRef.current, b2bAnimKey: b2bAnimKeyRef.current,
    });
  };

  useEffect(() => {
    if (suppressCountdown) return;
    if (gameState === 'COUNTDOWN') {
      setCountdownText(3);
      let count = 3;
      const interval = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownText(count);
        } else if (count === 0) {
          setCountdownText('GO!');
        } else {
          clearInterval(interval);
          gameStartTimeRef.current = 0;
          setGameState('PLAYING');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, suppressCountdown]);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('name, score, level, mode')
        .eq('mode', mode) 
        .order('score', { ascending: mode === 'sprint' }) 
        .limit(MAX_LEADERBOARD);

      if (error) {
        console.error('Supabase fetch error:', error.message);
      } else if (data) {
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch scores:', err);
    }
  };

  useEffect(() => {
    if (mode === 'sprint') fetchLeaderboard();
  }, [mode, isSandboxRules, isTeams, isTeamsCoop]);

  const saveHighScore = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const name = nameInput.trim() || 'AAA';
    const score = Math.floor(scoreRef.current);
    const level = levelRef.current;

    const newEntry: ScoreEntry = { name, score, level, mode };

    const updatedLocal = [...leaderboard, newEntry]
      .sort((a, b) => mode === 'sprint' ? a.score - b.score : b.score - a.score)
      .slice(0, MAX_LEADERBOARD);

    setLeaderboard(updatedLocal);
    setGameState('LEADERBOARD');

    try {
      const { error } = await supabase
        .from('game_scores')
        .insert([{ name, score, level, mode }]);

      if (error) {
        console.error('Supabase insert error:', error.message);
      } else {
        await fetchLeaderboard(); 
      }
    } catch (err) {
      console.error('Failed to submit score:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTRotate = () => {
    if (player.current.type !== 3) return false;
    if (lastMoveRef.current !== 'rotate') return false;

    let corners = 0;
    const { x, y } = player.current.pos;
    const checkCorner = (cx: number, cy: number) => {
      if (cx < 0 || cx >= COLS || cy >= ROWS || (cy >= 0 && board.current[cy][cx] !== 0)) corners++;
    };
    checkCorner(x, y); checkCorner(x + 2, y); checkCorner(x, y + 2); checkCorner(x + 2, y + 2);
    return corners >= 3;
  };

  const handleGameOver = (isWin: boolean) => {
    if (!isWin) onTopoutRef.current?.();
    if (isSandboxRules) {
      // In puzzle mode (fixedQueue active), a top-out is a failure — fire the
      // same callback as running out of pieces and let the caller show the fail
      // overlay. Don't auto-clear; the player needs to retry properly.
      if (fixedQueueRef.current) {
        onQueueExhaustedRef.current?.();
        isPausedRef.current = true;
        setIsPaused(true);
        syncUi();
        return;
      }
      // Sandbox mode never really "ends" — topping out just clears the
      // board and play continues immediately, with no leaderboard/name-entry
      // interruption. Gravity/level stays at whatever the player dialed in.
      board.current = createMatrix(COLS, ROWS);
      comboRef.current = -1;
      b2bRef.current = 0;
      dropCounter.current = 0;
      // Restart the practice stopwatch — set to 0 here so update() reinitializes
      // it from the current frame's time next tick; the direct innerText write
      // avoids a one-frame flash of the old elapsed value in the meantime.
      gameStartTimeRef.current = 0;
      if (timeDisplayRef.current) timeDisplayRef.current.innerText = '00:00.000';
      actionTextRef.current = { text: 'Board Cleared', timer: 1200 };
      playerReset();
      syncUi();
      return;
    }

    if (mode === 'versus' || isTeams || isTeamsCoop || isArena) {
      // Only ever reached via topout now — none of these have a line-clear
      // win path (see the removed SPRINT_GOAL check in lockPiece), so isWin
      // is always false here; last-player/team-standing wins are decided
      // separately by the eliminatedOpponentIds effect above instead.
      if (matchEndedRef.current) return;

      if (livesRemainingRef.current > 1) {
        // Still have a life left — soft-reset like sandbox's board-clear
        // above, not a real elimination: the match clock, piece queue,
        // lines-sent/received totals, and win-condition eligibility all
        // keep running uninterrupted, only the board and combo/back-to-back
        // state clear. Teams-coop: livesRemainingRef is the TEAM's shared
        // count here (min-merged by the adopt-effect below, not tracked
        // independently per player), so this decrement is immediately
        // followed by a `sharedBoardCleared` broadcast — merge-only sync
        // has no way to represent "wipe the board," only "add these cells,"
        // so every teammate needs an explicit instruction to clear their
        // own local copy too, not just the client that actually topped out.
        livesRemainingRef.current -= 1;
        setLivesDisplay(livesRemainingRef.current);
        board.current = createMatrix(COLS, ROWS);
        comboRef.current = -1;
        b2bRef.current = 0;
        dropCounter.current = 0;
        actionTextRef.current = {
          text: `TOP OUT\n${livesRemainingRef.current} ${livesRemainingRef.current === 1 ? 'LIFE' : 'LIVES'} LEFT`,
          timer: 1800,
        };
        // Broadcast immediately (same peek-before-reset convention as the
        // normal lockPiece call site) rather than waiting for the next real
        // lock — otherwise an opponent's preview would keep showing the
        // stale, topped-out-looking board and old life count for however
        // long it takes this player to place their next piece. Same spawn
        // math as playerReset() itself, computed here since it hasn't run yet.
        {
          const nextMatrix = PIECES[nextPiecesRef.current[0]];
          const nextX = Math.floor(COLS / 2) - Math.floor(nextMatrix[0].length / 2);
          onBoardUpdate?.({ board: board.current, pieceMatrix: nextMatrix, pieceX: nextX, pieceY: 0, livesRemaining: livesRemainingRef.current, score: scoreRef.current, level: levelRef.current, lines: linesRef.current, next: nextPiecesRef.current.slice(0, 5), hold: holdPieceRef.current, pendingGarbage: pendingGarbageRef.current, ...(isTeamsCoop ? { sharedBoardCleared: true } : {}) });
        }
        playerReset();
        syncUi();
        return;
      }

      matchEndedRef.current = true;
      scoreRef.current = elapsedTimeRef.current;
      setVersusOutcome('lost-topout');
      setGameState('LEADERBOARD');
      onEliminated?.();
      syncUi();
      return;
    }

    if (mode === 'coop') {
      // Shared board, shared loss — either player topping out ends it for
      // both, no win/lose split to track (unlike versus's lives/last-
      // standing). Leaves scoreRef as the actual point total (not
      // overwritten with elapsedTimeRef the way versus does) since coop's
      // result screen shows the team's real score, not a race-clock time.
      if (matchEndedRef.current) return;
      matchEndedRef.current = true;
      setGameState('LEADERBOARD');
      onEliminated?.();
      syncUi();
      return;
    }

    const currentScore = mode === 'sprint' ? elapsedTimeRef.current : scoreRef.current;
    scoreRef.current = currentScore;

    if (mode === 'sprint' && !isWin) {
      setGameState('LEADERBOARD');
      syncUi();
      return;
    }

    const isHighScore = leaderboard.length < MAX_LEADERBOARD || 
      (mode === 'sprint' 
        ? currentScore < (leaderboard[leaderboard.length - 1]?.score || Infinity)
        : currentScore > (leaderboard[leaderboard.length - 1]?.score || 0));
    
    if (isHighScore && currentScore > 0) {
      setGameState('NAME_ENTRY');
    } else {
      setGameState('LEADERBOARD');
    }
    syncUi();
  };

  const playerReset = () => {
    if (fixedQueueRef.current && nextPiecesRef.current.length === 0) {
      // Queue is empty. If the player has a piece in hold, auto-promote it to
      // active so they can still use it (e.g. held a piece and now need to
      // place it last to complete a perfect clear). Otherwise pause silently —
      // the onQueueExhausted callback fires from lockPiece after the last lock.
      if (holdPieceRef.current !== null) {
        player.current.type = holdPieceRef.current;
        holdPieceRef.current = null;
        player.current.matrix = PIECES[player.current.type];
        player.current.pos.y = 0;
        player.current.pos.x = Math.floor(COLS / 2) - Math.floor(player.current.matrix[0].length / 2);
        player.current.rotState = 0;
        lowestYRef.current = player.current.pos.y;
        lockResetsRef.current = 0;
        canHoldRef.current = false;
        isLockingRef.current = false;
        lockTimerRef.current = 0;
        lastMoveRef.current = null;
        syncUi();
        return;
      }
      isPausedRef.current = true;
      setIsPaused(true);
      syncUi();
      return;
    }
    player.current.type = nextPiecesRef.current.shift()!;
    if (!fixedQueueRef.current && nextPiecesRef.current.length <= 5) nextPiecesRef.current.push(...generateBag(rngRef.current));
    
    player.current.matrix = PIECES[player.current.type];
    player.current.pos.y = 0;
    player.current.pos.x = Math.floor(COLS / 2) - Math.floor(player.current.matrix[0].length / 2);
    player.current.rotState = 0; 
    
    lowestYRef.current = player.current.pos.y;
    lockResetsRef.current = 0;

    canHoldRef.current = true;
    isLockingRef.current = false;
    lockTimerRef.current = 0;
    lastMoveRef.current = null;
    
    if (keysDown.current.left || keysDown.current.right) dasTimers.current.dcd = tuningRef.current.dcd;
    syncUi();

    if (collide(board.current, player.current)) {
      handleGameOver(false);
    }
  };

  const restartGame = () => {
    board.current = initialBoardRef.current
      ? initialBoardRef.current.map((r) => [...r])
      : createMatrix(COLS, ROWS);
    scoreRef.current = 0; linesRef.current = 0; levelRef.current = 1;
    holdPieceRef.current = initialHoldPiece ?? null;
    dropInterval.current = calculateDropInterval(1);

    comboRef.current = -1; b2bRef.current = 0; actionTextRef.current = {text: '', timer: 0};
    nextPiecesRef.current = fixedQueueRef.current && fixedQueueRef.current.length > 0
      ? [...fixedQueueRef.current]
      : initialNextPieces && initialNextPieces.length > 0
        ? [...initialNextPieces, ...generateBag(rngRef.current)]
        : [...generateBag(rngRef.current), ...generateBag(rngRef.current)];

    if (initialActivePiece) {
      player.current.type = initialActivePiece.type;
      player.current.matrix = initialActivePiece.matrix.map((r) => [...r]);
      player.current.pos.x = initialActivePiece.x;
      player.current.pos.y = initialActivePiece.y;
      player.current.rotState = 0;
    } else {
      player.current.type = nextPiecesRef.current.shift()!;
      player.current.matrix = PIECES[player.current.type];
      player.current.pos.y = 0;
      player.current.pos.x = Math.floor(COLS / 2) - Math.floor(player.current.matrix[0].length / 2);
      player.current.rotState = 0;
    }
    
    lowestYRef.current = player.current.pos.y;
    lockResetsRef.current = 0;

    gameStartTimeRef.current = 0;
    elapsedTimeRef.current = 0;
    piecesLockedRef.current = 0;
    actionsRef.current = 0;
    setPps(0);
    setApm(0);

    if (timeDisplayRef.current) {
        if (mode === 'blitz') timeDisplayRef.current.innerText = '03:00.000';
        else if (mode === 'sprint') timeDisplayRef.current.innerText = '00:00.000';
    }

    setNameInput('');
    setGameState(suppressCountdown ? 'PLAYING' : 'COUNTDOWN');
    syncUi();
  };

  const lockPiece = () => {
    // Snapshot before merge so undo can restore to this exact pre-lock state.
    if (isSandboxRules) {
      undoStackRef.current.push(captureSnapshot());
      if (undoStackRef.current.length > 30) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
    countPiece();
    // Fire before merge so the callback sees the piece type that is locking.
    if (isSandboxRules) onPieceLockRef.current?.(player.current.type);
    merge(board.current, player.current);
    const tSpin = isTRotate();
    const linesCleared = noLineClearRef.current ? 0 : sweepLines(board.current);
    onPiecePlacedRef.current?.(fixedQueueRef.current ? nextPiecesRef.current.length : undefined);

    // Perfect Clear detection for puzzle mode: all cells empty after line clear.
    if (fixedQueueRef.current && linesCleared > 0 && board.current.every(row => row.every(c => c === 0))) {
      onPerfectClearRef.current?.();
      isPausedRef.current = true;
      setIsPaused(true);
      syncUi();
      return;
    }

    // Sandbox all-clear callback — fires when any line clear leaves the board
    // completely empty (perfect clear in free-play / puzzle editor recording).
    if (isSandboxRules && linesCleared > 0 && board.current.every(row => row.every(c => c === 0))) {
      onAllClearRef.current?.();
    }

    let attack = (mode === 'versus' || isTeams || isTeamsCoop || isArena) ? getBaseAttack(linesCleared, tSpin) : 0;

    if (linesCleared > 0) {
      comboRef.current++;
      const isPerfectClear = board.current.every(row => row.every(c => c === 0));
      onLinesClearedRef.current?.(linesCleared, !tSpin && linesCleared === 4, isPerfectClear);
      if (comboRef.current > 0) onComboRef.current?.(comboRef.current);
      if (tSpin) onTRotateRef.current?.(linesCleared === 1 ? 'single' : linesCleared === 2 ? 'double' : 'triple');
      let isDifficult = false;
      let actionStr = '';

      if (tSpin) {
        isDifficult = true;
        if (linesCleared === 1) { actionStr = 'T-Rotate Single'; }
        else if (linesCleared === 2) { actionStr = 'T-Rotate Double'; }
        else if (linesCleared === 3) { actionStr = 'T-Rotate Triple'; }
      } else {
        if (linesCleared === 4) { actionStr = 'Quad'; isDifficult = true; }
      }

      if (isDifficult) {
        if (b2bRef.current > 0) {
          actionStr = 'B2B ' + actionStr;
          if (mode === 'versus' || isTeams || isTeamsCoop || isArena) attack += 1;
        }
        if (b2bRef.current === 1) b2bAnimKeyRef.current++;
        b2bRef.current++;
      } else {
        b2bRef.current = 0;
      }

      if (comboRef.current > 0) {
        actionStr += `\n${comboRef.current} Combo`;
        if (mode === 'versus' || isTeams || isTeamsCoop || isArena) attack += COMBO_ATTACK[Math.min(comboRef.current, COMBO_ATTACK.length - 1)];
      }

      linesRef.current += linesCleared;
      // Sandbox/Practice's gravity is whatever the player dialed in via the
      // settings panel — it shouldn't creep up on its own from lines cleared.
      // Offset from startingLevel (1 outside versus, or when the host left it
      // at the default) rather than reset to a flat +1, so a host-chosen
      // starting level keeps climbing from there instead of being clobbered
      // by the first line clear. timeBasedGravity also excluded — its level
      // moves only on the elapsed-time schedule in the update() loop, so
      // this per-clear path would otherwise fight it.
      if (!isSandboxRules && !timeBasedGravity) {
        const rawLevel = (startingLevel ?? 1) + Math.floor(linesRef.current / 10);
        levelRef.current = maxLevel != null ? Math.min(maxLevel, rawLevel) : rawLevel;
        dropInterval.current = calculateDropInterval(levelRef.current);
      }

      if (actionStr) actionTextRef.current = { text: actionStr, timer: 2000 };

      if (mode === 'sprint' && linesRef.current >= SPRINT_GOAL) {
         handleGameOver(true);
         return;
      }

    } else {
      comboRef.current = -1;
      if (tSpin) {
        actionTextRef.current = { text: 'T-SPIN', timer: 1500 };
      }
    }

    // Teams-coop: captured only when this client's lock actually performs a
    // real insertion, then threaded into the broadcast below so teammates
    // replay the exact same operation instead of independently rolling
    // their own random gap column (see insertGarbageRows' own comment).
    let insertedGarbage: { count: number; gapCol: number } | undefined;
    if (mode === 'versus' || isTeams || isTeamsCoop || isArena) {
      const cancelled = Math.min(attack, pendingGarbageRef.current);
      pendingGarbageRef.current -= cancelled;
      const netAttack = attack - cancelled;
      if (netAttack > 0) {
        onAttackRef.current?.(netAttack);
        linesSentRef.current += netAttack;
        setLinesSent(linesSentRef.current);
        const min = elapsedTimeRef.current / 60000;
        setAttackPerMin(min > 0 ? linesSentRef.current / min : 0);
      }
      if (pendingGarbageRef.current > 0) {
        const count = pendingGarbageRef.current;
        const gapCol = insertGarbageRows(board.current, count);
        if (isTeamsCoop) insertedGarbage = { count, gapCol };
        pendingGarbageRef.current = 0;
      }
      setPendingGarbageDisplay(pendingGarbageRef.current);
    }

    // Board broadcast is about being in a shared room, not about competing —
    // Practice wants everyone to see each other's boards too, just with none
    // of the attack/garbage logic above. Co-op needs it for a different
    // reason: this IS the mechanism that syncs the shared board (see the
    // isCoop adopt effect below), not just a preview.
    if (isMultiplayerRoom || isCoop || isTeamsCoop || isArena) {
      // nextPiecesRef[0] here (not player.current.type) — playerReset() below
      // hasn't shifted the queue yet at this point, so this is exactly the
      // piece about to spawn as the new active piece, without needing to
      // reorder around playerReset()'s own game-over collision check. Same
      // spawn math as playerReset() itself, computed here since it hasn't run yet.
      const nextMatrix = PIECES[nextPiecesRef.current[0]];
      const nextX = Math.floor(COLS / 2) - Math.floor(nextMatrix[0].length / 2);
      // player.current.matrix/pos still describe the piece that was JUST
      // locked (merge() above only reads them, playerReset() below hasn't
      // run yet) — exactly the delta co-op's merge-only sync needs. Sent
      // unconditionally like score/level/lines; versus/practice just don't
      // read it.
      onBoardUpdate?.({
        board: board.current, pieceMatrix: nextMatrix, pieceX: nextX, pieceY: 0,
        livesRemaining: livesRemainingRef.current, score: scoreRef.current, level: levelRef.current, lines: linesRef.current,
        next: nextPiecesRef.current.slice(0, 5), hold: holdPieceRef.current,
        pendingGarbage: pendingGarbageRef.current,
        lockedPieceMatrix: player.current.matrix, lockedPieceX: player.current.pos.x, lockedPieceY: player.current.pos.y,
        ...(insertedGarbage ? { insertedGarbageCount: insertedGarbage.count, insertedGarbageGapCol: insertedGarbage.gapCol } : {}),
      });
    }

    // After all pieces in a fixed queue have been placed and no PC occurred,
    // the puzzle is failed. Check here (after the real lock) rather than in
    // playerReset so the callback only fires after an actual piece placement.
    if (fixedQueueRef.current && nextPiecesRef.current.length === 0 && holdPieceRef.current === null) {
      onQueueExhaustedRef.current?.();
      isPausedRef.current = true;
      setIsPaused(true);
      syncUi();
      return;
    }

    playerReset();
    dropCounter.current = 0;
  };

  const getGhostY = () => {
    let ghostY = player.current.pos.y;
    while (!collide(board.current, { matrix: player.current.matrix, pos: { x: player.current.pos.x, y: ghostY } })) {
      ghostY++;
    }
    return ghostY - 1;
  };

  const playerDrop = (drops = 1, isSoftDrop = false) => {
    let droppedThisFrame = 0;
    for (let i = 0; i < drops; i++) {
      player.current.pos.y++;
      if (collide(board.current, player.current)) {
        player.current.pos.y--;
        dropCounter.current = 0;
        break;
      }
      droppedThisFrame++;
    }
    if (droppedThisFrame > 0) {
      lastMoveRef.current = 'drop';
    }
  };

  const hardDrop = () => {
    const now = performance.now();
    if (now - lastHardDropTimeRef.current < 100) return;
    lastHardDropTimeRef.current = now;

    const dist = getGhostY() - player.current.pos.y;
    player.current.pos.y += dist;
    lastMoveRef.current = 'drop';
    lockPiece(); 
  };

  const playerMove = (offset: number) => {
    player.current.pos.x += offset;
    if (collide(board.current, player.current)) {
      player.current.pos.x -= offset;
      return false; 
    } else {
      lastMoveRef.current = 'move';
      if (isLockingRef.current) {
        if (lockResetsRef.current < 7) {
          lockTimerRef.current = 0;
          lockResetsRef.current++;
        }
      }
      return true; 
    }
  };

  const playerRotate = (dir: number) => {
    const originalMatrix = player.current.matrix;
    const originalPos = { ...player.current.pos };
    const originalRotState = player.current.rotState;

    let nextState = originalRotState;
    if (dir === 1) nextState = (originalRotState + 1) % 4; 
    else if (dir === -1) nextState = (originalRotState + 3) % 4; 
    else if (dir === 2) nextState = (originalRotState + 2) % 4; 

    if (dir === 2) {
      player.current.matrix = rotate(rotate(player.current.matrix, 1), 1);
    } else {
      player.current.matrix = rotate(player.current.matrix, dir);
    }

    if (player.current.matrix.length === 2) {
       if (!collide(board.current, player.current)) {
           player.current.rotState = nextState;
           lastMoveRef.current = 'rotate';
           if (isLockingRef.current) {
             if (lockResetsRef.current < 7) {
               lockTimerRef.current = 0;
               lockResetsRef.current++;
             }
           }
       } else {
           player.current.matrix = originalMatrix;
       }
       return;
    }

    let kicks = [{x: 0, y: 0}];
    if (dir === 2) {
        kicks = KICKS_180;
    } else {
        const key = `${originalRotState}-${nextState}`;
        if (player.current.matrix.length === 4) {
           kicks = I_WALL_KICKS[key] || [{x: 0, y: 0}];
        } else {
           kicks = WALL_KICKS[key] || [{x: 0, y: 0}];
        }
    }

    for (let i = 0; i < kicks.length; i++) {
        player.current.pos.x = originalPos.x + kicks[i].x;
        player.current.pos.y = originalPos.y + kicks[i].y;
        
        if (!collide(board.current, player.current)) {
            player.current.rotState = nextState;
            lastMoveRef.current = 'rotate';
            if (isLockingRef.current) {
              if (lockResetsRef.current < 7) {
                lockTimerRef.current = 0;
                lockResetsRef.current++;
              }
            }
            return;
        }
    }

    player.current.matrix = originalMatrix;
    player.current.pos = originalPos;
  };

  const holdPiece = () => {
    if (!canHoldRef.current) return;
    if (holdPieceRef.current === null) {
      holdPieceRef.current = player.current.type; playerReset();
    } else {
      const temp = player.current.type; player.current.type = holdPieceRef.current; player.current.matrix = PIECES[player.current.type];
      holdPieceRef.current = temp; player.current.pos.y = 0; player.current.pos.x = Math.floor(COLS / 2) - Math.floor(player.current.matrix[0].length / 2);
      player.current.rotState = 0;

      lowestYRef.current = player.current.pos.y;
      lockResetsRef.current = 0;

      canHoldRef.current = false;
      isLockingRef.current = false;
      lockTimerRef.current = 0;
      lastMoveRef.current = null;
      if (keysDown.current.left || keysDown.current.right) dasTimers.current.dcd = tuningRef.current.dcd;
      syncUi();
    }
    // Broadcast immediately rather than waiting for the next periodic tick
    // — Hold is a shared slot when sharedNextHold is on, so the partner's
    // view of it (and their own Hold box, since it's the same slot) should
    // update the instant this client changes it, not up to ~200ms later.
    if (isCoop && sharedNextHold) {
      onBoardUpdate?.({ board: board.current, pieceMatrix: player.current.matrix, pieceX: player.current.pos.x, pieceY: player.current.pos.y, livesRemaining: livesRemainingRef.current, score: scoreRef.current, level: levelRef.current, lines: linesRef.current, next: nextPiecesRef.current.slice(0, 5), hold: holdPieceRef.current, pendingGarbage: pendingGarbageRef.current });
    }
  };

  // Sandbox-only: forces the currently falling piece to become a specific
  // type, for practicing a setup that needs a particular piece right now.
  // Doesn't touch the next-piece queue, so the upcoming bag order is
  // unaffected — only this one piece is overridden.
  const spawnSandboxPiece = (type: number) => {
    if (!isSandboxRules) return;
    if (gameStateRef.current !== 'PLAYING') return;

    const matrix = PIECES[type];
    const pos = { x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2), y: 0 };
    if (collide(board.current, { matrix, pos })) return; // no room to force-spawn right now

    player.current.type = type;
    player.current.matrix = matrix;
    player.current.pos = pos;
    player.current.rotState = 0;

    lowestYRef.current = player.current.pos.y;
    lockResetsRef.current = 0;
    dropCounter.current = 0;

    canHoldRef.current = true;
    isLockingRef.current = false;
    lockTimerRef.current = 0;
    lastMoveRef.current = null;
    syncUi();
  };

  // Expose spawnSandboxPiece to the Build Battle piece picker via an imperative
  // ref — callers pass externalSpawnRef and call .current(type) to force-spawn.
  // Mount-only: spawnSandboxPiece reads from refs internally, so any version is equivalent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!externalSpawnRef) return;
    externalSpawnRef.current = spawnSandboxPiece;
    return () => { externalSpawnRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sandbox-only helpers: snapshot capture/restore for undo/redo, and board clear.

  const captureSnapshot = (): UndoSnapshot => ({
    board: board.current.map(r => [...r]),
    activePieceType: player.current.type,
    queue: [...nextPiecesRef.current],
    hold: holdPieceRef.current,
    score: scoreRef.current,
    lines: linesRef.current,
    level: levelRef.current,
  });

  const restoreSnapshot = (snap: UndoSnapshot) => {
    board.current = snap.board.map(r => [...r]);
    holdPieceRef.current = snap.hold;
    scoreRef.current = snap.score;
    linesRef.current = snap.lines;
    levelRef.current = snap.level;
    if (!zeroGravityRef.current) dropInterval.current = calculateDropInterval(snap.level);
    canHoldRef.current = true;
    isLockingRef.current = false;
    lockTimerRef.current = 0;
    lastMoveRef.current = null;
    dropCounter.current = 0;
    comboRef.current = -1;
    b2bRef.current = 0;
    // Put the active piece back at the front of the queue so playerReset spawns it.
    nextPiecesRef.current = [snap.activePieceType, ...snap.queue];
    playerReset();
    syncUi();
  };

  const undoSandbox = () => {
    if (!isSandboxRules || undoStackRef.current.length === 0) return;
    const snap = undoStackRef.current.pop()!;
    redoStackRef.current.push(captureSnapshot());
    restoreSnapshot(snap);
    onUndoRef.current?.(snap.activePieceType);
  };

  const redoSandbox = () => {
    if (!isSandboxRules || redoStackRef.current.length === 0) return;
    const replacedPieceType = player.current.type;
    const snap = redoStackRef.current.pop()!;
    undoStackRef.current.push(captureSnapshot());
    restoreSnapshot(snap);
    onRedoRef.current?.(replacedPieceType);
  };

  const clearSandboxBoard = () => {
    board.current = createMatrix(COLS, ROWS);
    holdPieceRef.current = null;
    canHoldRef.current = true;
    comboRef.current = -1;
    b2bRef.current = 0;
    dropCounter.current = 0;
    gameStartTimeRef.current = 0;
    if (timeDisplayRef.current) timeDisplayRef.current.innerText = '00:00.000';
    actionTextRef.current = { text: 'Board Cleared', timer: 1200 };
    undoStackRef.current = [];
    redoStackRef.current = [];
    // In puzzle mode (fixedQueue provided), reset to the original puzzle queue
    // so R acts as a proper restart from piece 1 — don't generate random bags.
    nextPiecesRef.current = fixedQueueRef.current && fixedQueueRef.current.length > 0
      ? [...fixedQueueRef.current]
      : [...generateBag(rngRef.current), ...generateBag(rngRef.current)];
    playerReset();
    syncUi();
  };

  // Opens the pause overlay on a specific tab, or closes it if that same tab
  // is already showing — each of the two Left Panel buttons (Settings /
  // Sandbox) calls this with its own tab, so they act as independent toggles
  // that share one underlying pause overlay.
  const openPanel = (tab: 'controls' | 'sandbox') => {
    // No pausing in versus, teams, teams-coop, or co-op — see the matching
    // guard in handleKeyDown's Escape/'p' branch for why. Neither the pause
    // overlay nor a Settings button is offered for any of these (their
    // keybind/handling adjustment, like versus's, happens ahead of time in
    // the lobby's standalone Controls panel).
    if (mode === 'versus' || isTeams || isTeamsCoop || isArena || mode === 'coop') return;
    if (gameState === 'COUNTDOWN') return;
    if (showControlsRef.current && settingsTab === tab) {
      showControlsRef.current = false;
      setShowControls(false);
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      setSettingsTab(tab);
      showControlsRef.current = true;
      setShowControls(true);
      isPausedRef.current = true;
      setIsPaused(true);
    }
  };

  // Toggles true zero-gravity: dropInterval becomes Infinity so the drop
  // timer (dropCounter > dropInterval) can never trip — the piece only moves
  // down via soft/hard drop. Turning it off restores the slider's level.
  //
  // Reads zeroGravityRef (not the zeroGravity state var) because this
  // function is called from handleKeyDown, which lives inside a
  // mount-only useEffect and therefore only ever sees the very first
  // render's closure. Reading state directly there would freeze `next` at
  // whatever it was on mount — the ref is a mutable box every closure reads
  // fresh, so it stays correct no matter how stale the calling closure is.
  const toggleZeroGravity = () => {
    const next = !zeroGravityRef.current;
    setZeroGravity(next);
    zeroGravityRef.current = next;
    dropInterval.current = next ? Infinity : calculateDropInterval(levelRef.current);
  };

  // Mirrors the guard at the top of handleKeyDown, so on-screen touch
  // buttons can't act while paused, in a menu, or before countdown ends.
  const canAct = () => gameStateRef.current === 'PLAYING' && !isPausedRef.current && !showControlsRef.current && !inputFrozenRef.current && !boardPausedRef.current;

  // PPS/APM tracking — called from lockPiece (one piece placed) and from
  // every keyboard/touch action below (one deliberate input). Sandbox is
  // excluded: it's a goalless practice mode, these rate stats don't mean
  // much there. Recomputed at event time rather than every frame, matching
  // why TIME itself is a direct DOM write instead of React state.
  const countPiece = () => {
    if (mode !== 'sprint' && mode !== 'blitz' && mode !== 'versus' && !isTeams && !isTeamsCoop && !isArena) return;
    piecesLockedRef.current += 1;
    const sec = elapsedTimeRef.current / 1000;
    setPps(sec > 0 ? piecesLockedRef.current / sec : 0);
  };
  const countAction = () => {
    if (mode !== 'sprint' && mode !== 'blitz' && mode !== 'versus' && !isTeams && !isTeamsCoop && !isArena) return;
    actionsRef.current += 1;
    const min = elapsedTimeRef.current / 60000;
    setApm(min > 0 ? actionsRef.current / min : 0);
  };

  // Touch equivalents of the keyboard handlers below — they drive the same
  // keysDown/dasTimers refs the DAS/ARR loop in update() already reads, so
  // holding a move button repeats exactly like holding the arrow key does.
  const touchMoveStart = (dir: -1 | 1) => {
    if (!canAct()) return;
    if (dir === -1) keysDown.current.left = true; else keysDown.current.right = true;
    dasTimers.current.das = 0;
    dasTimers.current.arr = 0;
    dasTimers.current.dcd = 0;
    playerMove(dir);
    countAction();
  };
  const touchMoveEnd = (dir: -1 | 1) => {
    if (dir === -1) keysDown.current.left = false; else keysDown.current.right = false;
  };
  const touchSoftDropStart = () => {
    if (!canAct()) return;
    keysDown.current.down = true;
    countAction();
  };
  const touchSoftDropEnd = () => {
    keysDown.current.down = false;
  };
  const touchRotate = (dir: number) => {
    if (!canAct()) return;
    playerRotate(dir);
    countAction();
  };
  const touchHardDrop = () => {
    if (!canAct()) return;
    hardDrop();
    countAction();
  };
  const touchHold = () => {
    if (!canAct()) return;
    holdPiece();
    countAction();
  };

  const drawMatrix = (ctx: CanvasRenderingContext2D, matrix: number[][], offset: { x: number, y: number }, variant: 'normal' | 'ghost' | 'partner' | 'partner-ghost' = 'normal') => {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const color = COLORS[value] as string;
          if (variant === 'ghost') {
            ctx.fillStyle = color; ctx.globalAlpha = 0.2; ctx.shadowBlur = 0;
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.globalAlpha = 0.5; ctx.strokeStyle = color; ctx.lineWidth = 1;
            ctx.strokeRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.globalAlpha = 1.0;
          } else if (variant === 'partner') {
            // Co-op only — the partner's live piece, overlaid on this
            // client's own canvas. Understated (the "2P" tag, not a bold
            // fill, is what's meant to say "this one's theirs") but bumped
            // back up a step from the first toned-down pass per feedback
            // that it had gone too faint to read comfortably.
            ctx.fillStyle = color; ctx.globalAlpha = 0.35; ctx.shadowBlur = 0;
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.globalAlpha = 0.6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
            ctx.strokeRect((x + offset.x) * BLOCK_SIZE + 2, (y + offset.y) * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
            ctx.globalAlpha = 1.0;
          } else if (variant === 'partner-ghost') {
            // Fainter than the player's own ghost (which itself is already
            // a subtle preview) — this is a landing guess for a piece that
            // isn't even this client's own, so it should recede further
            // into the background than anything else drawn here. Bumped up
            // a step alongside the 'partner' variant above, same feedback.
            ctx.fillStyle = color; ctx.globalAlpha = 0.14; ctx.shadowBlur = 0;
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.globalAlpha = 0.32; ctx.strokeStyle = color; ctx.lineWidth = 1;
            ctx.strokeRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
            ctx.globalAlpha = 1.0;
          } else {
            ctx.fillStyle = color; ctx.shadowBlur = 10; ctx.shadowColor = color;
            ctx.fillRect((x + offset.x) * BLOCK_SIZE + 1, (y + offset.y) * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
          }
        }
      });
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; ctx.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
    drawMatrix(ctx, board.current, { x: 0, y: 0 });
    // Co-op / teams-coop: every teammate's live piece, drawn from the same
    // broadcast data already powering opponent previews elsewhere — just
    // composited onto this client's own board instead of a separate
    // MiniBoard, since here it's genuinely the same board. Drawn before
    // this client's own piece so an overlap (both pieces still airborne
    // over the same cell) reads as "mine on top," not the reverse.
    // Read via the ref, not the opponentBoards prop directly — draw() only
    // ever runs through the requestAnimationFrame chain the mount-only
    // effect below kicks off, whose closure is frozen at mount (see
    // opponentBoardsRef's own comment). Reading the prop here would always
    // see whatever opponentBoards was on the very first render (normally
    // empty), which is why the partner's piece never actually appeared.
    // mode/selfTeam/opponentNicknames are all stable match-start values
    // (never change within one mount, same as `mode` itself), so reading
    // them directly here — unlike opponentBoards — is safe without a ref.
    if (isCoop || isTeamsCoop) {
      const teammates = (opponentBoardsRef.current ?? []).filter((o) => (isTeamsCoop ? (opponentTeams?.[o.guestId] ?? 1) === selfTeam : true) && o.pieceMatrix);
      for (const partner of teammates) {
        // Teammate's own landing preview — same collision math as this
        // client's own ghost (getGhostY), just run against the teammate's
        // piece/position instead of `player.current`, since it's genuinely
        // the same shared board. Uses the dedicated 'partner-ghost' variant
        // (fainter than the player's own ghost) rather than the 'ghost' one
        // — the tag on the solid piece is what distinguishes whose ghost is
        // whose, not a different ghost color.
        let teammateGhostY = partner.pieceY;
        while (!collide(board.current, { matrix: partner.pieceMatrix, pos: { x: partner.pieceX, y: teammateGhostY } })) {
          teammateGhostY++;
        }
        teammateGhostY -= 1;
        drawMatrix(ctx, partner.pieceMatrix, { x: partner.pieceX, y: teammateGhostY }, 'partner-ghost');
        drawMatrix(ctx, partner.pieceMatrix, { x: partner.pieceX, y: partner.pieceY }, 'partner');
        // Tag pinned to the piece's own top-left cell (not a fixed corner
        // of the board) so it stays legible and reads as "this piece is
        // theirs" even as the piece moves/rotates across the board. Coop
        // (always exactly one partner) keeps the original "2P" text; teams-
        // coop can have 2+ teammates sharing one board, so a truncated
        // nickname is what actually distinguishes them from each other,
        // not just from this client's own piece.
        let tagCol = 0;
        let tagRow = 0;
        outerTag: for (let y = 0; y < partner.pieceMatrix.length; y++) {
          for (let x = 0; x < partner.pieceMatrix[y].length; x++) {
            if (partner.pieceMatrix[y][x] !== 0) { tagCol = x; tagRow = y; break outerTag; }
          }
        }
        const tagText = isTeamsCoop ? (opponentNicknames?.[partner.guestId] || partner.guestId.slice(0, 4).toUpperCase()) : '2P';
        const tagX = (partner.pieceX + tagCol) * BLOCK_SIZE + 2;
        const tagY = (partner.pieceY + tagRow) * BLOCK_SIZE - 4;
        ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
        ctx.font = 'bold 10px sans-serif';
        ctx.textBaseline = 'bottom';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
        ctx.strokeText(tagText, tagX, Math.max(tagY, 10));
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(tagText, tagX, Math.max(tagY, 10));
      }
    }
    const ghostY = getGhostY();
    drawMatrix(ctx, player.current.matrix, { x: player.current.pos.x, y: ghostY }, 'ghost');
    drawMatrix(ctx, player.current.matrix, player.current.pos);
  };

  const update = (time = 0) => {
    if (lastTime.current === 0) {
      lastTime.current = time;
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const deltaTime = time - lastTime.current;
    lastTime.current = time;

    if (gameStateRef.current === 'PLAYING') {
      // Labeled so the Blitz-timeout branch below can bail out of just this
      // frame's game logic with `break`. It used to `return` here, which
      // exited update() itself and skipped the requestAnimationFrame(update)
      // call at the very bottom of this function — permanently killing the
      // game loop the instant Blitz's clock hit zero, so no amount of
      // clicking "Play Again" afterward could ever resume it.
      playingFrame: {

      if (gameStartTimeRef.current === 0) {
        gameStartTimeRef.current = time;
      }

      if (!isPausedRef.current && !showControlsRef.current && !(focusRef && !focusRef.current) && !inputFrozenRef.current && !boardPausedRef.current) {
        elapsedTimeRef.current = time - gameStartTimeRef.current;

        // timeBasedGravity: gravity ramps off elapsed match time instead of
        // this player's own line clears (see the constants/comment above
        // insertUnclearableRow), so every player in the same match speeds up
        // identically regardless of how they're personally playing — and
        // past the ramp, a solid unclearable row rises on a fixed schedule
        // to force the match toward a close. Recomputed every frame off
        // elapsedTimeRef rather than a timer, matching how this file already
        // treats TIME/APM/PPS as "recompute from elapsed time," not ticks.
        if (timeBasedGravity) {
          const rampLevel = Math.min(
            ARENA_GRAVITY_MAX_LEVEL,
            1 + Math.floor(elapsedTimeRef.current / (ARENA_GRAVITY_RAMP_MS / (ARENA_GRAVITY_MAX_LEVEL - 1)))
          );
          if (rampLevel !== levelRef.current) {
            levelRef.current = rampLevel;
            dropInterval.current = calculateDropInterval(rampLevel);
          }

          if (elapsedTimeRef.current >= ARENA_GRAVITY_RAMP_MS) {
            const expectedRows = Math.floor((elapsedTimeRef.current - ARENA_GRAVITY_RAMP_MS) / ARENA_SUDDEN_DEATH_ROW_INTERVAL_MS) + 1;
            const newRows = expectedRows - suddenDeathRowsInsertedRef.current;
            if (newRows > 0) {
              if (suddenDeathRowsInsertedRef.current === 0) {
                actionTextRef.current = { text: 'SUDDEN DEATH', timer: 2500 };
              }
              for (let i = 0; i < newRows; i++) insertUnclearableRow(board.current);
              suddenDeathRowsInsertedRef.current = expectedRows;
            }
          }
        }

        if ((mode === 'sprint' || isSandboxRules || mode === 'versus' || isTeams || isTeamsCoop || isArena || isCoop) && timeDisplayRef.current) {
           // Sandbox's stopwatch just counts up, same as Sprint's — it's
           // reset (not stopped) whenever the board clears, in handleGameOver.
           timeDisplayRef.current.innerText = formatTime(elapsedTimeRef.current);
        } else if (mode === 'blitz' && timeDisplayRef.current) {
           // --- NEW: BLITZ TIMER LOGIC ---
           const timeLeft = Math.max(0, BLITZ_TIME_LIMIT - elapsedTimeRef.current);
           timeDisplayRef.current.innerText = formatTime(timeLeft);

           if (timeLeft === 0) {
              handleGameOver(true);
              break playingFrame;
           }
        }
      }

      if (actionTextRef.current.timer > 0) {
        actionTextRef.current.timer -= deltaTime;
        if (actionTextRef.current.timer <= 0) {
          actionTextRef.current.text = '';
          syncUi();
        }
      }

      if (!isPausedRef.current && !showControlsRef.current && !(focusRef && !focusRef.current) && !boardPausedRef.current) {
        if (keysDown.current.left || keysDown.current.right) {
          if (dasTimers.current.dcd > 0) {
            dasTimers.current.dcd -= deltaTime;
          } else {
            dasTimers.current.das += deltaTime;
            if (dasTimers.current.das >= tuningRef.current.das) {
              dasTimers.current.arr += deltaTime;
              const currentArr = tuningRef.current.arr;
              if (currentArr === 0) {
                let moved = true;
                while(moved) moved = playerMove(keysDown.current.left ? -1 : 1);
              } else {
                while (dasTimers.current.arr >= currentArr) {
                  playerMove(keysDown.current.left ? -1 : 1);
                  dasTimers.current.arr -= currentArr;
                }
              }
            }
          }
        } else {
          dasTimers.current.das = 0;
          dasTimers.current.arr = 0;
          dasTimers.current.dcd = 0;
        }

        if (keysDown.current.down) {
           // With 0-G, dropInterval is Infinity, so the dropCounter-based
           // accumulation below can never trip — soft drop would silently do
           // nothing at less-than-max SDF. Route it through the same instant
           // ghost-jump the max-SDF case already uses, so holding down always
           // fully drops the piece regardless of the SDF setting.
           if (tuningRef.current.sdf >= 41 || zeroGravityRef.current) {
              const dist = getGhostY() - player.current.pos.y;
              if (dist > 0) {
                player.current.pos.y += dist;
                lastMoveRef.current = 'drop';
                syncUi();
              }
           } else {
              dropCounter.current += deltaTime * tuningRef.current.sdf;
           }
        } else {
           dropCounter.current += deltaTime * gravityMultiplierRef.current;
        }

        if (player.current.pos.y > lowestYRef.current) {
           lowestYRef.current = player.current.pos.y;
           lockResetsRef.current = 0; 
           lockTimerRef.current = 0; // ◄ 1. ADD THIS: Only reset the timer when falling to a new depth
        }

        player.current.pos.y++;
        const isSupported = collide(board.current, player.current);
        player.current.pos.y--;

        if (isSupported) {
          isLockingRef.current = true;
          lockTimerRef.current += deltaTime;
          if (lockTimerRef.current >= 500) lockPiece();
        } else {
          isLockingRef.current = false;
          // ◄ 2. REMOVE the lockTimerRef.current = 0; that was here!
          
          if (dropInterval.current <= 0) {
             player.current.pos.y = getGhostY();
             dropCounter.current = 0;
          } else if (dropCounter.current > dropInterval.current) {
            const drops = Math.floor(dropCounter.current / dropInterval.current);
            const isSoftDrop = keysDown.current.down && tuningRef.current.sdf < 41;
            playerDrop(drops, isSoftDrop);
            
            if (dropCounter.current > 0) {
               dropCounter.current %= dropInterval.current; 
            }
          }
        }
      }
      } // end playingFrame

      if (liveStateRef) {
        liveStateRef.current = {
          board: board.current,
          pieceMatrix: player.current.matrix,
          pieceType: player.current.type,
          pieceX: player.current.pos.x,
          pieceY: player.current.pos.y,
          ghostY: getGhostY(),
          nextPieces: nextPiecesRef.current.slice(0, 5),
          holdPiece: holdPieceRef.current,
        };
      }

      // Live opponent-preview broadcast — the piece's actual current matrix
      // (already rotated) and position, not just its type/spawn point, so
      // MiniBoard can render exactly what's happening rather than guessing.
      // Throttled rather than tied to any specific action, so it also covers
      // plain gravity between inputs, which the once-per-lock broadcast
      // alone never captured.
      if ((isMultiplayerRoom || isCoop || isTeamsCoop || isArena) && time - lastPreviewBroadcastRef.current > PREVIEW_BROADCAST_INTERVAL_MS) {
        lastPreviewBroadcastRef.current = time;
        onBoardUpdate?.({ board: board.current, pieceMatrix: player.current.matrix, pieceX: player.current.pos.x, pieceY: player.current.pos.y, livesRemaining: livesRemainingRef.current, score: scoreRef.current, level: levelRef.current, lines: linesRef.current, next: nextPiecesRef.current.slice(0, 5), hold: holdPieceRef.current, pendingGarbage: pendingGarbageRef.current });
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx, canvas);
    }
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    // Expose an in-place board-clear so PuzzleEditor's "Record Opener PC"
    // can reset the board without remounting. Keeping the current active
    // piece + queue means whatever piece was falling when the button was
    // clicked becomes piece 0 of the recording — the piece order is
    // preserved, the board is simply erased beneath it.
    if (clearBoardRef) {
      clearBoardRef.current = () => {
        board.current = createMatrix(COLS, ROWS);
        holdPieceRef.current = null;
        canHoldRef.current = true;
        comboRef.current = -1;
        b2bRef.current = 0;
        dropCounter.current = 0;
        undoStackRef.current = [];
        redoStackRef.current = [];
        // Re-spawn the current piece type at the top without shifting from
        // the queue — type and next-queue order are unchanged.
        player.current.pos.y = 0;
        player.current.pos.x = Math.floor(COLS / 2) - Math.floor(player.current.matrix[0].length / 2);
        player.current.rotState = 0;
        player.current.matrix = PIECES[player.current.type];
        lowestYRef.current = 0;
        lockResetsRef.current = 0;
        isLockingRef.current = false;
        lockTimerRef.current = 0;
        lastMoveRef.current = null;
        actionTextRef.current = { text: 'Board Cleared', timer: 800 };
        syncUi();
      };
    }

    // React Strict Mode invokes mount-only effects twice in development
    // (mount → cleanup → remount). nextPiecesRef is a useRef that initialises
    // once, so the second invocation sees a queue that already had its first
    // element shifted out — playerReset() would then consume piece 1 instead
    // of piece 0, silently skipping the intended first piece. Reset from the
    // appropriate source so the effect is idempotent across both runs.
    if (fixedQueueRef.current && fixedQueueRef.current.length > 0) {
      nextPiecesRef.current = [...fixedQueueRef.current];
    } else {
      nextPiecesRef.current = [...initialQueueSnapshotRef.current];
    }

    if (initialActivePiece) {
      // Place the saved piece at its exact frozen position without consuming
      // from the queue — the queue is already seeded from initialNextPieces.
      player.current.type = initialActivePiece.type;
      player.current.matrix = initialActivePiece.matrix.map((r) => [...r]);
      player.current.pos.x = initialActivePiece.x;
      player.current.pos.y = initialActivePiece.y;
      player.current.rotState = 0;
      lowestYRef.current = initialActivePiece.y;
      lockResetsRef.current = 0;
      canHoldRef.current = true;
      isLockingRef.current = false;
      lockTimerRef.current = 0;
      lastMoveRef.current = null;
      syncUi();
    } else {
      playerReset();
    }
    requestRef.current = requestAnimationFrame(update);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      if (focusRef && !focusRef.current) return;
      if (inputFrozenRef.current) return;

      if (listeningActionRef.current) {
        e.preventDefault();
        const targetAction = listeningActionRef.current;
        setControls(prev => ({ ...prev, [targetAction]: e.key }));
        listeningActionRef.current = null;
        setListeningAction(null);
        return;
      }
      
      const c = controlsRef.current;
      const mappedKeys = Object.values(c);
      
      if (mappedKeys.includes(e.key) || e.key === 'p' || e.key === 'Escape') {
        e.preventDefault(); 
      }
      
      // Versus, teams, teams-coop, and co-op deliberately have no pause:
      // freezing your own board (gravity, clock, DAS) while a live
      // opponent/partner keeps playing is a "no" in real time — it's a
      // free timeout only you get. Keybind/handling adjustment for all of
      // these lives in the lobby's standalone ControlsSettings panel
      // instead, before the match starts.
      if ((e.key === 'p' || e.key === 'Escape') && mode !== 'versus' && !isTeams && !isTeamsCoop && !isArena && mode !== 'coop') {
        const willShow = !showControlsRef.current;
        showControlsRef.current = willShow;
        setShowControls(willShow);
        isPausedRef.current = willShow;
        setIsPaused(willShow);
        return;
      }

      if (isPausedRef.current || showControlsRef.current) return;
      if (e.repeat) return; 

      // Guard all piece-movement actions against modifier keys so that combos
      // like Ctrl+Z (undo) or Ctrl+X (redo) don't also trigger rotate/move.
      if (!e.ctrlKey && !e.metaKey && e.key === c['Left']) {
        keysDown.current.left = true;
        dasTimers.current.das = 0;
        dasTimers.current.arr = 0;
        dasTimers.current.dcd = 0;
        playerMove(-1);
        countAction();
      }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Right']) {
        keysDown.current.right = true;
        dasTimers.current.das = 0;
        dasTimers.current.arr = 0;
        dasTimers.current.dcd = 0;
        playerMove(1);
        countAction();
      }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Down']) { keysDown.current.down = true; countAction(); }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Rotate CW']) { if (!lockRotationRef.current) { playerRotate(1); countAction(); } }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Rotate CCW']) { if (!lockRotationRef.current) { playerRotate(-1); countAction(); } }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Rotate 180']) { if (!lockRotationRef.current) { playerRotate(2); countAction(); } }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Hard Drop']) {
        if (!keysDown.current.hardDrop) {
            keysDown.current.hardDrop = true;
            hardDrop();
            countAction();
        }
      }
      else if (!e.ctrlKey && !e.metaKey && e.key === c['Hold']) { holdPiece(); countAction(); }
      else if (isSandboxRules && e.key === c['Undo']) undoSandbox();
      else if (isSandboxRules && e.key === c['Redo']) redoSandbox();
      else if (isSandboxRules && !limitedSandbox && e.key === c['Clear Board']) clearSandboxBoard();
      else if (isSandboxRules && e.key === c['Toggle 0-G']) toggleZeroGravity();
      else if (isSandboxRules && !limitedSandbox) {
        const pieceHotkey = SPAWN_HOTKEY_ACTIONS.find((p) => !e.ctrlKey && !e.metaKey && e.key === c[p.action]);
        if (pieceHotkey) spawnSandboxPiece(pieceHotkey.type);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'PLAYING') return;
      const c = controlsRef.current;
      
      if (e.key === c['Left']) keysDown.current.left = false;
      if (e.key === c['Right']) keysDown.current.right = false;
      if (e.key === c['Down']) keysDown.current.down = false;
      if (e.key === c['Hard Drop']) keysDown.current.hardDrop = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { 
      window.removeEventListener('keydown', handleKeyDown); 
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current); 
    };
  }, []);

  // Every opponent in the match roster gets a preview slot from the moment
  // the match starts, not just the ones who've locked a piece yet — without
  // this, a bigger lobby's previews would pop in one at a time as each
  // opponent places their first piece instead of all showing up (empty)
  // immediately. Falls back to opponentBoards' own guestIds if opponentIds
  // wasn't passed, matching the old behavior.
  // An opponent whose own first broadcast hasn't arrived yet gets a plain
  // empty board with no piece overlay — deliberately not a guessed piece
  // (a prior version rendered everyone's provably-identical first piece from
  // the shared seed here, but that meant the preview always briefly showed a
  // piece that then visibly snapped to the real one once actual data
  // arrived). No piece is genuinely more accurate than a guessed one: it
  // reads as "waiting for data," not as a wrong answer.
  const previewBoards = (opponentIds ?? opponentBoards?.map((b) => b.guestId) ?? []).map((guestId) => {
    const real = opponentBoards?.find((b) => b.guestId === guestId);
    const eliminated = eliminatedOpponentIds?.includes(guestId) ?? false;
    const nickname = opponentNicknames?.[guestId] || guestId.slice(0, 4).toUpperCase();
    // Teams only — which team this opponent is on, for the compact preview
    // column's grouped layout below. undefined for every other mode.
    const team = opponentTeams?.[guestId];
    return real
      ? { ...real, eliminated, nickname, team }
      : { guestId, board: EMPTY_MINI_BOARD, pieceMatrix: undefined, pieceX: 0, pieceY: 0, eliminated, livesRemaining: lives ?? 1, nickname, team, pendingGarbage: undefined };
  });

  // A genuine 1v1 (exactly one opponent) on a desktop-sized viewport gets its
  // own large board rendered directly beside the player's, rather than the
  // small side-column preview used for a fuller room — there's no rest of
  // the room competing for space, and it's the one board actually worth
  // reading at a glance. Mobile keeps the compact column regardless (no
  // static pixel width for the main board there — it's a CSS min() against
  // viewport width — so there's nothing reliable to size 90% of).
  const isDesktopOneVOne = (isMultiplayerRoom || isArena) && !isMobile && previewBoards.length === 1;
  // Main board is a fixed COLS*BLOCK_SIZE (300px) canvas on desktop — sized
  // to match it exactly (100%), per feedback that a genuine 1v1 should read
  // as "their board, same size as mine," not a slightly-smaller preview.
  // Fixed (not cellSize-proportional) gap/padding here — see MiniBoard above
  // for why — so solving total-width = COLS*cellSize + (COLS-1)*gap +
  // 2*padding for cellSize lands the *whole board*, not just its cells, at
  // that target.
  const ONE_V_ONE_GAP = 1;
  const ONE_V_ONE_PADDING = 4;
  const oneVOneBoardWidth = COLS * BLOCK_SIZE;
  const oneVOneCellSize = (oneVOneBoardWidth - 2 * ONE_V_ONE_PADDING - (COLS - 1) * ONE_V_ONE_GAP) / COLS;

  // Same activeRoster the quit-vote-pass effect uses (excludes anyone
  // already gone) — +1 in the total for self, since selfQuitVote is tracked
  // separately from the quitVotes set (see useOnlineRoom).
  const activeQuitRoster = (opponentIds ?? []).filter((id) => !eliminatedOpponentIds?.includes(id));
  const quitVoteCount = (selfQuitVote ? 1 : 0) + activeQuitRoster.filter((id) => quitVotes?.has(id)).length;
  const quitVoteTotal = activeQuitRoster.length + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.6rem' : 0, width: '100%', maxWidth: isMobile ? '100%' : (isDesktopOneVOne ? '68rem' : '48rem'), fontFamily: 'monospace', userSelect: 'none' }}>
    <div style={{ display: 'flex', flexDirection: 'row', gap: isMobile ? '0.5rem' : '3rem', alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>

      {/* Left Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1.5rem', width: isMobile ? '4rem' : '7rem', flexShrink: 0, paddingTop: isMobile ? 0 : '1rem', justifyContent: 'space-between', alignItems: 'stretch', height: isMobile ? 'auto' : '600px' }}>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.75rem' }}>
            <p style={{ fontSize: isMobile ? '0.55rem' : '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>HOLD</p>
            <div style={{ width: isMobile ? '4rem' : '7rem', height: isMobile ? '3.2rem' : '6rem', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
               {fogActive ? <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.05em' }}>?</span> : <MiniPiece type={uiState.hold} />}
            </div>
          </div>

          {/* Partner's Hold — co-op, sharing off only. Read straight off
              opponentBoards (broadcast unconditionally, not just when
              sharing), same read-only-peek treatment as Partner's Next
              below. Hidden once sharing is on: at that point Hold is a
              genuinely shared slot (see the isCoop adopt effect), so this
              client's own Hold box above already shows it — a second copy
              would just be redundant. */}
          {isCoop && !sharedNextHold && opponentBoards?.[0] && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.75rem', marginTop: isMobile ? '0.5rem' : '1rem' }}>
              <p style={{ fontSize: isMobile ? '0.55rem' : '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>PARTNER&apos;S HOLD</p>
              <div style={{ width: isMobile ? '4rem' : '7rem', height: isMobile ? '3.2rem' : '6rem', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
                <MiniPiece type={opponentBoards[0].hold} />
              </div>
            </div>
          )}

          {/* No Settings button in versus, teams, teams-coop, or co-op —
              see openPanel/handleKeyDown for why pausing isn't allowed
              there. Keybinds/handling for all of these are set ahead of
              time in the lobby's Controls panel instead. */}
          {(gameState === 'PLAYING' || gameState === 'COUNTDOWN') && mode !== 'versus' && !isTeams && !isTeamsCoop && !isArena && mode !== 'coop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: isMobile ? '0.6rem' : '1.5rem' }}>
              <button
                onClick={() => openPanel('controls')}
                style={{ padding: isMobile ? '5px 2px' : '8px', backgroundColor: 'color-mix(in srgb, var(--tt-accent) 15%, black)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '8px' : '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              >
                {showControls && settingsTab === 'controls' ? 'Resume' : 'Settings'}
              </button>
              {isSandboxRules && (
                <button
                  onClick={() => openPanel('sandbox')}
                  style={{ padding: isMobile ? '5px 2px' : '8px', backgroundColor: 'color-mix(in srgb, var(--tt-accent) 15%, black)', color: 'var(--tt-accent)', border: '1px solid color-mix(in srgb, var(--tt-accent) 30%, transparent)', borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '8px' : '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                >
                  {showControls && settingsTab === 'sandbox' ? 'Resume' : 'Sandbox'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mid-match Quit is a vote, not a unilateral leave — clicking it
            casts this client's own vote and toggles to "Cancel Vote" rather
            than acting immediately; the match only actually ends once every
            still-active player has done the same (see the quit-vote-pass
            effect above). Solo modes (no room, no one else to vote with)
            keep the original instant behavior. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {(isMultiplayerRoom || isCoop || isTeamsCoop) && quitVoteDeadline != null && (
            <p style={{ fontSize: isMobile ? '0.5rem' : '0.6rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.3, margin: 0 }}>
              {quitVoteCount}/{quitVoteTotal} vote to quit<br />{quitVoteRemainingSec}s
            </p>
          )}
          <button
            onClick={() => {
              // Only use the vote mechanism when it's actually wired up.
              // Journey passes opponentIds=[] and no onQuitVote, so it falls
              // through to the confirmation path even though isMultiplayerRoom
              // is true for mode='versus'.
              const canQuitVote = (isMultiplayerRoom || isCoop || isTeamsCoop) && !!onQuitVote;
              if (canQuitVote) {
                (selfQuitVote ? onRetractQuitVote : onQuitVote)?.();
              } else if (quitConfirm) {
                onMenu();
              } else {
                setQuitConfirm(true);
              }
            }}
            style={{ padding: isMobile ? '5px 2px' : '8px',
              backgroundColor: quitConfirm ? 'color-mix(in srgb, #f87171 15%, black)' : 'color-mix(in srgb, var(--tt-accent) 15%, black)',
              color: quitConfirm ? '#f87171' : 'var(--tt-accent)',
              border: quitConfirm ? '1px solid rgba(248,113,113,0.4)' : '1px solid color-mix(in srgb, var(--tt-accent) 30%, transparent)',
              borderRadius: '4px', cursor: 'pointer', fontSize: isMobile ? '8px' : '12px', textTransform: 'uppercase', letterSpacing: '0.1em',
              transition: 'background-color 0.15s, color 0.15s, border-color 0.15s' }}>
            {((isMultiplayerRoom || isCoop || isTeamsCoop) && !!onQuitVote && selfQuitVote) ? 'Cancel Vote' : quitConfirm ? 'Confirm?' : 'Quit'}
          </button>
        </div>
      </div>

      {/* Center Panel — wrapped in a column so an optional "Lives" tag can
          sit above the board itself, same small-label language as
          HOLD/NEXT/OPPONENT elsewhere, only shown once the host actually
          turns lives on (see the HUD's own gating for why the default stays
          untouched). */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
        {(mode === 'versus' || isTeams || isTeamsCoop || isArena) && (lives ?? 1) > 1 && (
          <p style={{ fontSize: isMobile ? '0.6rem' : '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: 0, padding: isMobile ? '1px 6px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px', textTransform: 'uppercase' }}>
            Lives: {livesDisplay} / {lives}
          </p>
        )}
      {/* Garbage Bar + board wrapper, in their own row. The bar used to sit
          as a sibling of the Left/Right Panel columns and stretch to match
          THEIR combined row height — which, per direct report, could run
          taller than the board itself (versus's stats box, or a taller
          Right Panel in general, pushes the outer row's height past the
          board's own 600px+border), leaving the bar visibly longer than the
          board it's meant to represent. Nesting it here instead, as a
          sibling of only the board wrapper div, ties its height to exactly
          that div's own rendered height via alignSelf: 'stretch' on a row
          with no other, taller siblings — and puts it directly against the
          board, per "right next to the game." */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: isMobile ? '0.3rem' : '0.5rem' }}>
        {(mode === 'versus' || isTeams || isTeamsCoop || isArena) && (
          <div style={{ alignSelf: 'stretch', width: isMobile ? '0.4rem' : '0.7rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%' }}>
              {/* Each segment represents 2 garbage lines rather than 1 —
                  doubling the bar's effective scale (up to ROWS * 2 lines
                  before it visually maxes out, instead of ROWS) — with the
                  odd line, when pending count is odd, shown as only the
                  bottom half of the next segment lit, per direct request
                  ("each line about to be received be half a bar"). */}
              {Array.from({ length: ROWS }).map((_, i) => {
                const fullSegments = Math.floor(pendingGarbageDisplay / 2);
                const hasHalf = pendingGarbageDisplay % 2 === 1;
                const posFromBottom = ROWS - 1 - i;
                const isFull = posFromBottom < fullSegments;
                const isHalf = !isFull && posFromBottom === fullSegments && hasHalf;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      borderRadius: '1px',
                      position: 'relative',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    {(isFull || isHalf) && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: isFull ? '100%' : '50%',
                          backgroundColor: '#f87171',
                          boxShadow: '0 0 6px rgba(248,113,113,0.8)',
                          transition: 'height 0.15s ease',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      <div style={{ position: 'relative', border: '2px solid rgba(255,255,255,0.1)', backgroundColor: 'black', borderRadius: '0.5rem', boxShadow: '0 0 30px rgba(0,0,0,0.5)', overflow: 'hidden', flexShrink: 0 }}>
        <canvas ref={canvasRef} width={300} height={600} style={isMobile ? { display: 'block', width: 'min(190px, calc(100vw - 224px))', height: 'auto' } : { display: 'block' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '100% 4px' }} />

        {/* COUNTDOWN OVERLAY */}
        {gameState === 'COUNTDOWN' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <h2 style={{ color: 'var(--tt-accent)', fontSize: '5rem', fontWeight: 'bold', textShadow: '0 0 20px color-mix(in srgb, var(--tt-accent) 80%, transparent)', margin: 0, letterSpacing: '0.1em', animation: 'pop 0.3s ease-out' }}>
              {countdownText}
            </h2>
          </div>
        )}

        {/* HIGH SCORE ENTRY OVERLAY */}
        {gameState === 'NAME_ENTRY' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '2rem', overflowY: 'auto' }}>
             <h3 style={{ color: 'var(--tt-accent)', letterSpacing: '0.1em', marginBottom: '1rem', marginTop: 0, fontSize: '1.25rem', textAlign: 'center' }}>
               {mode === 'sprint' ? 'NEW BEST TIME!' : 'NEW HIGH SCORE!'}
             </h3>
             <p style={{ color: 'white', marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,255,255,0.5)', margin: '0 0 2rem 0' }}>
               {mode === 'sprint' ? formatTime(uiState.score) : uiState.score}
             </p>
             
             <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Enter Initials</p>
             <input 
               autoFocus
               maxLength={3}
               value={nameInput}
               onChange={(e) => setNameInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
               onKeyDown={(e) => { if (e.key === 'Enter') saveHighScore(); }}
               style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid var(--tt-accent)', color: 'white', fontSize: '2.5rem', width: '6rem', textAlign: 'center', textTransform: 'uppercase', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.2em', padding: '0 0 0.5rem 0' }}
             />
             <button disabled={isSubmitting} onClick={saveHighScore} style={{ marginTop: '2.5rem', backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 32px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold', opacity: isSubmitting ? 0.5 : 1 }}>
               {isSubmitting ? 'Saving...' : 'Save'}
             </button>
          </div>
        )}

        {/* VERSUS/TEAMS RESULT OVERLAY — Rematch returns to the lobby
            without leaving the room (see onRematchMenu, wired in
            VersusApp). Reflects either this client's own topout or
            outlasting every opponent/enemy team (see handleGameOver's
            versus/teams branch and the last-standing effect above); teams
            reuses this overlay verbatim, only the win text differs. */}
        {gameState === 'LEADERBOARD' && (mode === 'versus' || isTeams || isTeamsCoop || isArena) && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '2rem 1.5rem', overflowY: 'auto' }}>
            <h3 style={{ color: 'var(--tt-accent)', letterSpacing: '0.15em', marginBottom: '1rem', marginTop: 0, fontSize: '1.1rem', textAlign: 'center' }}>
              {versusOutcome === 'won-last-standing' && ((isTeams || isTeamsCoop) ? 'YOU WIN — LAST TEAM STANDING' : 'YOU WIN — LAST ONE STANDING')}
              {versusOutcome === 'lost-topout' && 'TOPPED OUT'}
            </h3>
            <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,255,255,0.5)', margin: '0 0 2rem 0' }}>
              {formatTime(uiState.score)}
            </p>
            {!isArena && (
              <button
                onClick={(isMultiplayerRoom || isCoop || isTeamsCoop) ? onMatchHome : onRematchMenu}
                style={{ backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 32px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold' }}
              >
                {(isMultiplayerRoom || isCoop || isTeamsCoop) ? 'Home' : 'Rematch'}
              </button>
            )}
            {(isArena || isMultiplayerRoom || isCoop || isTeamsCoop) && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', marginTop: '0.75rem', textAlign: 'center' }}>
                {isArena ? 'Returning to queue automatically...' : 'Returning to main menu automatically...'}
              </p>
            )}
          </div>
        )}

        {/* CO-OP RESULT OVERLAY — a shared loss, not a win/lose split (see
            handleGameOver's coop branch and the shared-game-over effect
            above). Shows the team's actual score/level/lines, not a
            race-clock time the way versus's overlay does — scoreRef is left
            untouched at game-over for coop specifically for this reason. */}
        {gameState === 'LEADERBOARD' && mode === 'coop' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '2rem 1.5rem', overflowY: 'auto' }}>
            <h3 style={{ color: 'var(--tt-accent)', letterSpacing: '0.15em', marginBottom: '1rem', marginTop: 0, fontSize: '1.1rem', textAlign: 'center' }}>
              GAME OVER
            </h3>
            <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,255,255,0.5)', margin: '0 0 0.5rem 0' }}>
              {uiState.lines} lines
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 2rem 0' }}>
              Level {uiState.level}
            </p>
            <button
              onClick={onMatchHome ?? onRematchMenu}
              style={{ backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '10px 32px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.1em', fontWeight: 'bold' }}
            >
              Home
            </button>
          </div>
        )}

        {/* BLITZ GAME-OVER OVERLAY */}
        {gameState === 'LEADERBOARD' && mode === 'blitz' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '2rem 1.5rem' }}>
            <h3 style={{ color: 'var(--tt-accent)', letterSpacing: '0.15em', marginBottom: '1rem', marginTop: 0, fontSize: '1.1rem', textAlign: 'center' }}>TIME&apos;S UP</h3>
            <p style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(255,255,255,0.5)', margin: '0 0 0.5rem 0' }}>
              {uiState.lines} lines
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 2rem 0' }}>
              Level {uiState.level}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <button onClick={restartGame} style={{ backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Play Again
              </button>
              <button onClick={onMenu} style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '4px', padding: '10px', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Main Menu
              </button>
            </div>
          </div>
        )}

        {/* LEADERBOARD OVERLAY */}
        {gameState === 'LEADERBOARD' && mode === 'sprint' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 30, padding: '2rem 1.5rem', overflowY: 'auto' }}>
            <h3 style={{ color: 'white', letterSpacing: '0.2em', marginBottom: '1.5rem', marginTop: 0, fontSize: '1.25rem', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>LEADERBOARD</h3>
            
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {leaderboard.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center', marginTop: '2rem' }}>NO SCORES YET</p>
              )}
              {leaderboard.map((entry, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: i === 0 ? 'color-mix(in srgb, var(--tt-accent) 10%, transparent)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span style={{ color: i === 0 ? 'var(--tt-accent)' : 'rgba(255,255,255,0.5)', fontSize: '12px', width: '1.5rem' }}>#{i + 1}</span>
                      <span style={{ color: i === 0 ? 'white' : 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.1em' }}>{entry.name}</span>
                    </div>
                    <span style={{ color: i === 0 ? 'var(--tt-accent)' : 'white', fontSize: '14px', fontFamily: 'monospace', textShadow: i === 0 ? '0 0 8px color-mix(in srgb, var(--tt-accent) 50%, transparent)' : 'none' }}>
                      {mode === 'sprint' ? formatTime(entry.score) : entry.score}
                    </span>
                 </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '1rem' }}>
               <button onClick={restartGame} style={{ backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                 Play Again
               </button>
               <button onClick={onMenu} style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', borderRadius: '4px', padding: '10px', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                 Main Menu
               </button>
            </div>
          </div>
        )}

        {/* PAUSE OVERLAY */}
        {isPaused && !showControls && gameState === 'PLAYING' && !suppressPauseOverlay && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <h3 style={{ color: 'white', letterSpacing: '0.3em', margin: 0, textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>PAUSED</h3>
          </div>
        )}

        {/* SETTINGS OVERLAY */}
        {showControls && (gameState === 'PLAYING' || gameState === 'COUNTDOWN') && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20, padding: '2rem 1.5rem', overflowY: 'auto' }}>
            
            <h3 style={{ color: 'white', border: 'rgba(235, 15, 96, 0.65)', letterSpacing: '0.25em', marginBottom: '1.2rem', marginTop: 0, fontSize: '1.1rem' }}>
              {settingsTab === 'sandbox' ? 'Sandbox' : 'Settings'}
            </h3>

            {settingsTab === 'controls' && (
              <>
                <p style={{ color: 'var(--tt-accent)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.75rem 0', alignSelf: 'flex-start' }}>Keybinds</p>
                <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '1.5rem' }}>
                  {Object.entries(controls)
                    .filter(([action]) =>
                      action !== 'null'
                      && !action.startsWith('Spawn ')
                      && !(SANDBOX_HOTKEY_ACTIONS as readonly string[]).includes(action)
                    )
                    .map(([action, keyName]) => (
                    <div key={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', textAlign: 'center' }}>
                        {action}
                      </span>
                      <button
                        onClick={() => {
                          setListeningAction(action);
                          listeningActionRef.current = action;
                        }}
                        style={{ backgroundColor: listeningAction === action ? 'var(--tt-accent)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px', fontSize: '10px', cursor: 'pointer', width: '100%', maxWidth: '90px', textAlign: 'center', height: '26px' }}
                      >
                        {listeningAction === action ? '...' : (keyName === ' ' ? 'Space' : keyName.replace('Arrow', ''))}
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                  <p style={{ color: 'var(--tt-accent)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Handling</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>DAS (Delay)</span>
                      <span style={{ color: 'white', fontSize: '10px' }}>{tuning.das}ms</span>
                    </div>
                    <input type="range" min="50" max="300" step="10" value={tuning.das} onChange={(e) => setTuning(p => ({...p, das: Number(e.target.value)}))} style={{ width: '100%', accentColor: 'var(--tt-accent)', height: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>ARR (Speed)</span>
                      <span style={{ color: 'white', fontSize: '10px' }}>{tuning.arr}ms</span>
                    </div>
                    <input type="range" min="0" max="100" step="1" value={tuning.arr} onChange={(e) => setTuning(p => ({...p, arr: Number(e.target.value)}))} style={{ width: '100%', accentColor: 'var(--tt-accent)', height: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>DCD (DAS Cut)</span>
                      <span style={{ color: 'white', fontSize: '10px' }}>{tuning.dcd}ms</span>
                    </div>
                    <input type="range" min="0" max="100" step="1" value={tuning.dcd} onChange={(e) => setTuning(p => ({...p, dcd: Number(e.target.value)}))} style={{ width: '100%', accentColor: 'var(--tt-accent)', height: '4px' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>SDF (Soft Drop)</span>
                      <span style={{ color: 'white', fontSize: '10px' }}>{tuning.sdf >= 41 ? 'MAX' : `${tuning.sdf}x`}</span>
                    </div>
                    <input type="range" min="2" max="41" step="1" value={tuning.sdf} onChange={(e) => setTuning(p => ({...p, sdf: Number(e.target.value)}))} style={{ width: '100%', accentColor: 'var(--tt-accent)', height: '4px' }} />
                  </div>
                </div>
              </>
            )}

            {settingsTab === 'sandbox' && isSandboxRules && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', opacity: zeroGravity ? 0.4 : 1 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gravity</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                    {GRAVITY_TIERS.map((tier, idx) => (
                      <button
                        key={tier.name}
                        onClick={() => {
                          setSandboxTierIdx(idx);
                          levelRef.current = tier.level;
                          if (zeroGravity) { setZeroGravity(false); zeroGravityRef.current = false; }
                          dropInterval.current = calculateDropInterval(tier.level);
                          syncUi();
                        }}
                        style={{
                          padding: '6px 2px', borderRadius: '4px', cursor: 'pointer',
                          fontSize: '10px', fontWeight: idx === sandboxTierIdx && !zeroGravity ? 700 : 400,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          backgroundColor: idx === sandboxTierIdx && !zeroGravity
                            ? 'color-mix(in srgb, var(--tt-accent) 25%, transparent)'
                            : 'rgba(255,255,255,0.07)',
                          color: idx === sandboxTierIdx && !zeroGravity ? 'var(--tt-accent)' : 'rgba(255,255,255,0.7)',
                          border: idx === sandboxTierIdx && !zeroGravity
                            ? '1px solid var(--tt-accent)'
                            : '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={toggleZeroGravity}
                  style={{
                    backgroundColor: zeroGravity ? 'color-mix(in srgb, var(--tt-accent) 25%, transparent)' : 'rgba(255,255,255,0.1)',
                    color: zeroGravity ? 'var(--tt-accent)' : 'white',
                    border: zeroGravity ? '1px solid var(--tt-accent)' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '4px', padding: '8px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}
                >
                  {zeroGravity ? 'Zero-G On — Tap to Disable' : 'Enable Zero-G (No Gravity)'}
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={undoSandbox}
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '8px 4px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    ↩ Undo <span style={{ opacity: 0.45, fontSize: '9px' }}>{controls['Undo']}</span>
                  </button>
                  <button
                    onClick={redoSandbox}
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '8px 4px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    ↪ Redo <span style={{ opacity: 0.45, fontSize: '9px' }}>{controls['Redo']}</span>
                  </button>
                </div>

                {!limitedSandbox && (
                  <button
                    onClick={clearSandboxBoard}
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '8px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    Clear Board
                  </button>
                )}

                {!limitedSandbox && (
                  <div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', display: 'block', marginBottom: '8px' }}>Spawn Piece</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                      {SPAWN_HOTKEY_ACTIONS.map(({ type, action }) => (
                        <div key={type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <button
                            onClick={() => {
                              spawnSandboxPiece(type);
                              showControlsRef.current = false;
                              setShowControls(false);
                              isPausedRef.current = false;
                              setIsPaused(false);
                            }}
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', padding: '6px', cursor: 'pointer', width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <MiniPiece type={type} />
                          </button>
                          <button
                            onClick={() => {
                              setListeningAction(action);
                              listeningActionRef.current = action;
                            }}
                            style={{ backgroundColor: listeningAction === action ? 'var(--tt-accent)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', fontSize: '10px', cursor: 'pointer', width: '100%', textAlign: 'center', height: '22px' }}
                          >
                            {listeningAction === action ? '...' : (controls[action] === ' ' ? 'Space' : controls[action].replace('Arrow', ''))}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.85rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', display: 'block' }}>Hotkeys</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {(limitedSandbox ? SANDBOX_GENERAL_HOTKEY_ACTIONS.filter(a => a !== 'Clear Board') : SANDBOX_GENERAL_HOTKEY_ACTIONS).map((action) => (
                      <div key={action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', textAlign: 'center' }}>
                          {action}
                        </span>
                        <button
                          onClick={() => {
                            setListeningAction(action);
                            listeningActionRef.current = action;
                          }}
                          style={{ backgroundColor: listeningAction === action ? 'var(--tt-accent)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '4px', padding: '6px', fontSize: '10px', cursor: 'pointer', width: '100%', maxWidth: '90px', textAlign: 'center', height: '26px' }}
                        >
                          {listeningAction === action ? '...' : (controls[action] === ' ' ? 'Space' : controls[action].replace('Arrow', ''))}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                showControlsRef.current = false;
                setShowControls(false);
                isPausedRef.current = false;
                setIsPaused(false);
              }}
              style={{ marginTop: '1.5rem', backgroundColor: 'var(--tt-accent)', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 24px', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
      </div>
      </div>

      {/* Right Panel. Height is intrinsic (content-driven), not pinned to the
          main board's 600px — versus's 5-row stats box (Time/Sent/PPS/APM/
          Attack-Min) is taller than that budget once the NEXT box above it
          is accounted for, and a fixed height here just pushed the overflow
          past the board's bottom edge rather than preventing it (flex:1 on
          the stats box below doesn't help either — with negative free space
          it still bottoms out at the same content-driven size). Letting the
          column size itself means the stats box's own background/border
          simply ends right after its last row's padding, which is what
          should visually "cap" it, even though the column can now end up
          taller than the board on modes with more stat rows. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '2rem', width: isMobile ? '4rem' : (isCoop && !sharedNextHold ? 'auto' : '7rem'), flexShrink: 0, paddingTop: isMobile ? 0 : '1rem', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        {/* Own NEXT plus, in co-op with sharing off, Partner's Next sit in a
            row (x-axis) rather than one below the other — stacking them
            vertically pushed this column's height well past the board,
            forcing a scroll to see the stats box below. Row layout only
            kicks in when the partner box is actually shown; otherwise this
            is identical to a plain column with one child. */}
        <div style={{ display: 'flex', flexDirection: isCoop && !sharedNextHold ? 'row' : 'column', gap: isMobile ? '0.5rem' : '1rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.75rem' }}>
            <p style={{ fontSize: isMobile ? '0.55rem' : '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>NEXT</p>
            <div style={{ width: isMobile ? '4rem' : '7rem', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0.4rem 0' : '1rem 0', gap: isMobile ? '0.4rem' : '1.5rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)', margin: '0 auto' }}>
               {fogActive
                 ? <span style={{ fontSize: '1.4rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.12em', padding: '0.5rem 0' }}>???</span>
                 : uiState.next.slice(0, isMobile ? 3 : 5).map((type, idx) => <MiniPiece key={idx} type={type} />)
               }
            </div>
          </div>

          {/* Partner's Next — co-op, sharing off only. Read straight off
              opponentBoards (not adopted into any local ref, unlike Hold) —
              each player's own queue stays their own; this is purely a
              read-only peek at what the partner has coming, not something
              this client's own gameplay ever consumes. Hidden once sharing
              is on — same reasoning as Partner's Hold above. */}
          {isCoop && !sharedNextHold && opponentBoards?.[0] && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.75rem' }}>
              <p style={{ fontSize: isMobile ? '0.55rem' : '0.75rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>PARTNER&apos;S NEXT</p>
              {/* Same 5-piece depth as the player's own NEXT box (mirrors
                  its layout exactly), not just the one immediately-
                  following piece — per direct request. */}
              <div style={{ width: isMobile ? '4rem' : '7rem', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0.4rem 0' : '1rem 0', gap: isMobile ? '0.4rem' : '1.5rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)', margin: '0 auto' }}>
                {opponentBoards[0].next.slice(0, isMobile ? 3 : 5).map((type, idx) => <MiniPiece key={idx} type={type} />)}
              </div>
            </div>
          )}
        </div>

        {/* Solid backdrop (matching the Hold/Next boxes) so these numbers stay
            readable no matter how bright or busy the selected background is —
            plain text sitting directly on the theme image used to wash out. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.5rem' : '1rem', backgroundColor: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '0.375rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)', padding: isMobile ? '0.4rem 0.35rem' : '1rem 0.85rem', textAlign: 'right' }}>

          {/* --- UI RENDER BRANCHING --- */}
          {mode === 'sprint' ? (
            <>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Time</p>
                <p ref={timeDisplayRef} style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'var(--tt-accent)', fontWeight: 'bold', textShadow: '0 0 8px color-mix(in srgb, var(--tt-accent) 50%, transparent)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  00:00.000
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Lines Left</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>
                  {Math.max(0, SPRINT_GOAL - uiState.lines)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>PPS</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{pps.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>APM</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{apm.toFixed(0)}</p>
              </div>
            </>
          ) : (mode === 'versus' || isTeams || isTeamsCoop || isArena) ? (
            <>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Time</p>
                <p ref={timeDisplayRef} style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'var(--tt-accent)', fontWeight: 'bold', textShadow: '0 0 8px color-mix(in srgb, var(--tt-accent) 50%, transparent)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  00:00.000
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Sent</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{linesSent}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>PPS</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{pps.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>APM</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{apm.toFixed(0)}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Attack/Min</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{attackPerMin.toFixed(1)}</p>
              </div>
            </>
          ) : mode === 'coop' ? (
            // Team-shared stats — level/lines are adopted from
            // whichever client's broadcast arrives most recently (see the
            // isCoop adopt effect), so both players' HUDs read the same.
            <>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Time</p>
                <p ref={timeDisplayRef} style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  00:00.000
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Level</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{uiState.level}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Lines</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{uiState.lines}</p>
              </div>
            </>
          ) : mode === 'blitz' ? (
            <>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Combo</p>
                <p style={{ fontSize: isMobile ? '0.9rem' : '1.25rem', color: 'var(--tt-accent)', fontWeight: 'bold', textShadow: '0 0 8px color-mix(in srgb, var(--tt-accent) 50%, transparent)', margin: 0 }}>{Math.max(0, uiState.combo)}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Time Left</p>
                <p ref={timeDisplayRef} style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  03:00.000
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Lines</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{uiState.lines}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>PPS</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{pps.toFixed(2)}</p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>APM</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>{apm.toFixed(0)}</p>
              </div>
            </>
          ) : (
            // Sandbox mode: timer + gravity tier name only.
            <>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Time</p>
                <p ref={timeDisplayRef} style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  00:00.000
                </p>
              </div>
              <div>
                <p style={{ fontSize: isMobile ? '7px' : '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem', margin: 0 }}>Gravity</p>
                <p style={{ fontSize: isMobile ? '0.8rem' : '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 'bold', margin: 0 }}>
                  {zeroGravity ? 'Zero-G' : GRAVITY_TIERS[sandboxTierIdx].name}
                </p>
              </div>
            </>
          )}

          {/* Transient combo/T-spin/top-out text — no reserved space when
              idle (previously a fixed 4rem placeholder sat here at all
              times, pushing the box well past its actual stat rows); it
              just briefly grows the box while a message is showing, same as
              any other row would. */}
          <style>{`@keyframes b2bRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div>
            {uiState.actionText && (
               <p style={{ color: 'var(--tt-accent)', fontSize: isMobile ? '8px' : '11px', fontWeight: 'bold', textShadow: '0 0 8px color-mix(in srgb, var(--tt-accent) 80%, transparent)', margin: 0, lineHeight: 1.4, textTransform: 'uppercase' }}>
                 {uiState.actionText.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
               </p>
            )}
            {uiState.b2bStreak >= 2 && (
              <p
                key={uiState.b2bAnimKey}
                style={{
                  color: 'var(--tt-accent)', fontSize: isMobile ? '8px' : '11px', fontWeight: 'bold',
                  textShadow: '0 0 8px color-mix(in srgb, var(--tt-accent) 80%, transparent)',
                  margin: 0, lineHeight: 1.4, textTransform: 'uppercase',
                  animation: 'b2bRise 0.45s ease-out forwards',
                }}
              >
                B2B{uiState.b2bStreak > 2 ? ` ×${uiState.b2bStreak}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Opponent board, 1v1 only — sits further right than the Right Panel
          (stats stay closest to the player's own board; the opponent's board
          is the thing being compared, so it reads left-to-right as "mine,
          my stats, theirs"), at 90% of the main board's size (see
          isDesktopOneVOne above). A fuller room falls back to the compact
          side-column preview below instead. */}
      {isDesktopOneVOne && previewBoards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', flexShrink: 0, paddingTop: '1rem' }}>
          {/* A true 1v1 just needs to say who, not "opponent" plus who —
              there's only one, so the nickname alone is the label. */}
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: 0, padding: '3px 10px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>
            {previewBoards[0].nickname}
          </p>
          {/* Same gating as the player's own Lives tag above the main board
              — only shown once the match actually has lives turned on.
              mode === 'versus' matters here, not just the lives value: a
              room that had Lives > 1 set before switching to Practice would
              otherwise still show a stale lives tag, even though Practice
              has no lives/elimination concept at all. */}
          {(mode === 'versus' || isTeams || isTeamsCoop || isArena) && (lives ?? 1) > 1 && (
            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', textAlign: 'center', fontWeight: 'bold', margin: 0, padding: '2px 8px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '4px' }}>
              {previewBoards[0].livesRemaining} / {lives} LIVES
            </p>
          )}
          <MiniBoard board={previewBoards[0].board} cellSize={oneVOneCellSize} gap={ONE_V_ONE_GAP} padding={ONE_V_ONE_PADDING} pieceMatrix={previewBoards[0].pieceMatrix} pieceX={previewBoards[0].pieceX} pieceY={previewBoards[0].pieceY} eliminated={previewBoards[0].eliminated} eliminatedLabel={mode === 'practice' ? 'Left' : 'Eliminated'} pendingGarbage={previewBoards[0].pendingGarbage} />
        </div>
      )}

      {/* Opponent Previews — versus-only compact column, one MiniBoard per
          opponent (see onBoardUpdate in lockPiece and previewBoards above).
          Used for a fuller room (isDesktopOneVOne's big adjacent board above
          handles the true-1v1 desktop case instead) and for mobile, where
          there's no reliable fixed main-board pixel width to size an
          adjacent board off of. Wraps so it scales from a couple of
          opponents up to a full room without a per-count layout. A single
          opponent (mobile 1v1) still gets a size bump over a fuller room,
          just not the full side-by-side treatment. */}
      {(isMultiplayerRoom || isTeamsCoop || isArena) && !isDesktopOneVOne && previewBoards.length > 0 && (() => {
        // Teams-coop only — one deduped entry per *enemy* team (every
        // teammate on a team shares identical board content, so showing one
        // MiniBoard per enemy player, like plain Teams does, would just be
        // visibly duplicate boards) — any one representative member's
        // broadcast stands in for the whole team. Own team is never shown
        // here at all, same reasoning Co-op already established: it's
        // rendered directly on this client's own canvas above, not as a
        // side preview. Computed before isOneVOne/cellSize below so sizing
        // reflects the actual number of *rendered* groups, not the raw
        // player count (which would include teammates never shown here).
        const enemyTeamBoards = isTeamsCoop
          ? Array.from(
              previewBoards.reduce((acc, entry) => {
                const t = entry.team ?? 1;
                if (t !== selfTeam && !acc.has(t)) acc.set(t, entry);
                return acc;
              }, new Map<number, typeof previewBoards[number]>())
            ).sort(([a], [b]) => a - b)
          : null;
        const renderCount = enemyTeamBoards ? enemyTeamBoards.length : previewBoards.length;
        const isOneVOne = renderCount === 1;
        // Multi-player bumped another 5% (5.5 -> 5.775) on top of the
        // earlier +10% bump over its original 5px base, per feedback that a
        // fuller room's previews still read too small.
        const cellSize = isOneVOne ? 7.5 : 5.775;
        // One MiniBoard "row" per entry, shared between the flat list
        // (versus/practice), the team-grouped layout (teams), and the
        // enemy-team-deduped layout (teams-coop) below so the actual board/
        // lives-tag markup isn't duplicated three times. `labelOverride`
        // exists only for teams-coop — a deduped enemy-team entry should
        // read "TEAM N", not the one representative member's own nickname.
        const renderEntry = (entry: typeof previewBoards[number], labelOverride?: string) => (
          <div key={entry.guestId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
            {(!isOneVOne || labelOverride) && (
              <span style={{ fontSize: isMobile ? '0.5rem' : '0.55rem', color: 'rgba(255,255,255,0.75)', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {labelOverride ?? entry.nickname}
              </span>
            )}
            {/* Each opponent needs their own count here (unlike the shared
                heading above), since lives remaining can differ from one to
                the next. Guard is for the same stale-setting reason as the
                1v1 board's lives tag above. */}
            {(mode === 'versus' || isTeams || isTeamsCoop || isArena) && (lives ?? 1) > 1 && (
              <span style={{ fontSize: isMobile ? '0.5rem' : '0.55rem', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>
                {entry.livesRemaining} / {lives}
              </span>
            )}
            <MiniBoard board={entry.board} cellSize={cellSize} pieceMatrix={entry.pieceMatrix} pieceX={entry.pieceX} pieceY={entry.pieceY} eliminated={entry.eliminated} eliminatedLabel={mode === 'practice' ? 'Left' : 'Eliminated'} pendingGarbage={entry.pendingGarbage} />
          </div>
        );
        // Teams: group previewBoards by team (own team first, labeled "Your
        // Team"; each other team gets its own "Team N" group) instead of one
        // flat list — per direct request, so it's immediately clear at a
        // glance who's a teammate vs. an enemy rather than only readable via
        // each board's own nickname label.
        const teamGroups = isTeams
          ? Array.from(
              previewBoards.reduce((acc, entry) => {
                const t = entry.team ?? 1;
                if (!acc.has(t)) acc.set(t, []);
                acc.get(t)!.push(entry);
                return acc;
              }, new Map<number, typeof previewBoards>())
            ).sort(([a], [b]) => (a === selfTeam ? -1 : b === selfTeam ? 1 : a - b))
          : null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: (isTeams || isTeamsCoop) ? '0.75rem' : '0.4rem', width: isOneVOne ? '9rem' : '6rem', flexShrink: 0, paddingTop: isMobile ? 0 : '1rem' }}>
            {enemyTeamBoards ? (
              // Teams-coop: one deduped board per enemy team, no "YOUR TEAM"
              // section at all — own team is already this client's own main
              // board (see the canvas overlay above), not a side preview.
              enemyTeamBoards.map(([teamNumber, entry]) => (
                <div key={teamNumber} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                  {renderEntry(entry, `TEAM ${teamNumber}`)}
                </div>
              ))
            ) : teamGroups ? (
              teamGroups.map(([teamNumber, entries]) => (
                <div key={teamNumber} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <p style={{ fontSize: isMobile ? '0.55rem' : '0.7rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: teamNumber === selfTeam ? 'color-mix(in srgb, var(--tt-accent) 30%, rgba(0,0,0,0.75))' : 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>
                    {teamNumber === selfTeam ? 'YOUR TEAM' : `TEAM ${teamNumber}`}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                    {entries.map((entry) => renderEntry(entry))}
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* A true 1v1 (mobile, or a fuller room down to one survivor)
                    just needs the nickname — nothing to tell apart from. A
                    fuller room keeps the generic OPPONENTS heading up top and
                    labels each board individually below instead, since that's
                    the only place lives/nickname can actually differ board to
                    board. */}
                <p style={{ fontSize: isMobile ? '0.55rem' : '0.7rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', width: 'fit-content', padding: isMobile ? '1px 5px' : '2px 8px', backgroundColor: 'rgba(0,0,0,0.75)', borderRadius: '4px' }}>
                  {isOneVOne ? previewBoards[0].nickname : (mode === 'practice' ? 'PLAYERS' : 'OPPONENTS')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', maxHeight: isMobile ? 'none' : '600px', overflowY: 'auto' }}>
                  {previewBoards.map((entry) => renderEntry(entry))}
                </div>
              </>
            )}
          </div>
        );
      })()}

    </div>{/* end inner row (Left Panel / Center Panel / Right Panel / Opponent Previews) */}

      {/* Touch controls — mobile only. There's no keyboard on a phone, so
          this is the only way to move/rotate/drop/hold there. */}
      {isMobile && (gameState === 'PLAYING' || gameState === 'COUNTDOWN') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <TouchControlButton label="HOLD" ariaLabel="Hold piece" onClick={touchHold} />
            <TouchControlButton label="⟲" ariaLabel="Rotate counter-clockwise" onClick={() => touchRotate(-1)} />
            <TouchControlButton label="⟳" ariaLabel="Rotate clockwise" onClick={() => touchRotate(1)} />
            <TouchControlButton label="DROP" ariaLabel="Hard drop" onClick={touchHardDrop} />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <TouchControlButton
              label="◀"
              ariaLabel="Move left"
              onPointerDown={() => touchMoveStart(-1)}
              onPointerUp={() => touchMoveEnd(-1)}
              onPointerLeave={() => touchMoveEnd(-1)}
              onPointerCancel={() => touchMoveEnd(-1)}
            />
            <TouchControlButton
              label="▼"
              ariaLabel="Soft drop"
              onPointerDown={touchSoftDropStart}
              onPointerUp={touchSoftDropEnd}
              onPointerLeave={touchSoftDropEnd}
              onPointerCancel={touchSoftDropEnd}
            />
            <TouchControlButton
              label="▶"
              ariaLabel="Move right"
              onPointerDown={() => touchMoveStart(1)}
              onPointerUp={() => touchMoveEnd(1)}
              onPointerLeave={() => touchMoveEnd(1)}
              onPointerCancel={() => touchMoveEnd(1)}
            />
          </div>
        </div>
      )}

    </div>
  );
}