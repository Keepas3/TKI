import StudyPostPage from '@/components/StudyPostPage';
import { NAV_BAR_WIDTH } from '@/components/NavBar';

export default async function StudyPostRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0, overflow: 'hidden' }}>
      <StudyPostPage id={id} />
    </div>
  );
}
