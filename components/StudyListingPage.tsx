'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePosts, TOPICS, type Topic, type ViewType, type SortOrder, type StudyPost } from './useStudy';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 190;

const TOPIC_MAP = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

function topicColor(id: string) { return TOPIC_MAP[id]?.color ?? '#94a3b8'; }
function topicLabel(id: string) { return TOPIC_MAP[id]?.label ?? id; }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ---------------------------------------------------------------------------
// Study icon — deterministic tetromino-inspired icon per topic
// Mirrors the visual language of the tetromino pieces on the rest of the site
// ---------------------------------------------------------------------------

// Tiny 4×4 bitmaps for each topic's icon piece
const TOPIC_SHAPES: Record<string, [number, number][]> = {
  opening: [[0,1],[1,1],[2,1],[1,0]],         // T
  '40l':   [[0,0],[1,0],[2,0],[3,0]],          // I (horizontal)
  pc:      [[0,0],[1,0],[0,1],[1,1]],          // O
  blitz:   [[0,0],[1,0],[1,1],[2,1]],          // S
  combo:   [[0,1],[1,1],[1,0],[2,0]],          // Z
  general: [[0,0],[0,1],[1,1],[2,1]],          // J
};

function StudyIcon({ topic, size = 40 }: { topic: string; size?: number }) {
  const color = topicColor(topic);
  const cells = TOPIC_SHAPES[topic] ?? TOPIC_SHAPES.general;
  const cell = Math.floor(size / 5);
  const pad = Math.floor((size - cell * 4) / 2);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect width={size} height={size} rx={8} fill={`color-mix(in srgb, ${color} 18%, #0a0a0e)`} />
      {cells.map(([cx, cy], i) => (
        <rect
          key={i}
          x={pad + cx * cell}
          y={pad + cy * cell + cell}
          width={cell - 1}
          height={cell - 1}
          rx={1}
          fill={color}
          opacity={0.9}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Study card — Lichess-style
// ---------------------------------------------------------------------------

function StudyCard({ post }: { post: StudyPost }) {
  return (
    <Link
      href={`/study/${post.id}`}
      style={{
        display: 'block', textDecoration: 'none', color: 'inherit',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px', padding: '0.9rem 1rem',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 10.5S1 7 1 3.5A2.5 2.5 0 0 1 6 2a2.5 2.5 0 0 1 5 1.5C11 7 6 10.5 6 10.5z" />
              </svg>
              {post.vote_count}
            </span>
            <span>·</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{post.author_username ?? 'Anonymous'}</span>
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
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
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
  | { type: 'topic'; topic: Topic };


const SIDEBAR_LINK: React.CSSProperties = {
  display: 'block', padding: '0.42rem 0.75rem', borderRadius: '5px',
  fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', textDecoration: 'none',
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'monospace',
  width: '100%', textAlign: 'left', letterSpacing: '0.02em', transition: 'background-color 0.1s, color 0.1s',
};

function sidebarActive(active: boolean): React.CSSProperties {
  return active
    ? { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }
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
      onMouseOver={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; } }}
      onMouseOut={(e) => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
    >
      {label}
    </button>
  );
}

function Sidebar({ active, onChange }: { active: SidebarView; onChange: (v: SidebarView) => void }) {
  const isTopics = active.type === 'topics' || active.type === 'topic';

  return (
    <nav style={{
      width: SIDEBAR_WIDTH, flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.08)',
      paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.05rem',
    }}>
      <SidebarItem label="All studies"    active={active.type === 'all'}       onClick={() => onChange({ type: 'all' })} />

      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', margin: '0.4rem 0.75rem' }} />

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
                color: active.type === 'topic' && active.topic === t.id ? t.color : 'rgba(255,255,255,0.55)',
                backgroundColor: active.type === 'topic' && active.topic === t.id ? `color-mix(in srgb, ${t.color} 12%, transparent)` : 'transparent',
                fontWeight: active.type === 'topic' && active.topic === t.id ? 'bold' : 'normal',
              }}
              onMouseOver={(e) => {
                const isSel = active.type === 'topic' && active.topic === t.id;
                if (!isSel) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = t.color; }
              }}
              onMouseOut={(e) => {
                const isSel = active.type === 'topic' && active.topic === t.id;
                if (!isSel) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: t.color, flexShrink: 0, display: 'inline-block' }} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.07)', margin: '0.4rem 0.75rem' }} />

      <Link
        href="/study/what-are-studies"
        style={{ ...SIDEBAR_LINK, color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        onMouseOver={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
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
      {sub && <p style={{ margin: 0, fontSize: '0.73rem', color: 'rgba(255,255,255,0.22)' }}>{sub}</p>}
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
    <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <div style={{ display: 'flex', gap: '0.7rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ height: '0.85rem', width: '70%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '4px' }} />
          <div style={{ height: '0.65rem', width: '45%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem' }}>
        {[60, 80, 50, 70].map((w, i) => (
          <div key={i} style={{ height: '0.6rem', width: `${w}%`, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '3px' }} />
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

  const [sidebarView, setSidebarView] = useState<SidebarView>({ type: 'all' });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOrder>('hot');

  // Derive usePosts options from sidebar view
  const viewType: ViewType = sidebarView.type === 'topic' ? 'topic' : 'all';
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
      case 'all':    return 'All studies';
      case 'topics': return 'Topics';
      case 'topic':  return topicLabel(sidebarView.topic);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div style={{ display: 'flex', height: '100%', fontFamily: 'monospace', backgroundColor: 'var(--tt-bg, #0a0a0e)' }}>

      {/* ── Left sidebar ── */}
      <Sidebar active={sidebarView} onChange={setSidebarView} />

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap',
          padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: 0, zIndex: 10,
          backgroundColor: 'rgba(10,10,14,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.4rem', flex: '1 1 240px', maxWidth: '480px' }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={`${viewTitle()}…`}
              style={{
                flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '6px', padding: '0.5rem 0.85rem', color: 'white',
                fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none',
              }}
            />
            <button
              type="submit"
              aria-label="Search"
              style={{
                backgroundColor: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: '6px', color: 'rgba(255,255,255,0.7)', padding: '0.5rem 0.75rem', cursor: 'pointer',
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
                style={{ backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', padding: '0.5rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                ✕
              </button>
            )}
          </form>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: '6px', color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace',
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
                    fontFamily: 'monospace', color: 'white', textAlign: 'left',
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
