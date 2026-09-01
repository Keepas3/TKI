'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { NAV_BAR_WIDTH } from '@/components/NavBar';
import PuzzlePage from '@/components/PuzzlePage';
import { getPuzzleById } from '@/components/puzzleData';

export default function PuzzleGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const puzzle = getPuzzleById(id);
  if (!puzzle) notFound();

  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0 }}>
      <PuzzlePage puzzle={puzzle} />
    </div>
  );
}
