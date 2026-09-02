'use client';

import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import HomeStudySection from '@/components/HomeStudySection';
import DailyPuzzleHero from '@/components/DailyPuzzleHero';

export default function Home() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
        <HomeStudySection />
        <DailyPuzzleHero />
      </div>
    </div>
  );
}
