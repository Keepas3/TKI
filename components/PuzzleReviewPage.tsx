'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../app/utils/supabaseClient';

const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };
const PIECE_COLORS: Record<number, string> = {
  1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',
};
const DIFFICULTY_COLORS: Record<string, string> = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171' };

// ---------------------------------------------------------------------------
// Mini board preview
// ---------------------------------------------------------------------------

function BoardPreview({ board }: { board: number[][] }) {
  const CELL = 6;
  const PAD = 2;
  const w = 10 * CELL + PAD * 2;
  const h = 20 * CELL + PAD * 2;
  const COLORS: Record<number, string> = {
    1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',8:'#6b7280',
  };
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.5)" rx={2} />
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

function boardToSnippet(board: number[][], queue: number[], name: string, difficulty: string, category: string, description: string): string {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  let firstNonEmpty = -1;
  for (let r = 0; r < board.length; r++) {
    if (board[r].some(c => c !== 0)) { firstNonEmpty = r; break; }
  }
  const boardStr = firstNonEmpty === -1
    ? 'makeBoard()'
    : `makeBoard(\n${board.slice(firstNonEmpty).map(row => `    [${row.map(v => v === 0 ? '_' : 'X').join(',')}],`).join('\n')}\n  )`;
  return `  {\n    id: '${id}',\n    name: '${name}',\n    category: '${category}',\n    difficulty: '${difficulty}',\n    description: '${description}',\n    board: ${boardStr},\n    queue: [${queue.join(', ')}],   // ${queue.map(t => PIECE_NAMES[t]).join(', ')}\n  },`;
}

// ---------------------------------------------------------------------------
// Submission row
// ---------------------------------------------------------------------------

interface Submission {
  id: string;
  author_username: string | null;
  name: string;
  difficulty: string;
  category: string;
  description: string | null;
  board: number[][];
  queue: number[];
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

function SubmissionCard({ sub, onUpdate }: { sub: Submission; onUpdate: () => void }) {
  const [note, setNote] = useState(sub.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const act = async (status: 'approved' | 'rejected') => {
    setBusy(true);
    await supabase.from('puzzle_submissions').update({ status, admin_note: note || null }).eq('id', sub.id);
    setBusy(false);
    onUpdate();
  };

  const snippet = boardToSnippet(sub.board, sub.queue, sub.name, sub.difficulty, sub.category, sub.description ?? '');

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = sub.status === 'approved' ? '#4ade80' : sub.status === 'rejected' ? '#f87171' : '#fbbf24';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <BoardPreview board={sub.board} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{sub.name}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${DIFFICULTY_COLORS[sub.difficulty]}22`, color: DIFFICULTY_COLORS[sub.difficulty], border: `1px solid ${DIFFICULTY_COLORS[sub.difficulty]}55` }}>
              {sub.difficulty}
            </span>
            <span style={{ fontSize: 10, color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: 4, padding: '1px 5px' }}>
              {sub.status}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>
            by {sub.author_username ?? 'anonymous'} · {sub.category} · {new Date(sub.created_at).toLocaleDateString()}
          </div>
          {sub.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, fontStyle: 'italic' }}>{sub.description}</div>}
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {sub.queue.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 3, background: PIECE_COLORS[t] ?? '#888', color: '#000', fontSize: 10, fontWeight: 700 }}>
                {PIECE_NAMES[t]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Snippet */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>puzzleData.ts snippet</span>
          <button onClick={copySnippet} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: copied ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: copied ? '#4ade80' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'monospace' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '8px 10px', margin: 0, fontSize: 10, color: '#a78bfa', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'monospace', lineHeight: 1.6 }}>
          {snippet}
        </pre>
      </div>

      {/* Admin actions */}
      {sub.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Admin note (optional, sent to submitter)"
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '6px 10px', color: '#fff', fontFamily: 'monospace', fontSize: 11 }}
          />
          <button onClick={() => act('approved')} disabled={busy}
            style={{ padding: '6px 14px', borderRadius: 5, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}>
            ✓ Approve
          </button>
          <button onClick={() => act('rejected')} disabled={busy}
            style={{ padding: '6px 14px', borderRadius: 5, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}>
            ✕ Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PuzzleReviewPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('puzzle_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    setSubs((data as Submission[]) ?? []);
    setLoading(false);
  };

  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter);
  const counts = { pending: subs.filter(s => s.status === 'pending').length, approved: subs.filter(s => s.status === 'approved').length, rejected: subs.filter(s => s.status === 'rejected').length };

  return (
    <div style={{ height: '100%', overflowY: 'auto', fontFamily: 'monospace', color: '#e2e8f0' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 60px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/puzzle" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 12 }}>← Puzzles</Link>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Puzzle Review</h1>
          {counts.pending > 0 && (
            <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>
              {counts.pending} pending
            </span>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['pending','approved','rejected','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
                background: filter === f ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                border: filter === f ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(255,255,255,0.08)',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.45)',
              }}>
              {f} {f !== 'all' ? `(${counts[f as keyof typeof counts]})` : `(${subs.length})`}
            </button>
          ))}
          <button onClick={load} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>No {filter === 'all' ? '' : filter} submissions.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(sub => <SubmissionCard key={sub.id} sub={sub} onUpdate={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
