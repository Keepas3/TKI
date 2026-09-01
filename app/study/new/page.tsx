import StudyEditorPage from '@/components/StudyEditorPage';
import { NAV_BAR_WIDTH } from '@/components/NavBar';

export default function NewStudyPage() {
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0, overflow: 'hidden' }}>
      <StudyEditorPage />
    </div>
  );
}
