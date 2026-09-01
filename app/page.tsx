'use client';

import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import DailyPuzzleHero from '@/components/DailyPuzzleHero';
import HomeStudySection from '@/components/HomeStudySection';

export default function Home() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
      <DailyPuzzleHero />
      <HomeStudySection />
    </div>
  );
}
