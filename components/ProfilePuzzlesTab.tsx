'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../app/utils/supabaseClient';
import { useAuth } from './useAuth';
import { PROFILE_CARD_STYLE } from './ProfileLayout';

const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };
const PIECE_COLORS: Record<number, string> = {
  1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',
};
const DIFFICULTY_COLORS: Record<string, string> = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171' };
const STATUS_COLORS: Record<string, string> = { pending:'#fbbf24', approved:'#4ade80', rejected:'#f87171' };

interface Submission {
  id: string;
  name: string;
  difficulty: string;
  category: string;
  description: string | null;
  board: number[][];
  queue: number[];
  status: string;
  created_at: string;
}

function BoardPreview({ board }: { board: number[][] }) {
  const CELL = 5;
  const PAD = 2;
  const w = 10 * CELL + PAD * 2;
  const h = 20 * CELL + PAD * 2;
  const COLORS: Record<number, string> = {
    1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',8:'#6b7280',
  };
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.4)" rx={3} />
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={PAD + c * CELL} y={PAD + r * CELL}
              width={CELL - 1} height={CELL - 1} fill={COLORS[cell] ?? '#888'} rx={0.5} />
          ) : null
        )
      )}
    </svg>
  );
}

export default function ProfilePuzzlesTab() {
  const { user } = useAuth();
  const [subs, setSubs] = useState<Submission[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('puzzle_submissions')
      .select('id, name, difficulty, category, description, board, queue, status, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setSubs((data as Submission[]) ?? []));
  }, [user]);

  if (subs === null) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontFamily: 'monospace', padding: '2rem 0' }}>
        Loading…
      </div>
    );
  }

  const pending  = subs.filter(s => s.status === 'pending').length;
  const approved = subs.filter(s => s.status === 'approved').length;
  const rejected = subs.filter(s => s.status === 'rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Summary row */}
      <div style={{ ...PROFILE_CARD_STYLE }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          My Submissions
        </div>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Total', value: subs.length },
            { label: 'Approved', value: approved, color: '#4ade80' },
            { label: 'Pending', value: pending, color: '#fbbf24' },
            { label: 'Rejected', value: rejected, color: '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>{label}</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 'bold', lineHeight: 1, color: color ?? 'rgba(255,255,255,0.88)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Submissions list */}
      <div style={PROFILE_CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Puzzle History
          </div>
          <Link href="/puzzle/editor" style={{ fontSize: '0.7rem', color: 'var(--tt-accent)', textDecoration: 'none', letterSpacing: '0.04em' }}>
            + Create New
          </Link>
        </div>

        {subs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem', margin: 0 }}>
              You haven&apos;t submitted any puzzles yet.
            </p>
            <Link
              href="/puzzle/editor"
              style={{
                fontSize: '0.78rem', color: 'var(--tt-accent)', textDecoration: 'none',
                border: '1px solid color-mix(in srgb, var(--tt-accent) 35%, transparent)',
                borderRadius: '6px', padding: '0.45rem 1rem',
                backgroundColor: 'color-mix(in srgb, var(--tt-accent) 8%, transparent)',
              }}
            >
              Open Puzzle Editor →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {subs.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.75rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <BoardPreview board={s.board} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{s.name}</span>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                      background: `${DIFFICULTY_COLORS[s.difficulty] ?? '#888'}22`,
                      color: DIFFICULTY_COLORS[s.difficulty] ?? '#888',
                      border: `1px solid ${DIFFICULTY_COLORS[s.difficulty] ?? '#888'}55`,
                    }}>
                      {s.difficulty}
                    </span>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                      color: STATUS_COLORS[s.status] ?? '#888',
                      border: `1px solid ${STATUS_COLORS[s.status] ?? '#888'}55`,
                    }}>
                      {s.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>
                    {s.category} · {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {s.queue.map((t, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 16, height: 16, borderRadius: 3,
                        background: PIECE_COLORS[t] ?? '#888', color: '#000', fontSize: 9, fontWeight: 700,
                      }}>
                        {PIECE_NAMES[t]}
                      </span>
                    ))}
                  </div>
                </div>

                {s.status === 'approved' && (
                  <Link
                    href={`/puzzle/${s.id}`}
                    style={{
                      fontSize: '0.72rem', color: 'var(--tt-accent)', textDecoration: 'none',
                      border: '1px solid color-mix(in srgb, var(--tt-accent) 35%, transparent)',
                      borderRadius: '5px', padding: '0.3rem 0.75rem', flexShrink: 0,
                      backgroundColor: 'color-mix(in srgb, var(--tt-accent) 8%, transparent)',
                    }}
                  >
                    Play →
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
