export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export const COLORS = [
  'transparent',
  '#38bdf8', // 1: I - Cyan
  '#fbbf24', // 2: O - Yellow
  '#a78bfa', // 3: T - Purple
  '#4ade80', // 4: S - Green
  '#f87171', // 5: Z - Red
  '#0ea5e9', // 6: J - Blue
  '#fb923c', // 7: L - Orange
  '#6b7280', // 8: Garbage
  '#7f1d1d', // 9: Unclearable (sudden-death rising floor)
];

export const PIECES = [
  [], 
  [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], 
  [[2, 2], [2, 2]],                                         
  [[0, 3, 0], [3, 3, 3], [0, 0, 0]],                        
  [[0, 4, 4], [4, 4, 0], [0, 0, 0]],                        
  [[5, 5, 0], [0, 5, 5], [0, 0, 0]],                        
  [[6, 0, 0], [6, 6, 6], [0, 0, 0]],                        
  [[0, 0, 7], [7, 7, 7], [0, 0, 0]],                        
];