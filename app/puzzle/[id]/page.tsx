'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import PuzzlePage from '@/components/PuzzlePage';
import { fetchPuzzleById, type Puzzle } from '@/components/puzzleData';

export default function PuzzleGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [puzzle, setPuzzle] = useState<Puzzle | null | undefined>(undefined);

  useEffect(() => {
    fetchPuzzleById(id).then((p) => setPuzzle(p ?? null));
  }, [id]);

  if (puzzle === undefined) return null; // loading

  if (puzzle === null) {
    return (
      <div style={{
        position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'monospace', color: 'var(--tt-text-muted)', gap: '1rem',
      }}>
        <span style={{ fontSize: '2rem' }}>404</span>
        <span style={{ fontSize: '0.85rem' }}>Puzzle not found.</span>
        <Link href="/puzzle" style={{ color: 'var(--tt-accent)', fontSize: '0.8rem', textDecoration: 'none' }}>
          ← Back to puzzles
        </Link>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }}>
      <PuzzlePage puzzle={puzzle} />
    </div>
  );
}
