'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePosts, TOPICS, type Topic, type ViewType, type SortOrder, type StudyPost } from './useStudy';
import { useAuth } from './useAuth';
import { topicColor, topicLabel, timeAgo, StudyIcon } from './studyUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 190;



// ---------------------------------------------------------------------------
// Study card — Lichess-style
// ---------------------------------------------------------------------------

function StudyCard({ post }: { post: StudyPost }) {
  const router = useRouter();
  return (
    <Link
      href={`/study/${post.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--tt-border)',
        borderRadius: '8px', padding: '0.9rem 1rem',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--tt-surface)'; e.currentTarget.style.borderColor = 'var(--tt-border-strong)'; }}
      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'var(--tt-border)'; }}
    >
      {/* Header: icon + title */}
      <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <StudyIcon topic={post.topic} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: '0 0 0.2rem 0', fontSize: '0.92rem', fontWeight: 'bold',
            color: topicColor(post.topic), lineHeight: 1.3,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {post.title}
          </h3>
          {/* ♥ votes · author · time · private badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--tt-text-faint)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 10.5S1 7 1 3.5A2.5 2.5 0 0 1 6 2a2.5 2.5 0 0 1 5 1.5C11 7 6 10.5 6 10.5z" />
              </svg>
              {post.vote_count}
            </span>
            <span>·</span>
            {post.author_id ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/u/${post.author_id}`); }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--tt-text-muted)', fontFamily: 'monospace', fontSize: 'inherit' }}
              >
                {post.author_username ?? 'Unknown'}
              </button>
            ) : (
              <span style={{ color: 'var(--tt-text-muted)' }}>Anonymous</span>
            )}
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
            {!post.is_public && (
              <>
                <span>·</span>
                <span style={{ fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '3px', padding: '1px 4px' }}>Private</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chapters list */}
      {post.chapters.length > 0 && (
        <ul style={{ margin: '0.45rem 0 0 0', padding: '0 0 0 0.2rem', listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.1rem 0.5rem' }}>
          {post.chapters.slice(0, 6).map((ch, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'var(--tt-text-faint)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5">
                <circle cx="4" cy="4" r="2.5" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

type SidebarView =
  | { type: 'all' }
  | { type: 'topics' }
  | { type: 'topic'; topic: Topic }
  | { type: 'pending' };


const SIDEBAR_LINK: React.CSSProperties = {
  display: 'block', padding: '0.42rem 0.75rem', borderRadius: '5px',
  fontSize: '0.82rem', color: 'var(--tt-text-muted)', textDecoration: 'none',
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'monospace',
  width: '100%', textAlign: 'left', letterSpacing: '0.02em', transition: 'background-color 0.1s, color 0.1s',
};

function sidebarActive(active: boolean): React.CSSProperties {
  return active
    ? { background: 'var(--tt-surface-hover)', color: 'var(--tt-text)', fontWeight: 'bold' }
    : {};
}

function SidebarItem({ label, active, onClick, indent }: { label: string; active: boolean; onClick: () => void; indent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...SIDEBAR_LINK,
        paddingLeft: indent ? '1.5rem' : '0.75rem',
        ...sidebarActive(active),
      }}
      onMouseOver={(e) => { if (!active) { e.currentTarget.style.background = 'var(--tt-surface)'; e.currentTarget.style.color = 'var(--tt-text)'; } }}
      onMouseOut={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tt-text-muted)'; } }}
    >
      {label}
    </button>
  );
}

function Sidebar({ active, onChange, isAdmin }: { active: SidebarView; onChange: (v: SidebarView) => void; isAdmin: boolean }) {
  const isTopics = active.type === 'topics' || active.type === 'topic';

  return (
    <nav style={{
      width: SIDEBAR_WIDTH, flexShrink: 0,
      borderRight: '1px solid var(--tt-border)',
      paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.05rem',
    }}>
      <SidebarItem label="All studies"    active={active.type === 'all'}       onClick={() => onChange({ type: 'all' })} />
      {isAdmin && <SidebarItem label="⚑ Pending review" active={active.type === 'pending'} onClick={() => onChange({ type: 'pending' })} />}

      <div style={{ height: '1px', backgroundColor: 'var(--tt-border)', margin: '0.4rem 0.75rem' }} />

      <SidebarItem label="Topics" active={isTopics} onClick={() => onChange({ type: 'topics' })} />

      {/* Topic sub-list — shown when Topics or a specific topic is selected */}
      {isTopics && (
        <div style={{ paddingLeft: '0.35rem' }}>
          {TOPICS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ type: 'topic', topic: t.id })}
              style={{
                ...SIDEBAR_LINK,
                paddingLeft: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: active.type === 'topic' && active.topic === t.id ? t.color : 'var(--tt-text-muted)',
                background: active.type === 'topic' && active.topic === t.id ? `color-mix(in srgb, ${t.color} 12%, transparent)` : 'transparent',
                fontWeight: active.type === 'topic' && active.topic === t.id ? 'bold' : 'normal',
              }}
              onMouseOver={(e) => {
                const isSel = active.type === 'topic' && active.topic === t.id;
                if (!isSel) { e.currentTarget.style.background = 'var(--tt-surface)'; e.currentTarget.style.color = t.color; }
              }}
              onMouseOut={(e) => {
                const isSel = active.type === 'topic' && active.topic === t.id;
                if (!isSel) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tt-text-muted)'; }
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: t.color, flexShrink: 0, display: 'inline-block' }} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ height: '1px', backgroundColor: 'var(--tt-border)', margin: '0.4rem 0.75rem' }} />

      <Link
        href="/study/what-are-studies"
        style={{ ...SIDEBAR_LINK, color: 'var(--tt-text-faint)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        onMouseOver={(e) => { e.currentTarget.style.color = 'var(--tt-text-muted)'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = 'var(--tt-text-faint)'; }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6.5" cy="6.5" r="5.5" />
          <path d="M6.5 6v4M6.5 4v.5" strokeLinecap="round" />
        </svg>
        What are studies?
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ view }: { view: SidebarView }) {
  const router = useRouter();
  const msg = 'No studies found';
  const sub = view.type === 'topic' ? `Nothing filed under ${topicLabel(view.topic)} yet — be the first!` : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', padding: '5rem 2rem', color: 'rgba(255,255,255,0.35)' }}>
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 7c-4-3.1-9.2-5-15-5C3.6 2 2 2.2 1 2.5v33c1-.3 2.6-.5 5-.5 5.8 0 11 1.9 15 5" />
        <path d="M21 7c4-3.1 9.2-5 15-5 2.4 0 4 .2 5 .5v33c-1-.3-2.6-.5-5-.5-5.8 0-11 1.9-15 5V7z" />
      </svg>
      <p style={{ margin: 0, fontSize: '0.88rem' }}>{msg}</p>
      {sub && <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--tt-text-dim)' }}>{sub}</p>}
      <button
        type="button"
        onClick={() => router.push('/study/new')}
        style={{ backgroundColor: 'var(--tt-accent)', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '6px', padding: '0.5rem 1.1rem', fontFamily: 'monospace', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
      >
        + New Study
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader cards
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: 'var(--tt-surface)', border: '1px solid var(--tt-surface)', borderRadius: '8px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', gap: '0.7rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: 'var(--tt-surface)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ height: '0.85rem', width: '70%', backgroundColor: 'var(--tt-border)', borderRadius: '4px' }} />
          <div style={{ height: '0.65rem', width: '45%', backgroundColor: 'var(--tt-surface)', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem' }}>
        {[60, 80, 50, 70].map((w, i) => (
          <div key={i} style={{ height: '0.6rem', width: `${w}%`, backgroundColor: 'var(--tt-surface)', borderRadius: '3px' }} />
        ))}
      </div>
      <style>{`@keyframes tt-pulse { from{opacity:0.4} to{opacity:0.85} }`}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StudyListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const initialTopic = searchParams.get('topic') as Topic | null;
  const [sidebarView, setSidebarView] = useState<SidebarView>(
    initialTopic && TOPICS.some((t) => t.id === initialTopic)
      ? { type: 'topic', topic: initialTopic }
      : { type: 'all' }
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOrder>('hot');

  // Derive usePosts options from sidebar view
  const viewType: ViewType = sidebarView.type === 'topic' ? 'topic' : sidebarView.type === 'pending' ? 'pending' : 'all';
  const activeTopic = sidebarView.type === 'topic' ? sidebarView.topic : null;

  const { posts, loading, error } = usePosts({
    view: viewType,
    topic: activeTopic,
    search,
    sort,
  });

  // Heading title for current view
  function viewTitle(): string {
    switch (sidebarView.type) {
      case 'all':     return 'All studies';
      case 'topics':  return 'Topics';
      case 'topic':   return topicLabel(sidebarView.topic);
      case 'pending': return 'Pending review';
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'monospace', backgroundColor: 'var(--tt-bg)' }}>

      {/* ── Left sidebar ── */}
      <Sidebar active={sidebarView} onChange={setSidebarView} isAdmin={isAdmin} />

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap',
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--tt-border)',
          position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: 'var(--tt-nav-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: '1 1 240px', maxWidth: '480px' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`${viewTitle()}…`}
              style={{
                flex: 1, backgroundColor: 'var(--tt-border)', border: '1px solid var(--tt-border-strong)',
                borderRadius: '6px', padding: '0.5rem 0.85rem', color: 'var(--tt-text)',
                fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none',
              }}
            />
            <button
              type="submit"
              aria-label="Search"
              style={{
                backgroundColor: 'var(--tt-surface-hover)', border: '1px solid var(--tt-border-strong)',
                borderRadius: '6px', color: 'var(--tt-text-muted)', padding: '0.5rem 0.75rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="6" cy="6" r="4" />
                <path d="M10 10l2.5 2.5" />
              </svg>
            </button>
            {search && (
              <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
                style={{ backgroundColor: 'transparent', border: '1px solid var(--tt-surface-hover)', borderRadius: '6px', color: 'var(--tt-text-faint)', padding: '0.5rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                ✕
              </button>
            )}
          </form>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            style={{
              backgroundColor: 'var(--tt-border)', border: '1px solid var(--tt-border-strong)',
              borderRadius: '6px', color: 'var(--tt-text-muted)', fontFamily: 'monospace',
              fontSize: '0.8rem', padding: '0.5rem 0.75rem', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="hot">Hot</option>
            <option value="new">New</option>
          </select>

          {/* New study button */}
          <button
            type="button"
            onClick={() => router.push('/study/new')}
            style={{
              backgroundColor: '#4ade80', color: 'black', fontWeight: 'bold', border: 'none',
              borderRadius: '6px', padding: '0.5rem 0.6rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '2px',
            }}
            title="New study"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 4v10M4 9h10" />
            </svg>
          </button>
        </div>

        {/* "Topics" overview — show topic tiles when sidebar is at the top-level Topics entry */}
        {sidebarView.type === 'topics' && !search && (
          <div style={{ padding: '1.25rem 1.25rem 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSidebarView({ type: 'topic', topic: t.id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    backgroundColor: `color-mix(in srgb, ${t.color} 10%, rgba(0,0,0,0.35))`,
                    border: `1px solid color-mix(in srgb, ${t.color} 28%, transparent)`,
                    borderRadius: '8px', padding: '0.8rem 1rem', cursor: 'pointer',
                    fontFamily: 'monospace', color: 'var(--tt-text)', textAlign: 'left',
                    transition: 'background-color 0.12s, border-color 0.12s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${t.color} 18%, rgba(0,0,0,0.35))`; e.currentTarget.style.borderColor = `color-mix(in srgb, ${t.color} 50%, transparent)`; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${t.color} 10%, rgba(0,0,0,0.35))`; e.currentTarget.style.borderColor = `color-mix(in srgb, ${t.color} 28%, transparent)`; }}
                >
                  <StudyIcon topic={t.id} size={32} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: t.color }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: '1rem 1.25rem', padding: '0.75rem 1rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: '7px', color: '#f87171', fontSize: '0.78rem' }}>
            {error.includes('does not exist')
              ? 'study_posts table not found — run supabase-study.sql in your Supabase dashboard first.'
              : `Error: ${error}`}
          </div>
        )}

        {/* Grid */}
        <div style={{ padding: '1rem 1.25rem 3rem', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <EmptyState view={sidebarView} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {posts.map((p) => <StudyCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
