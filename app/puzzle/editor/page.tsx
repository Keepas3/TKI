'use client';

import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import PuzzleEditor from '@/components/PuzzleEditor';

export default function PuzzleEditorPage() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }}>
      <PuzzleEditor />
    </div>
  );
}
