'use client';

import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import { HomeTopicGrid } from '@/components/HomeStudySection';
import DailyPuzzleHero from '@/components/DailyPuzzleHero';
import HomeStudySection from '@/components/HomeStudySection';

export default function Home() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflowY: 'auto' }}>
      {/* Full-width puzzle hero — outside the content container */}
      <DailyPuzzleHero />

      {/* Topic browse + studies */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '2.5rem 2rem 5rem' }}>
        <HomeTopicGrid />
        <HomeStudySection />
      </div>
    </div>
  );
}
