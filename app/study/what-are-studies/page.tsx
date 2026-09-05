import Link from 'next/link';
import type { Metadata } from 'next';
import { NAV_BAR_HEIGHT } from '../../../components/NavBar';
import Footer from '../../../components/Footer';
import { StudyIcon } from '../../../components/studyUtils';

const TOPICS = [
  { id: 'opening',     label: 'Openings',     color: '#38bdf8', desc: 'First-piece setups & stacking patterns' },
  { id: 'timed',       label: 'Timed Modes',  color: '#f97316', desc: '40 Lines, Blitz, and other speed challenges' },
  { id: 'pc',          label: 'Perfect Clear', color: '#a78bfa', desc: 'PC setups, finishes & continuation paths' },
  { id: 'multiplayer', label: 'Multiplayer',  color: '#f472b6', desc: 'Midgames, garbage, cheese & board reading vs. opponents' },
  { id: 'combo',       label: 'Combos',       color: '#fbbf24', desc: 'Keeping chains alive & maximizing attacks' },
  { id: 'general',     label: 'General',      color: '#94a3b8', desc: 'Fundamentals, tips & everything else' },
] as const;

export const metadata: Metadata = { title: 'What are Studies? — TKI' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--tt-text)', margin: '0 0 0.75rem', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      <div style={{ fontSize: '0.88rem', color: 'var(--tt-text-muted)', lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

function BlockExample({ type, label, desc, accent }: { type: string; label: string; desc: string; accent: string }) {
  return (
    <div style={{
      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
      padding: '0.75rem 1rem', borderRadius: '8px',
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--tt-border)',
      marginBottom: '0.5rem',
    }}>
      <div style={{
        width: 6, borderRadius: 3, alignSelf: 'stretch', flexShrink: 0,
        background: accent,
      }} />
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent, marginBottom: '0.2rem' }}>
          {type}
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--tt-text)', marginBottom: '0.15rem' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--tt-text-faint)' }}>{desc}</div>
      </div>
    </div>
  );
}

export default function WhatAreStudiesPage() {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem 4rem', width: '100%' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: '0.72rem', color: 'var(--tt-text-faint)', marginBottom: '2rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <Link href="/study" style={{ color: 'var(--tt-text-faint)', textDecoration: 'none' }}>Studies</Link>
          <span>/</span>
          <span style={{ color: 'var(--tt-text-muted)' }}>What are studies?</span>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="var(--tt-accent)" strokeWidth="2">
              <circle cx="18" cy="18" r="15" />
              <path d="M18 17v8M18 13v1" strokeLinecap="round" />
            </svg>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--tt-text)', margin: 0, letterSpacing: '-0.02em' }}>
              What are Studies?
            </h1>
          </div>
          <p style={{ fontSize: '0.95rem', color: 'var(--tt-text-muted)', lineHeight: 1.7, margin: 0 }}>
            Studies are annotated board snapshots — a way to share a Tetris position with commentary so others can understand <em>why</em> a move works, not just what it is.
          </p>
        </div>

        {/* Main sections */}
        <Section title="How a study is structured">
          <p style={{ margin: '0 0 0.75rem' }}>
            A study is made up of one or more <strong style={{ color: 'var(--tt-text)' }}>chapters</strong>. Each chapter captures a frozen board state — the stack, the next-piece queue, and the hold piece — alongside a right panel of written commentary.
          </p>
          <p style={{ margin: 0 }}>
            Chapters let you walk through a sequence step by step: maybe the first chapter shows the board before a T-Spin setup, the second shows the ideal piece placement, and the third explains why a common mistake fails.
          </p>
        </Section>

        <Section title="Commentary blocks">
          <p style={{ margin: '0 0 1rem' }}>
            The right panel of each chapter is built from blocks you add in any order:
          </p>
          <BlockExample
            type="Paragraph"
            label="Free-form text"
            desc="Explain what the position shows, what the plan is, or why the setup works."
            accent="#94a3b8"
          />
          <BlockExample
            type="Heading"
            label="Section header"
            desc={'Break a long chapter into named sub-sections — e.g. “The Setup” → “The Finish”.'}
            accent="#a78bfa"
          />
          <BlockExample
            type="Tip"
            label="Highlighted callout"
            desc="A visually distinct note for a key insight, common mistake, or rule of thumb that&apos;s worth calling out."
            accent="#fbbf24"
          />
          <BlockExample
            type="Snapshot"
            label="Board capture"
            desc="Capture the current board state as a mini preview to illustrate a specific position inline in your commentary."
            accent="#38bdf8"
          />
        </Section>

        <Section title="Topics">
          <p style={{ margin: '0 0 1rem' }}>
            Every study is filed under one topic so readers can filter to what they&apos;re working on:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {TOPICS.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <StudyIcon topic={t.id} size={32} />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: t.color }}>{t.label}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--tt-text-faint)', marginLeft: '0.5rem' }}>{t.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Voting & visibility">
          <p style={{ margin: 0 }}>
            Studies are public by default. Other users can upvote studies they find useful — the &ldquo;hot&rdquo; sort surfaces studies with recent votes, and &ldquo;new&rdquo; shows the latest posts in chronological order. You can also set a study to private if you&apos;re still drafting it.
          </p>
        </Section>

        {/* CTA */}
        <div style={{
          marginTop: '3rem', padding: '1.5rem', borderRadius: '10px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--tt-border)',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--tt-text)' }}>Ready to start?</div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/study/new"
              style={{
                fontSize: '0.82rem', fontWeight: 600, padding: '0.55rem 1.25rem', borderRadius: '7px',
                background: 'var(--tt-accent)', color: '#000', textDecoration: 'none', letterSpacing: '0.02em',
              }}
            >
              Create a Study
            </Link>
            <Link
              href="/study"
              style={{
                fontSize: '0.82rem', fontWeight: 600, padding: '0.55rem 1.25rem', borderRadius: '7px',
                background: 'rgba(255,255,255,0.07)', color: 'var(--tt-text)', textDecoration: 'none',
                border: '1px solid var(--tt-border)',
              }}
            >
              Browse Studies
            </Link>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  );
}
