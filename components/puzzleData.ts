// Perfect Clear puzzle definitions.
// Each puzzle is a pre-filled board + fixed piece queue. The player achieves
// a Perfect Clear when the board is completely empty after clearing all lines.
// All boards are 20 rows × 10 cols; only rows with non-zero cells are listed
// in comments — everything above is empty (all zeros).
//
// Daily puzzle resolution order:
//   1. daily_schedule table in Supabase (admin-curated, per calendar date)
//   2. Approved puzzle_submissions row (for community-submitted dailies)
//   3. Hardcoded date-index rotation over PUZZLES (fallback when nothing scheduled)

import { supabase } from '../app/utils/supabaseClient';

export type PuzzleCategory = 'opening' | 'middlegame' | 'finisher' | 'survival';
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  name: string;
  category: PuzzleCategory;
  difficulty: PuzzleDifficulty;
  description: string;
  board: number[][];   // 20 rows × 10 cols
  queue: number[];     // piece type sequence (1=I, 2=O, 3=T, 4=S, 5=Z, 6=J, 7=L)
}

export const PIECE_COLORS: Record<number, string> = {
  1: '#38bdf8', 2: '#fbbf24', 3: '#a78bfa',
  4: '#4ade80', 5: '#f87171', 6: '#0ea5e9', 7: '#fb923c',
};
export const PIECE_NAMES: Record<number, string> = {
  1:'I', 2:'O', 3:'T', 4:'S', 5:'Z', 6:'J', 7:'L',
};

// ---------------------------------------------------------------------------
// Board helpers
// ---------------------------------------------------------------------------

const _ = 0;
const X = 6;   // filled cell (blue, neutral "given" color)

function makeBoard(...rows: number[][]): number[][] {
  const board: number[][] = Array.from({ length: 20 }, () => Array(10).fill(0));
  // rows are passed as the bottom rows; first arg = topmost of the supplied rows
  const offset = 20 - rows.length;
  rows.forEach((row, i) => { board[offset + i] = row; });
  return board;
}

// ---------------------------------------------------------------------------
// Puzzle definitions
// ---------------------------------------------------------------------------

// Piece spawn positions (x = column of leftmost cell of the piece matrix):
//   I  (4×4): spawns at x=3, fills row+1 cols 3-6
//   O  (2×2): spawns at x=4, fills rows y,y+1 cols 4-5
//   T  (3×3): spawns at x=4; row0 fills col 5, row1 fills cols 4-6
//   S  (3×3): spawns at x=4; row0 fills cols 5-6, row1 fills cols 4-5
//   Z  (3×3): spawns at x=4; row0 fills cols 4-5, row1 fills cols 5-6
//   J  (3×3): spawns at x=4; row0 fills col 4, row1 fills cols 4-6
//   L  (3×3): spawns at x=4; row0 fills col 6, row1 fills cols 4-6
//
// I vertical (after 1× CW rotation, matrix col 2 is active):
//   Place at x=7 → fills col 9 for 4 rows

