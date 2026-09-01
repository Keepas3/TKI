import StudyListingPage from '@/components/StudyListingPage';
import { NAV_BAR_WIDTH } from '@/components/NavBar';

export default function StudyPage() {
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0, overflowY: 'auto' }}>
      <StudyListingPage />
    </div>
  );
}
