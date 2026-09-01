import StudyEditorPage from '@/components/StudyEditorPage';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';

export default function NewStudyPage() {
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
      <StudyEditorPage />
    </div>
  );
}
