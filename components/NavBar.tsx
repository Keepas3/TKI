'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getDailyPuzzleByDate, fetchDailyPuzzle } from './puzzleData';

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

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('tt-theme');
    const isDark = saved === null || saved === 'dark';
    setDark(isDark);
    const val = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', val);
    document.cookie = `tt-theme=${val}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const val = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', val);
    localStorage.setItem('tt-theme', val);
    document.cookie = `tt-theme=${val}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: '6px',
        border: '1px solid var(--tt-border)',
        background: 'transparent', color: 'var(--tt-text-faint)',
        cursor: 'pointer', flexShrink: 0,
        transition: 'color 0.12s, border-color 0.12s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.color = 'var(--tt-text)';
        e.currentTarget.style.borderColor = 'var(--tt-border-strong)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.color = 'var(--tt-text-faint)';
        e.currentTarget.style.borderColor = 'var(--tt-border)';
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.45rem',
        padding: '0.35rem 0.75rem', borderRadius: '6px',
        color: active ? 'var(--tt-accent)' : 'var(--tt-text-muted)',
        backgroundColor: active ? 'color-mix(in srgb, var(--tt-accent) 15%, transparent)' : 'transparent',
        fontFamily: 'monospace', fontSize: '0.82rem', letterSpacing: '0.04em',
        textDecoration: 'none', transition: 'color 0.12s, background-color 0.12s',
        flexShrink: 0,
      }}
      onMouseOver={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--tt-text)';
          e.currentTarget.style.backgroundColor = 'var(--tt-surface-hover)';
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--tt-text-muted)';
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
  const [dailyPuzzleId, setDailyPuzzleId] = useState(() => getDailyPuzzleByDate().id);
  useEffect(() => { fetchDailyPuzzle().then((p) => setDailyPuzzleId(p.id)); }, []);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: `${NAV_BAR_HEIGHT}px`, zIndex: 1000,
      display: 'flex', alignItems: 'center', padding: '0 1.25rem 0 2rem',
      backgroundColor: 'var(--tt-nav-bg)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--tt-border)',
    }}>
      <Link
        href="/"
        style={{
          color: 'var(--tt-accent)', fontWeight: 800, letterSpacing: '0.18em',
          fontSize: '0.88rem', textDecoration: 'none', textTransform: 'uppercase', flexShrink: 0,
        }}
      >
        TKI
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginLeft: '1.5rem' }}>
        <NavLink href="/"       icon={<HomeIcon />}   label="Home"    active={path === '/'} />
        <NavLink href="/study"  icon={<StudyIcon />}  label="Study"   active={path.startsWith('/study')} />
        <NavLink href="/puzzle" icon={<PuzzleIcon />} label="Puzzles" active={path.startsWith('/puzzle')} />
      </nav>

      <div style={{ flex: 1 }} />

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
          marginRight: '0.75rem',
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

      <ThemeToggle />
    </header>
  );
}
