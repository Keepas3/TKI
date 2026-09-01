// Perfect Clear puzzle definitions.
// Each puzzle is a pre-filled board + fixed piece queue. The player achieves
// a Perfect Clear when the board is completely empty after clearing all lines.
// All boards are 20 rows × 10 cols; only rows with non-zero cells are listed
// in comments — everything above is empty (all zeros).

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
    id: 'new-puzzle',
    name: 'New Puzzle',
    category: 'finisher',
    difficulty: 'easy',
    description: 'Description here.',
    board: makeBoard(),  // empty board,
    queue: [4, 7, 2, 6, 1, 3, 5, 2, 7, 1],   // S, L, O, J, I, T, Z, O, L, I
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  {
    id: 'm1-two-step',
    name: 'Two-Step',
    category: 'opening',
    difficulty: 'medium',
    description: 'J and L interlock to fill two rows. Send J to the far left.',
    board: makeBoard(
      [_,X,X,X,X,_,X,X,X,X],   // row 18: col 0 empty (J top), col 5 empty (L top)
      [_,_,_,_,_,_,X,X,X,X],   // row 19: cols 0-5 empty (J+L bottoms)
    ),
    queue: [6, 7],   // J then L
  },
  {
    id: 'm2-zigzag',
    name: 'Zigzag',
    category: 'opening',
    difficulty: 'medium',
    description: 'S and Z interlock in a classic zigzag. S goes left, Z shifts one right.',
    board: makeBoard(
      [X,_,_,_,_,X,X,X,X,X],   // row 17: col 0 filled; cols 1-4 empty (S+Z tops)
      [_,_,X,X,_,_,X,X,X,X],   // row 18: cols 0-1 empty (S), cols 4-5 empty (Z)
    ),
    queue: [4, 5],   // S then Z
  },
  {
    id: 'm3-tower',
    name: 'Tower',
    category: 'middlegame',
    difficulty: 'medium',
    description: 'T plugs the notch; rotate I vertically and send it to the right wall.',
    board: makeBoard(
      [X,X,X,X,X,X,X,X,X,_],   // row 16: col 9 empty
      [X,X,X,X,_,X,X,X,X,_],   // row 17: col 4 empty (T top), col 9 empty
      [X,X,X,_,_,_,X,X,X,_],   // row 18: cols 3-5 empty (T bottom), col 9 empty
      [X,X,X,X,X,X,X,X,X,_],   // row 19: col 9 empty
    ),
    queue: [3, 1],   // T then I (I goes vertical, x=7 fills col 9)
  },
  {
    id: 'm4-s-and-l',
    name: 'S and L',
    category: 'opening',
    difficulty: 'medium',
    description: 'S fills the left gap, L drops right in place. Two pieces, two rows.',
    board: makeBoard(
      [X,_,_,X,X,X,_,X,X,X],   // row 18: cols 1-2 empty (S top), col 6 empty (L top)
      [_,_,X,X,_,_,_,X,X,X],   // row 19: cols 0-1 empty (S bottom), cols 4-6 empty (L bottom)
    ),
    queue: [4, 7],   // S then L
  },

  // ── HARD ──────────────────────────────────────────────────────────────────
  {
    id: 'h1-triple-threat',
    name: 'Triple Threat',
    category: 'middlegame',
    difficulty: 'hard',
    description: 'S and Z weave through the middle while I seals the right column.',
    board: makeBoard(
      [X,X,X,X,X,X,X,X,X,_],   // row 16: col 9 empty
      [X,_,_,_,_,X,X,X,X,_],   // row 17: cols 1-4 empty (S+Z tops), col 9 empty
      [_,_,X,X,_,_,X,X,X,_],   // row 18: cols 0-1 empty (S bot), cols 4-5 empty (Z bot), col 9 empty
      [X,X,X,X,X,X,X,X,X,_],   // row 19: col 9 empty
    ),
    queue: [4, 5, 1],   // S, Z, then I (I vertical at x=7 fills col 9)
  },
  {
    id: 'h2-trio-drop',
    name: 'Trio Drop',
    category: 'finisher',
    difficulty: 'hard',
    description: 'Three pieces, three rows. J left, L center, O upper-right.',
    board: makeBoard(
      [X,X,X,X,X,X,_,_,X,X],   // row 16: cols 6-7 empty (O top)
      [_,X,X,X,X,_,_,_,X,X],   // row 17: col 0 empty (J), col 5 empty (L), cols 6-7 empty (O bot)
      [_,_,_,_,_,_,X,X,X,X],   // row 18: cols 0-5 empty (J+L bottoms)
    ),
    queue: [6, 7, 2],   // J, L, O
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getPuzzleById(id: string): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
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
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return PUZZLES[dayIndex % PUZZLES.length];
}

export function setDailyPuzzle(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id === null) localStorage.removeItem('puzzle-daily-id');
  else localStorage.setItem('puzzle-daily-id', id);
}

export function getPuzzlesByDifficulty(d: PuzzleDifficulty): Puzzle[] {
  return PUZZLES.filter((p) => p.difficulty === d);
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
