import ProfileLayout from '../../components/ProfileLayout';
import { NAV_BAR_HEIGHT } from '../../components/NavBar';
import Footer from '../../components/Footer';

export default function ProfileRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <ProfileLayout>{children}</ProfileLayout>
      </div>
      <Footer />
    </div>
  );
}
