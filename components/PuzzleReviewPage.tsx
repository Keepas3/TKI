'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../app/utils/supabaseClient';

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

interface ScheduleRow { date: string; puzzle_id: string; }

async function loadSchedule(): Promise<ScheduleRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('daily_schedule')
    .select('date, puzzle_id')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(14);
  return (data as ScheduleRow[]) ?? [];
}

async function setScheduleDate(date: string, puzzleId: string): Promise<void> {
  await supabase.from('daily_schedule').upsert({ date, puzzle_id: puzzleId });
}

async function removeScheduleDate(date: string): Promise<void> {
  await supabase.from('daily_schedule').delete().eq('date', date);
}

const PIECE_NAMES: Record<number, string> = { 1:'I',2:'O',3:'T',4:'S',5:'Z',6:'J',7:'L' };
const PIECE_COLORS: Record<number, string> = {
  1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',
};
const DIFFICULTY_COLORS: Record<string, string> = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171' };

// ---------------------------------------------------------------------------
// Mini board preview
// ---------------------------------------------------------------------------

function BoardPreview({ board, cellSize = 6 }: { board: number[][]; cellSize?: number }) {
  const PAD = 2;
  const w = 10 * cellSize + PAD * 2;
  const h = 20 * cellSize + PAD * 2;
  const COLORS: Record<number, string> = {
    1:'#38bdf8',2:'#fbbf24',3:'#a78bfa',4:'#4ade80',5:'#f87171',6:'#0ea5e9',7:'#fb923c',8:'#6b7280',
  };
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.5)" rx={2} />
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={PAD + c * cellSize} y={PAD + r * cellSize}
              width={cellSize - 1} height={cellSize - 1} fill={COLORS[cell] ?? '#888'} rx={0.5} />
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
// Submission type
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

