import { notFound } from 'next/navigation';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import PuzzleReviewPage from '@/components/PuzzleReviewPage';

export default function ReviewTokenPage({ params }: { params: { token: string } }) {
  const expected = process.env.PUZZLE_REVIEW_TOKEN;
  if (!expected || params.token !== expected) notFound();
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }}>
      <PuzzleReviewPage />
    </div>
  );
}