export const PUZZLES: Puzzle[] = [
  // ── EASY ──────────────────────────────────────────────────────────────────
      {
    id: 'again',
    name: 'Again',
    category: 'opening',
    difficulty: 'easy',
    description: 'do it',
    board: makeBoard(),  // empty board,
    queue: [2, 5, 7, 6, 1, 3, 4, 7, 1, 3],   // O, Z, L, J, I, T, S, L, I, T
  },
    {
    id: 'done-deal',
    name: 'Done Deal',
    category: 'opening',
    difficulty: 'easy',
    description: '6 4',
    board: makeBoard(),  // empty board,
    queue: [7, 2, 1, 3, 4, 5, 6, 3, 2, 1],   // L, O, I, T, S, Z, J, T, O, I
  },
     {
    id: 'fill-in-the-hole-and-pc',
    name: 'Fill in the hole and PC',
    category: 'opening',
    difficulty: 'easy',
    description: 'The Finisher involves a I Piece',
    board: makeBoard(
    [X,_,_,_,X,_,_,_,_,_],
    [X,_,_,X,X,_,_,_,_,_],
    [X,X,_,_,X,X,X,X,X,_],
  ),
    queue: [5, 6, 2, 5, 7, 1, 3],   // Z, J, O, Z, L, I, T
  },
  {
    id: 'easy-one',
    name: 'Easy One',
    category: 'opening',
    difficulty: 'easy',
    description: 'Easy',
    board: makeBoard(),  // empty board,
    queue: [1, 2, 5, 6, 7, 3, 4, 6, 1, 3],   // I, O, Z, J, L, T, S, J, I, T
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────
   {
    id: 'fontaine',
    name: 'Fontaine',
    category: 'opening',
    difficulty: 'medium',
    description: 'Founded Fonta Fontaine',
    board: makeBoard(  // 1=I 2=O 3=T 4=S 5=Z 6=J 7=L
    [_,_,_,5,5,_,_,_,_,_],
    [1,3,5,5,5,5,_,2,2,6],
    [1,3,4,4,_,2,2,7,7,7],
  ),
    queue: [4, 7, 6, 3, 5, 4, 3, 2, 6, 1],   // S, L, J, T, Z, S, T, O, J, I
  },
    {
    id: 'perfect-clear-in-midgame',
    name: 'Perfect Clear in Midgame',
    category: 'opening',
    difficulty: 'medium',
    description: 'Start by clearing the two rows then 1.',
    board: makeBoard(  // 1=I 2=O 3=T 4=S 5=Z 6=J 7=L
    [_,_,_,_,_,7,7,7,2,2],
    [_,_,_,_,_,7,4,4,2,2],
    [_,_,5,2,2,4,4,4,7,7],
    [_,5,5,2,2,5,5,4,4,7],
    [_,5,1,1,1,1,5,5,4,7],
  ),
    queue: [6, 6, 2, 5, 3, 7, 4, 1, 1, 3, 4],   // J, J, O, Z, T, L, S, I, I, T, S
  },
  {
    id: 'medium-is-premium',
    name: 'Medium is Premium',
    category: 'opening',
    difficulty: 'medium',
    description: 'Try to set up a T-spin double in center',
    board: makeBoard(  // 1=I 2=O 3=T 4=S 5=Z 6=J 7=L
    [_,5,_,_,_,_,_,_,_,_],
    [5,5,4,4,_,_,_,_,_,_],
    [5,4,4,_,_,_,_,_,_,_],
  ),
    queue: [3, 7, 6, 1, 2, 4, 3, 5],   // T, L, J, I, O, S, T, Z
  },
  

  // ── HARD ──────────────────────────────────────────────────────────────────
    {
    id: 'tricky',
    name: 'Tricky',
    category: 'opening',
    difficulty: 'hard',
    description: 'TSD and you will be on the right track',
    board: makeBoard(  // 1=I 2=O 3=T 4=S 5=Z 6=J 7=L
    [_,2,2,_,4,4,_,_,_,_],
    [_,2,2,4,4,_,_,_,_,_],
  ),
    queue: [1, 7, 2, 5, 6, 3, 2, 4, 7, 3, 5, 1, 6],   // I, L, O, Z, J, T, O, S, L, T, Z, I, J
  },
   {
    id: 'very-difficult-',
    name: 'Very Difficult ',
    category: 'opening',
    difficulty: 'hard',
    description: 'Good luck',
    board: makeBoard(  // 1=I 2=O 3=T 4=S 5=Z 6=J 7=L
    [2,2,_,_,3,3,3,_,_,_],
    [2,2,_,_,_,3,_,_,_,_],
  ),
    queue: [5, 7, 1, 4, 6, 3, 5, 4, 6, 2, 1, 7, 3],   // Z, L, I, S, J, T, Z, S, J, O, I, L, T
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

// Server-safe: date-based rotation only. Safe to call during SSR and in useState().
export function getDailyPuzzleByDate(): Puzzle {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return PUZZLES[dayIndex % PUZZLES.length];
}

export function getDailyPuzzle(): Puzzle {
  // Manual override: puzzle editor can pin a specific puzzle as today's daily
  // by writing its ID to localStorage. Falls back to date-based rotation.
  if (typeof window !== 'undefined') {
    const pinned = localStorage.getItem('puzzle-daily-id');
    if (pinned) {
      const found = PUZZLES.find((p) => p.id === pinned);
      if (found) return found;
    }
  }
  return getDailyPuzzleByDate();
}

export function setDailyPuzzle(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id === null) localStorage.removeItem('puzzle-daily-id');
  else localStorage.setItem('puzzle-daily-id', id);
}

function submissionToPuzzle(sub: Record<string, unknown>): Puzzle {
  return {
    id: sub.id as string,
    name: sub.name as string,
    category: sub.category as PuzzleCategory,
    difficulty: sub.difficulty as PuzzleDifficulty,
    description: (sub.description as string) ?? '',
    board: sub.board as number[][],
    queue: sub.queue as number[],
  };
}

// Async lookup: checks built-in PUZZLES first, then puzzle_submissions.
export async function fetchPuzzleById(id: string): Promise<Puzzle | undefined> {
  const builtin = PUZZLES.find((p) => p.id === id);
  if (builtin) return builtin;
  try {
    const { data } = await supabase.from('puzzle_submissions').select('id, name, difficulty, category, description, board, queue').eq('id', id).single();
    if (data) return submissionToPuzzle(data);
  } catch { /* not found */ }
  return undefined;
}

// Async daily puzzle: checks daily_schedule → puzzle_submissions → sync fallback.
export async function fetchDailyPuzzle(): Promise<Puzzle> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await supabase
      .from('daily_schedule')
      .select('puzzle_id')
      .eq('date', today)
      .single();
    if (row?.puzzle_id) {
      const found = await fetchPuzzleById(row.puzzle_id);
      if (found) return found;
    }
  } catch { /* fall through */ }
  return getDailyPuzzle();
}

