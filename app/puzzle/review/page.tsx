'use client';

import PuzzleReviewPage from '../../../components/PuzzleReviewPage';
import { useAuth } from '../../../components/useAuth';
import { NAV_BAR_HEIGHT } from '../../../components/NavBar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ReviewPage() {
  const { user, isAdmin, adminChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!adminChecked) return;
    if (user === null) { router.replace('/login'); return; }
    if (!isAdmin) { router.replace('/puzzle'); }
  }, [user, isAdmin, adminChecked, router]);

  if (!adminChecked || user === undefined || (user && !isAdmin)) {
    return (
      <div style={{ paddingTop: NAV_BAR_HEIGHT, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: 'var(--tt-text-faint)' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, height: '100vh' }}>
      <PuzzleReviewPage />
    </div>
  );
}
