'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

const TABS = [
  { href: '/profile', label: 'Profile' },
  { href: '/profile/puzzles', label: 'Puzzles' },
  { href: '/profile/studies', label: 'Studies' },
  { href: '/profile/settings', label: 'Settings' },
] as const;

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  if (user === undefined || user === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {user === undefined ? 'One moment…' : 'Redirecting to sign in…'}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'monospace' }}>
      <nav style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const active = tab.href === '/profile' ? pathname === '/profile' : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} style={{
              padding: '0.75rem 1rem', textDecoration: 'none', fontSize: '0.8rem', letterSpacing: '0.05em',
              color: active ? 'var(--tt-accent)' : 'rgba(255,255,255,0.6)',
              borderBottom: active ? '2px solid var(--tt-accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}>
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}

export const PROFILE_CARD_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(5,5,8,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1.5rem',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'white',
};
