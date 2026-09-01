'use client';

import React from 'react';
import Link from 'next/link';

export const NAV_BAR_WIDTH = 220;

function StudyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-1.5-1.2-3.6-2-6-2-1 0-1.8.1-2.5.3v13c.7-.2 1.5-.3 2.5-.3 2.4 0 4.5.8 6 2" />
      <path d="M12 6c1.5-1.2 3.6-2 6-2 1 0 1.8.1 2.5.3v13c-.7-.2-1.5-.3-2.5-.3-2.4 0-4.5.8-6 2V6z" />
    </svg>
  );
}
function PuzzleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h4v2.5a1.5 1.5 0 0 0 3 0V3h4a1 1 0 0 1 1 1v4h-2.5a1.5 1.5 0 0 0 0 3H21v4a1 1 0 0 1-1 1h-4v-2.5a1.5 1.5 0 0 0-3 0V21H9a1 1 0 0 1-1-1v-4H5.5a1.5 1.5 0 0 1 0-3H8V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

const navRowStyle = (active?: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
  background: active ? 'color-mix(in srgb, var(--tt-accent) 16%, transparent)' : 'transparent',
  border: 'none', borderRadius: '6px', padding: '0.6rem 0.75rem',
  color: active ? 'var(--tt-accent)' : 'rgba(255,255,255,0.8)',
  fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.03em',
  cursor: 'pointer', textAlign: 'left', textDecoration: 'none',
});

export default function NavBar() {
  return (
    <aside
      style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, width: `${NAV_BAR_WIDTH}px`, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'rgba(10,10,14,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderRight: '1px solid rgba(255,255,255,0.08)', fontFamily: 'monospace',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--tt-accent)', fontWeight: 'bold',
          letterSpacing: '0.1em', fontSize: '0.85rem', textDecoration: 'none', textTransform: 'uppercase',
          padding: '1.1rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{
          display: 'inline-block', width: '18px', height: '18px', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--tt-accent), var(--tt-accent-secondary))', borderRadius: '4px',
        }} />
        Blocks Content
      </Link>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.6rem 0', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <Link href="/" style={navRowStyle()}>
          <HomeIcon />
          <span style={{ flex: 1 }}>Home</span>
        </Link>
        <Link href="/study" style={navRowStyle()}>
          <StudyIcon />
          <span style={{ flex: 1 }}>Study</span>
        </Link>
        <Link href="/puzzle" style={navRowStyle()}>
          <PuzzleIcon />
          <span style={{ flex: 1 }}>Puzzles</span>
        </Link>
      </nav>
    </aside>
  );
}
