import ProfileLayout from '../../components/ProfileLayout';
import { NAV_BAR_HEIGHT } from '../../components/NavBar';

export default function ProfileRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh' }}>
      <ProfileLayout>{children}</ProfileLayout>
    </div>
  );
}
