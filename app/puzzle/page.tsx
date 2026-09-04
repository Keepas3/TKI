import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import PuzzleHub from '@/components/PuzzleHub';
import Footer from '@/components/Footer';

export const metadata = { title: 'Puzzles — TKI' };

export default function PuzzlePage() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <PuzzleHub />
      <Footer />
    </div>
  );
}
