'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import StudyEditorPage from '@/components/StudyEditorPage';
import { usePost, isOwnedPost, fetchEditToken, addOwnedPostId } from '@/components/useStudy';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';

function EditPageInner({ id, token }: { id: string; token?: string }) {
  const { post, loading } = usePost(id);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    // Fast path: owned by this device
    if (isOwnedPost(id)) { setAuthorized(true); return; }
    // Slow path: verify URL token against DB
    if (!token) { setAuthorized(false); return; }
    fetchEditToken(id).then((stored) => {
      const ok = !!stored && stored === token;
      if (ok) addOwnedPostId(id); // register on this device going forward
      setAuthorized(ok);
    });
  }, [id, token]);

  if (loading || authorized === null) {
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
  if (!authorized) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 13 }}>
          You don&apos;t have edit access to this study.
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
          Use the edit link you received when you published it.
        </div>
        <Link href={`/study/${id}`} style={{ marginTop: 8, fontSize: 11, color: 'var(--tt-accent)', fontFamily: 'monospace', textDecoration: 'none' }}>
          ← View study
        </Link>
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

export default function EditStudyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = use(params);
  const { token } = use(searchParams);
  return (
    <div style={{ position: 'absolute', top: NAV_BAR_HEIGHT, left: 0, right: 0, bottom: 0 }}>
      <EditPageInner id={id} token={token} />
    </div>
  );
}
