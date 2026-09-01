'use client';

import React from 'react';
import Link from 'next/link';
import { usePosts, type StudyPost } from './useStudy';
import { StudyIcon, topicColor, timeAgo } from './studyUtils';

function HomeStudyCard({ post }: { post: StudyPost }) {
  return (
    <Link
      href={`/study/${post.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', padding: '0.8rem 0.9rem',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
        <StudyIcon topic={post.topic} size={28} />
        <h3 style={{
          flex: 1, margin: 0, fontSize: '0.85rem', fontWeight: 'bold',
          color: topicColor(post.topic), lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {post.title}
        </h3>
      </div>
      <div style={{
        display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center',
        marginTop: '0.45rem', fontSize: '0.65rem',
        color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
      }}>
        <span>♥ {post.vote_count}</span>
        <span>·</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{post.author_username ?? 'Anon'}</span>
        <span>·</span>
        <span>{timeAgo(post.created_at)}</span>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px', padding: '0.8rem 0.9rem',
      display: 'flex', flexDirection: 'column', gap: '0.45rem',
    }}>
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ height: '0.8rem', width: '75%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3 }} />
          <div style={{ height: '0.7rem', width: '55%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3 }} />
        </div>
      </div>
      <div style={{ height: '0.6rem', width: '50%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 3 }} />
      <style>{`@keyframes tt-pulse{from{opacity:.4}to{opacity:.8}}`}</style>
    </div>
  );
}

export default function HomeStudySection() {
  const { posts, loading, error } = usePosts({ view: 'all', sort: 'new' });
  const recent = posts.slice(0, 6);

  return (
    <div style={{ padding: '3rem 2rem 4rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em' }}>
          Recent Studies
        </h2>
        <Link href="/study" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontFamily: 'monospace' }}>
          View all →
        </Link>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          Couldn&apos;t load recent studies.
        </p>
      )}

      {!error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : recent.length === 0
              ? <p style={{ gridColumn: '1/-1', margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>No studies yet.</p>
              : recent.map((p) => <HomeStudyCard key={p.id} post={p} />)
          }
        </div>
      )}
    </div>
  );
}
