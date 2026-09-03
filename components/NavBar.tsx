'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDailyPuzzle } from './puzzleData';

const dailyPuzzleId = getDailyPuzzle().id;

export const NAV_BAR_HEIGHT = 52;

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function StudyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-1.5-1.2-3.6-2-6-2-1 0-1.8.1-2.5.3v13c.7-.2 1.5-.3 2.5-.3 2.4 0 4.5.8 6 2" />
      <path d="M12 6c1.5-1.2 3.6-2 6-2 1 0 1.8.1 2.5.3v13c-.7-.2-1.5-.3-2.5-.3-2.4 0-4.5.8-6 2V6z" />
    </svg>
  );
}
function PuzzleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h4v2.5a1.5 1.5 0 0 0 3 0V3h4a1 1 0 0 1 1 1v4h-2.5a1.5 1.5 0 0 0 0 3H21v4a1 1 0 0 1-1 1h-4v-2.5a1.5 1.5 0 0 0-3 0V21H9a1 1 0 0 1-1-1v-4H5.5a1.5 1.5 0 0 1 0-3H8V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.35rem 0.75rem', borderRadius: '6px',
        color: active ? 'var(--tt-accent)' : 'rgba(255,255,255,0.72)',
        backgroundColor: active ? 'color-mix(in srgb, var(--tt-accent) 15%, transparent)' : 'transparent',
        fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.04em',
        textDecoration: 'none', transition: 'color 0.12s, background-color 0.12s',
        flexShrink: 0,
      }}
      onMouseOver={(e) => {
        if (!active) {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'rgba(255,255,255,0.72)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function NavBar() {
  const path = usePathname();

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: `${NAV_BAR_HEIGHT}px`, zIndex: 1000,
      display: 'flex', alignItems: 'center', padding: '0 1.25rem',
      backgroundColor: 'rgba(10,10,14,0.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Logo */}
      <Link
        href="/"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--tt-accent)', fontWeight: 'bold', letterSpacing: '0.1em',
          fontSize: '0.82rem', textDecoration: 'none', textTransform: 'uppercase', flexShrink: 0,
        }}
      >
        <span style={{
          display: 'inline-block', width: '18px', height: '18px', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--tt-accent), var(--tt-accent-secondary))',
          borderRadius: '4px',
        }} />
        Blocks Content
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginLeft: '1.5rem' }}>
        <NavLink href="/"       icon={<HomeIcon />}   label="Home"    active={path === '/'} />
        <NavLink href="/study"  icon={<StudyIcon />}  label="Study"   active={path.startsWith('/study')} />
        <NavLink href="/puzzle" icon={<PuzzleIcon />} label="Puzzles" active={path.startsWith('/puzzle')} />
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Daily Puzzle pill */}
      <Link
        href={`/puzzle/${dailyPuzzleId}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.28rem 0.85rem', borderRadius: '100px',
          border: '1px solid color-mix(in srgb, var(--tt-accent) 35%, transparent)',
          backgroundColor: 'color-mix(in srgb, var(--tt-accent) 10%, transparent)',
          color: 'var(--tt-accent)', fontFamily: 'monospace', fontSize: '0.72rem',
          letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none',
          transition: 'background-color 0.12s, border-color 0.12s', flexShrink: 0,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--tt-accent) 16%, transparent)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--tt-accent) 55%, transparent)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--tt-accent) 10%, transparent)';
          e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--tt-accent) 35%, transparent)';
        }}
      >
        Daily Puzzle
      </Link>
    </header>
  );
}