export function getPuzzlesByDifficulty(d: PuzzleDifficulty): Puzzle[] {
  return PUZZLES.filter((p) => p.difficulty === d);
}

// ---------------------------------------------------------------------------
// Community puzzles (puzzle_submissions with status approved/featured)
// ---------------------------------------------------------------------------

export interface CommunityPuzzle extends Puzzle {
  submissionId: string;
  authorUsername: string | null;
  voteCount: number;
  createdAt: string;
  featured: boolean;
}

export async function fetchCommunityPuzzles(): Promise<CommunityPuzzle[]> {
  try {
    const [puzzlesRes, votesRes] = await Promise.all([
      supabase
        .from('puzzle_submissions')
        .select('id, name, difficulty, category, description, board, queue, status, author_username, created_at')
        .in('status', ['approved', 'featured'])
        .order('created_at', { ascending: false }),
      supabase.from('puzzle_votes').select('puzzle_id'),
    ]);
    const rows = puzzlesRes.data ?? [];
    const votes = votesRes.data ?? [];
    const voteMap = new Map<string, number>();
    for (const v of votes) voteMap.set(v.puzzle_id, (voteMap.get(v.puzzle_id) ?? 0) + 1);
    return rows.map(r => ({
      id: r.id,
      submissionId: r.id,
      name: r.name,
      category: r.category as PuzzleCategory,
      difficulty: r.difficulty as PuzzleDifficulty,
      description: r.description ?? '',
      board: r.board as number[][],
      queue: r.queue as number[],
      authorUsername: r.author_username ?? null,
      voteCount: voteMap.get(r.id) ?? 0,
      createdAt: r.created_at,
      featured: r.status === 'featured',
    }));
  } catch {
    return [];
  }
}

export async function fetchMyVotes(fingerprint: string): Promise<Set<string>> {
  if (!fingerprint) return new Set();
  const { data } = await supabase
    .from('puzzle_votes')
    .select('puzzle_id')
    .eq('voter_fingerprint', fingerprint);
  return new Set((data ?? []).map(v => v.puzzle_id));
}

export async function voteForPuzzle(puzzleId: string, fingerprint: string): Promise<boolean> {
  const { error } = await supabase
    .from('puzzle_votes')
    .insert({ puzzle_id: puzzleId, voter_fingerprint: fingerprint });
  return !error;
}

export async function unvoteForPuzzle(puzzleId: string, fingerprint: string): Promise<boolean> {
  const { error } = await supabase
    .from('puzzle_votes')
    .delete()
    .eq('puzzle_id', puzzleId)
    .eq('voter_fingerprint', fingerprint);
  return !error;
}

export const DIFFICULTY_COLORS: Record<PuzzleDifficulty, string> = {
  easy:   '#4ade80',
  medium: '#fbbf24',
  hard:   '#f87171',
};

export const CATEGORY_LABELS: Record<PuzzleCategory, string> = {
  opening:    'Opening',
  middlegame: 'Middlegame',
  finisher:   'Finisher',
  survival:   'Survival',
};
