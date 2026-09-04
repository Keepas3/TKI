import StudyListingPage from '@/components/StudyListingPage';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import Footer from '@/components/Footer';

export default function StudyPage() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <StudyListingPage />
      <Footer />
    </div>
  );
}
