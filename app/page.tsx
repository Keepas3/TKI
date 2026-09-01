'use client';
import Link from 'next/link';
import { NAV_BAR_WIDTH } from '@/components/NavBar';

export default function Home() {
  return (
    <div style={{ position: 'absolute', top: 0, left: NAV_BAR_WIDTH, right: 0, bottom: 0, overflowY: 'auto' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 2rem', fontFamily: 'monospace' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--tt-accent)', letterSpacing: '0.06em', margin: '0 0 0.5rem' }}>
          Blocks Content
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 3rem', lineHeight: 1.6 }}>
          Study materials and perfect-clear puzzles for block-stacking games.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <NavCard
            href="/study"
            title="Study"
            description="Browse and author multi-chapter board studies — open positions, strategies, and techniques."
            accent="#38bdf8"
          />
          <NavCard
            href="/puzzle"
            title="Puzzles"
            description="Perfect-clear training puzzles. Solve each setup using only the pieces given."
            accent="#a78bfa"
          />
        </div>
      </div>
    </div>
  );
}

function NavCard({ href, title, description, accent }: { href: string; title: string; description: string; accent: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'block', textDecoration: 'none',
        backgroundColor: `color-mix(in srgb, ${accent} 8%, rgba(5,5,8,0.72))`,
        border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
        borderRadius: '10px', padding: '1.25rem 1.5rem',
        transition: 'background-color 0.15s, border-color 0.15s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${accent} 14%, rgba(5,5,8,0.72))`;
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 40%, transparent)`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${accent} 8%, rgba(5,5,8,0.72))`;
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${accent} 22%, transparent)`;
      }}
    >
      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: accent, letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
        {description}
      </div>
    </Link>
  );
}
