'use client';

import React from 'react';
import Link from 'next/link';
import { usePosts, TOPICS, type StudyPost } from './useStudy';
import { StudyIcon, topicColor, topicLabel, timeAgo } from './studyUtils';

// ---------------------------------------------------------------------------
// Topic grid (exported so page.tsx can place it before the puzzle card)
// ---------------------------------------------------------------------------

export function HomeTopicGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
      {TOPICS.map((t) => (
        <Link
          key={t.id}
          href={`/study?topic=${t.id}`}
          style={{
            display: 'flex', flexDirection: 'column', gap: '0.3rem',
            padding: '0.9rem 1.1rem', textDecoration: 'none',
            background: `color-mix(in srgb, ${t.color} 10%, transparent)`,
            borderLeft: `3px solid ${t.color}`,
            borderRadius: '6px',
            transition: 'background 0.12s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${t.color} 18%, transparent)`; }}
          onMouseOut={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${t.color} 10%, transparent)`; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StudyIcon topic={t.id} size={20} />
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>{t.label}</span>
          </div>
          <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>Browse →</span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured study
// ---------------------------------------------------------------------------

function HomeFeaturedStudy({ post }: { post: StudyPost }) {
  const color = topicColor(post.topic);
  return (
    <Link
      href={`/study/${post.id}`}
      style={{
        display: 'flex', gap: '2rem', textDecoration: 'none', color: 'inherit',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '8px', padding: '1.25rem 1.4rem',
        transition: 'background-color 0.12s, border-color 0.12s',
        marginTop: '2.5rem',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.055)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)';
      }}
    >
      {/* Left: metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.1em', color: 'var(--tt-accent)', marginBottom: '0.4rem' }}>
          FEATURED
        </div>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem', fontWeight: 'bold', color: '#fff', lineHeight: 1.25 }}>
          {post.title}
        </h2>
        {post.summary && (
          <p style={{
            margin: '0 0 0.75rem', fontSize: '0.83rem', color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}>
            {post.summary}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', fontFamily: 'monospace' }}>
          <span style={{
            padding: '0.15rem 0.5rem', borderRadius: '999px',
            background: `color-mix(in srgb, ${color} 18%, transparent)`,
            color, fontWeight: 'bold',
          }}>
            {topicLabel(post.topic)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>
            {post.author_username ?? 'Anon'} · {timeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Right: chapter list */}
      {post.chapters.length > 0 && (
        <div style={{ minWidth: 190, flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
            CHAPTERS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {post.chapters.slice(0, 4).map((ch, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.4rem', fontSize: '0.78rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)' }}>
                <span style={{ opacity: 0.5 }}>○</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch}</span>
              </div>
            ))}
            {post.chapters.length > 4 && (
              <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', marginTop: '0.1rem' }}>
                +{post.chapters.length - 4} more
              </div>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Recent studies list (2-col)
// ---------------------------------------------------------------------------

function RecentCard({ post }: { post: StudyPost }) {
  const color = topicColor(post.topic);
  return (
    <Link
      href={`/study/${post.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '7px', padding: '0.85rem 1rem',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.055)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      <div style={{ fontWeight: 'bold', fontSize: '0.88rem', color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.3rem' }}>
        {post.title}
      </div>
      {post.chapters[0] && (
        <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.35rem' }}>
          ○ {post.chapters[0]}
        </div>
      )}
      <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)' }}>
        {post.author_username ?? 'Anon'} · {timeAgo(post.created_at)}
      </div>
    </Link>
  );
}

function HomeRecentList({ posts }: { posts: StudyPost[] }) {
  return (
    <div style={{ marginTop: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <h2 style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>
          Recent Studies
        </h2>
        <Link href="/study" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', fontFamily: 'monospace' }}>
          View all →
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
        {posts.map((p) => <RecentCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function SkeletonTile() {
  return <div style={{ height: 72, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' }} />;
}
function SkeletonFeatured() {
  return <div style={{ height: 140, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', marginTop: '2.5rem' }} />;
}
function SkeletonSmall() {
  return <div style={{ height: 80, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.04)' }} />;
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function HomeStudySection() {
  const { posts, loading, error } = usePosts({ view: 'all', sort: 'new' });
  const featured = posts[0] ?? null;
  const recent = posts.slice(1, 7);

  return (
    <div>
      {error && (
        <p style={{ margin: '2rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          Couldn&apos;t load studies.
        </p>
      )}

      {!error && loading && (
        <>
          <SkeletonFeatured />
          <div style={{ marginTop: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonSmall key={i} />)}
          </div>
        </>
      )}

      {!error && !loading && featured && <HomeFeaturedStudy post={featured} />}
      {!error && !loading && recent.length > 0 && <HomeRecentList posts={recent} />}
    </div>
  );
}
