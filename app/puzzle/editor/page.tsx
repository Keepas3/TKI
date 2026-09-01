'use client';

import { NAV_BAR_WIDTH } from '@/components/NavBar';
import PuzzleEditor from '@/components/PuzzleEditor';

export default function PuzzleEditorPage() {
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0 }}>
      <PuzzleEditor />
    </div>
  );
}
