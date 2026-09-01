import { NAV_BAR_WIDTH } from '@/components/NavBar';
import PuzzleHub from '@/components/PuzzleHub';

export const metadata = { title: 'Puzzles — TKI' };

export default function PuzzlePage() {
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0, overflowY: 'auto' }}>
      <PuzzleHub />
    </div>
  );
}