// ---------------------------------------------------------------------------
// Submission card (review tab)
// ---------------------------------------------------------------------------

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
  const copySnippet = () => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const statusColor = sub.status === 'approved' ? '#4ade80' : sub.status === 'rejected' ? '#f87171' : '#fbbf24';

  return (
    <div style={{ background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <BoardPreview board={sub.board} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--tt-text)', fontSize: 14, fontWeight: 600 }}>{sub.name}</span>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${DIFFICULTY_COLORS[sub.difficulty]}22`, color: DIFFICULTY_COLORS[sub.difficulty], border: `1px solid ${DIFFICULTY_COLORS[sub.difficulty]}55` }}>
              {sub.difficulty}
            </span>
            <span style={{ fontSize: 10, color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: 4, padding: '1px 5px' }}>
              {sub.status}
            </span>
            <Link href={`/puzzle/${sub.id}`} target="_blank" style={{ fontSize: 10, padding: '1px 8px', borderRadius: 4, background: 'var(--tt-surface-hover)', border: '1px solid var(--tt-border)', color: 'var(--tt-accent)', textDecoration: 'none', marginLeft: 'auto' }}>
              Play →
            </Link>
          </div>
          <div style={{ fontSize: 11, color: 'var(--tt-text-muted)', marginTop: 3 }}>
            by {sub.author_username ?? 'anonymous'} · {sub.category} · {new Date(sub.created_at).toLocaleDateString()}
          </div>
          {sub.description && <div style={{ fontSize: 11, color: 'var(--tt-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{sub.description}</div>}
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {sub.queue.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 3, background: PIECE_COLORS[t] ?? '#888', color: '#000', fontSize: 10, fontWeight: 700 }}>
                {PIECE_NAMES[t]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-text-faint)' }}>puzzleData.ts snippet</span>
          <button onClick={copySnippet} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: copied ? 'rgba(74,222,128,0.15)' : 'var(--tt-surface-hover)', border: '1px solid var(--tt-border)', color: copied ? '#4ade80' : 'var(--tt-text-muted)', cursor: 'pointer', fontFamily: 'monospace' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--tt-border)', borderRadius: 5, padding: '8px 10px', margin: 0, fontSize: 10, color: '#a78bfa', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'monospace', lineHeight: 1.6 }}>
          {snippet}
        </pre>
      </div>

      {sub.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <input
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Admin note (optional)"
            style={{ flex: 1, background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 5, padding: '6px 10px', color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 11 }}
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
// Queue card (queue tab — approved puzzles with schedule-as-daily)
// ---------------------------------------------------------------------------

function QueueCard({ sub, onScheduleChange }: { sub: Submission; onScheduleChange: () => void }) {
  const [schedDate, setSchedDate] = useState('');
  const [schedBusy, setSchedBusy] = useState(false);
  const [schedDone, setSchedDone] = useState('');

  const scheduleAsDaily = async () => {
    if (!schedDate) return;
    setSchedBusy(true);
    await setScheduleDate(schedDate, sub.id);
    setSchedBusy(false);
    setSchedDone(schedDate);
    setSchedDate('');
    onScheduleChange();
  };

  return (
    <div style={{ background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
      <BoardPreview board={sub.board} cellSize={4} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ color: 'var(--tt-text)', fontSize: 13, fontWeight: 600 }}>{sub.name}</span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${DIFFICULTY_COLORS[sub.difficulty]}22`, color: DIFFICULTY_COLORS[sub.difficulty], border: `1px solid ${DIFFICULTY_COLORS[sub.difficulty]}55` }}>
            {sub.difficulty}
          </span>
          <Link href={`/puzzle/${sub.id}`} target="_blank" style={{ fontSize: 10, padding: '1px 8px', borderRadius: 4, background: 'var(--tt-surface-hover)', border: '1px solid var(--tt-border)', color: 'var(--tt-accent)', textDecoration: 'none' }}>
            Play →
          </Link>
        </div>
        <div style={{ fontSize: 11, color: 'var(--tt-text-muted)', marginBottom: 6 }}>
          by {sub.author_username ?? 'anonymous'} · {sub.category}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sub.queue.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 3, background: PIECE_COLORS[t] ?? '#888', color: '#000', fontSize: 9, fontWeight: 700 }}>
              {PIECE_NAMES[t]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tt-text-faint)' }}>Make Daily</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            style={{ background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 4, padding: '4px 8px', color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 11, colorScheme: 'dark' }}
          />
          <button onClick={scheduleAsDaily} disabled={!schedDate || schedBusy}
            style={{ padding: '4px 12px', borderRadius: 4, background: schedDate ? 'rgba(79,209,255,0.12)' : 'var(--tt-surface)', border: `1px solid ${schedDate ? 'rgba(79,209,255,0.35)' : 'var(--tt-border)'}`, color: schedDate ? 'var(--tt-accent)' : 'var(--tt-text-faint)', fontFamily: 'monospace', fontSize: 11, cursor: schedDate ? 'pointer' : 'default' }}>
            Set
          </button>
        </div>
        {schedDone && <span style={{ fontSize: 10, color: '#4ade80' }}>✓ Scheduled for {schedDone}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schedule Manager panel
// ---------------------------------------------------------------------------

function ScheduleManager({ subs, onChange }: { subs: Submission[]; onChange: () => void }) {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    loadSchedule().then(rows => { setSchedule(rows); setLoading(false); });
  };

  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nameFor = (puzzleId: string) => subs.find(s => s.id === puzzleId)?.name ?? puzzleId;

  const remove = async (date: string) => { await removeScheduleDate(date); reload(); onChange(); };

  return (
    <div style={{ background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', borderRadius: 8, padding: 16, marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tt-text)', letterSpacing: '0.06em' }}>DAILY SCHEDULE</span>
        <span style={{ fontSize: 10, color: 'var(--tt-text-faint)' }}>next 14 days</span>
        <button onClick={reload} style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 4, background: 'var(--tt-surface-hover)', border: '1px solid var(--tt-border)', color: 'var(--tt-text-muted)', fontFamily: 'monospace', fontSize: 10, cursor: 'pointer' }}>↻</button>
      </div>
      {loading ? (
        <p style={{ fontSize: 11, color: 'var(--tt-text-faint)', margin: 0 }}>Loading…</p>
      ) : schedule.length === 0 ? (
        <p style={{ fontSize: 11, color: 'var(--tt-text-faint)', margin: 0 }}>No puzzles scheduled — pick a puzzle below and set a date.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {schedule.map(row => (
            <div key={row.date} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--tt-accent)', fontFamily: 'monospace', minWidth: 90 }}>{row.date}</span>
              <span style={{ fontSize: 11, color: 'var(--tt-text)', flex: 1 }}>{nameFor(row.puzzle_id)}</span>
              <Link href={`/puzzle/${row.puzzle_id}`} target="_blank" style={{ fontSize: 10, color: 'var(--tt-text-muted)', textDecoration: 'none' }}>Play →</Link>
              <button onClick={() => remove(row.date)} style={{ fontSize: 10, padding: '1px 7px', borderRadius: 3, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', cursor: 'pointer', fontFamily: 'monospace' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type ReviewTab = 'submissions' | 'queue';
type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

const TAB_BTN = (active: boolean): React.CSSProperties => ({
  padding: '7px 18px', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, cursor: 'pointer',
  background: active ? 'var(--tt-surface-hover)' : 'transparent',
  border: active ? '1px solid var(--tt-border-strong)' : '1px solid transparent',
  color: active ? 'var(--tt-text)' : 'var(--tt-text-muted)',
  fontWeight: active ? 700 : 400,
});

export default function PuzzleReviewPage() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ReviewTab>('submissions');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [scheduleKey, setScheduleKey] = useState(0);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('puzzle_submissions').select('*').order('created_at', { ascending: false });
    setSubs((data as Submission[]) ?? []);
    setLoading(false);
  };

  const approvedSubs = subs.filter(s => s.status === 'approved');
  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter);
  const counts = {
    pending: subs.filter(s => s.status === 'pending').length,
    approved: subs.filter(s => s.status === 'approved').length,
    rejected: subs.filter(s => s.status === 'rejected').length,
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', fontFamily: 'monospace', color: 'var(--tt-text)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Link href="/puzzle" style={{ color: 'var(--tt-text-faint)', textDecoration: 'none', fontSize: 12 }}>← Puzzles</Link>
          <span style={{ color: 'var(--tt-text-dim)' }}>|</span>
          <h1 style={{ color: 'var(--tt-text)', fontSize: 18, fontWeight: 700, margin: 0 }}>Puzzle Review</h1>
          {counts.pending > 0 && (
            <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>
              {counts.pending} pending
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--tt-border)', marginBottom: 24, paddingBottom: 0 }}>
          <button onClick={() => setActiveTab('submissions')} style={{ ...TAB_BTN(activeTab === 'submissions'), borderBottom: activeTab === 'submissions' ? '2px solid var(--tt-accent)' : '2px solid transparent', borderRadius: '6px 6px 0 0' }}>
            Submissions
            {counts.pending > 0 && activeTab !== 'submissions' && (
              <span style={{ marginLeft: 6, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', borderRadius: 8, padding: '0 5px', fontSize: 10 }}>{counts.pending}</span>
            )}
          </button>
          <button onClick={() => setActiveTab('queue')} style={{ ...TAB_BTN(activeTab === 'queue'), borderBottom: activeTab === 'queue' ? '2px solid var(--tt-accent)' : '2px solid transparent', borderRadius: '6px 6px 0 0' }}>
            Queue
            <span style={{ marginLeft: 6, color: 'var(--tt-text-dim)', fontSize: 10 }}>{counts.approved}</span>
          </button>
        </div>

        {/* ── Submissions tab ── */}
        {activeTab === 'submissions' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {(['pending','approved','rejected','all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '5px 12px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', background: filter === f ? 'var(--tt-surface-hover)' : 'var(--tt-surface)', border: filter === f ? '1px solid var(--tt-border-strong)' : '1px solid var(--tt-border)', color: filter === f ? 'var(--tt-text)' : 'var(--tt-text-muted)' }}>
                  {f} {f !== 'all' ? `(${counts[f as keyof typeof counts]})` : `(${subs.length})`}
                </button>
              ))}
              <button onClick={load} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 5, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer', background: 'var(--tt-surface)', border: '1px solid var(--tt-border)', color: 'var(--tt-text-muted)' }}>
                ↻ Refresh
              </button>
            </div>
            {loading ? (
              <p style={{ color: 'var(--tt-text-faint)', fontSize: 12 }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: 'var(--tt-text-faint)', fontSize: 12 }}>No {filter === 'all' ? '' : filter} submissions.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filtered.map(sub => <SubmissionCard key={sub.id} sub={sub} onUpdate={load} />)}
              </div>
            )}
          </>
        )}

        {/* ── Queue tab ── */}
        {activeTab === 'queue' && (
          <>
            <ScheduleManager key={scheduleKey} subs={approvedSubs} onChange={() => setScheduleKey(k => k + 1)} />
            {loading ? (
              <p style={{ color: 'var(--tt-text-faint)', fontSize: 12 }}>Loading…</p>
            ) : approvedSubs.length === 0 ? (
              <p style={{ color: 'var(--tt-text-faint)', fontSize: 12 }}>No approved puzzles yet — approve submissions on the Submissions tab first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {approvedSubs.map(sub => (
                  <QueueCard key={sub.id} sub={sub} onScheduleChange={() => setScheduleKey(k => k + 1)} />
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
