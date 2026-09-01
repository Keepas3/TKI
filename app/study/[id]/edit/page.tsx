'use client';

import { use } from 'react';
import StudyEditorPage from '@/components/StudyEditorPage';
import { usePost } from '@/components/useStudy';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';

function EditPageInner({ id }: { id: string }) {
  const { post, loading } = usePost(id);

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12 }}>Loading…</div>
      </div>
    );
  }
  if (!post) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12 }}>Post not found.</div>
      </div>
    );
  }

  return (
    <StudyEditorPage
      postId={id}
      initialTitle={post.title}
      initialTopic={post.topic}
      initialSummary={post.summary ?? ''}
      initialChapters={post.content}
      initialIsPublic={post.is_public}
    />
  );
}

export default function EditStudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }}>
      <EditPageInner id={id} />
    </div>
  );
}
