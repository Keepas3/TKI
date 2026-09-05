'use client';

import PublicProfilePage from '../../../components/PublicProfilePage';
import { NAV_BAR_HEIGHT } from '../../../components/NavBar';

export default function PublicProfileRoute({ params }: { params: { id: string } }) {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh' }}>
      <PublicProfilePage userId={params.id} />
    </div>
  );
}
