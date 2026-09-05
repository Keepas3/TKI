'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchCommunityPuzzles, fetchMyVotes, voteForPuzzle, unvoteForPuzzle,
  DIFFICULTY_COLORS, PIECE_COLORS, PIECE_NAMES,
  type CommunityPuzzle, type PuzzleDifficulty,
} from './puzzleData';
import { useAuth } from './useAuth';

function getVoterFingerprint(): string {
  const KEY = 'tki-voter-id';
  let id = localStorage.getItem(KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
  return id;
}

const CATEGORY_LABELS: Record<string, string> = {
  opening: 'Opening', middlegame: 'Middlegame', finisher: 'Finisher', survival: 'Survival',
};

function BoardPreview({ board }: { board: number[][] }) {
  const CELL = 4;
  const PAD = 2;
  const w = 10 * CELL + PAD * 2;
  const h = 20 * CELL + PAD * 2;
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.4)" rx={2} />
      {board.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={PAD + c * CELL} y={PAD + r * CELL}
              width={CELL - 1} height={CELL - 1}
              fill={PIECE_COLORS[cell] ?? '#0ea5e9'} rx={0.5}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function VoteButton({ puzzleId, count, voted, onVote }: {
  puzzleId: string; count: number; voted: boolean; onVote: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onVote(puzzleId)}
      title={voted ? 'Remove vote' : 'Vote for this puzzle'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
        fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
        background: voted ? 'color-mix(in srgb, var(--tt-accent) 18%, transparent)' : 'transparent',
        border: `1px solid ${voted ? 'color-mix(in srgb, var(--tt-accent) 55%, transparent)' : 'var(--tt-border)'}`,
        color: voted ? 'var(--tt-accent)' : 'var(--tt-text-faint)',
      }}
    >
      <span style={{ fontSize: 12 }}>{voted ? '▲' : '△'}</span>
      {count}
    </button>
  );
}

function PuzzleCard({ puzzle, voted, voteCount, onVote }: {
  puzzle: CommunityPuzzle;
  voted: boolean;
  voteCount: number;
  onVote: (id: string) => void;
}) {
  const diffColor = DIFFICULTY_COLORS[puzzle.difficulty];
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: 12,
      background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
      borderRadius: 8, padding: '10px 14px',
      position: 'relative',
    }}>
      {puzzle.featured && (
        <div style={{
          position: 'absolute', top: -1, right: 12,
          fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase',
          background: 'var(--tt-accent)', color: '#000',
          borderRadius: '0 0 4px 4px', padding: '2px 7px', fontFamily: 'monospace', fontWeight: 700,
        }}>
          Featured
        </div>
      )}

      <Link href={`/puzzle/${puzzle.submissionId}`} style={{ display: 'block', flexShrink: 0, textDecoration: 'none' }}>
        <BoardPreview board={puzzle.board} />
      </Link>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Link
            href={`/puzzle/${puzzle.submissionId}`}
            style={{ color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
          >
            {puzzle.name}
          </Link>
          <span style={{
            fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: diffColor, fontFamily: 'monospace', fontWeight: 700,
          }}>
            {puzzle.difficulty}
          </span>
          <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', fontFamily: 'monospace' }}>
            {CATEGORY_LABELS[puzzle.category] ?? puzzle.category}
          </span>
        </div>

        {puzzle.description && (
          <span style={{ fontSize: 11, color: 'var(--tt-text-muted)', fontFamily: 'monospace', lineHeight: 1.4 }}>
            {puzzle.description}
          </span>
        )}

        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
          {puzzle.queue.slice(0, 10).map((t, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, borderRadius: 3, flexShrink: 0,
              background: PIECE_COLORS[t] ?? '#555',
              color: '#000', fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
            }}>
              {PIECE_NAMES[t]}
            </span>
          ))}
          {puzzle.queue.length > 10 && (
            <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', alignSelf: 'center' }}>
              +{puzzle.queue.length - 10}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
          <VoteButton puzzleId={puzzle.submissionId} count={voteCount} voted={voted} onVote={onVote} />
          {puzzle.authorUsername && (
            <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', fontFamily: 'monospace' }}>
              by {puzzle.authorUsername}
            </span>
          )}
          <Link
            href={`/puzzle/${puzzle.submissionId}`}
            style={{
              marginLeft: 'auto', fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
              color: 'var(--tt-accent)', textDecoration: 'none', letterSpacing: '0.04em',
            }}
          >
            Solve →
          </Link>
        </div>
      </div>
    </div>
  );
}

type SortMode = 'votes' | 'newest';
type DiffFilter = PuzzleDifficulty | 'all';

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
        fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.04em',
        background: active ? 'var(--tt-accent)' : 'transparent',
        border: `1px solid ${active ? 'var(--tt-accent)' : 'var(--tt-border)'}`,
        color: active ? '#000' : 'var(--tt-text-muted)',
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
      }}
    >
      {label}
    </button>
  );
}

export default function CommunityHub() {
  const { isAdmin } = useAuth();
  const [puzzles, setPuzzles] = useState<CommunityPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [voteCounts, setVoteCounts] = useState<Map<string, number>>(new Map());
  const [diff, setDiff] = useState<DiffFilter>('all');
  const [sort, setSort] = useState<SortMode>('votes');
  const fpRef = useRef('');

  useEffect(() => {
    fpRef.current = getVoterFingerprint();
    Promise.all([
      fetchCommunityPuzzles(),
      fetchMyVotes(fpRef.current),
    ]).then(([ps, myVotes]) => {
      setPuzzles(ps);
      setVotedIds(myVotes);
      const cm = new Map<string, number>();
      for (const p of ps) cm.set(p.submissionId, p.voteCount);
      setVoteCounts(cm);
      setLoading(false);
    });
  }, []);

  const handleVote = async (id: string) => {
    const fp = fpRef.current;
    if (!fp) return;
    const voted = votedIds.has(id);
    setVotedIds(prev => {
      const next = new Set(prev);
      voted ? next.delete(id) : next.add(id);
      return next;
    });
    setVoteCounts(prev => {
      const next = new Map(prev);
      next.set(id, Math.max(0, (prev.get(id) ?? 0) + (voted ? -1 : 1)));
      return next;
    });
    if (voted) await unvoteForPuzzle(id, fp);
    else await voteForPuzzle(id, fp);
  };

  const filtered = puzzles
    .filter(p => diff === 'all' || p.difficulty === diff)
    .sort((a, b) => {
      if (sort === 'votes') {
        const vDiff = (voteCounts.get(b.submissionId) ?? 0) - (voteCounts.get(a.submissionId) ?? 0);
        if (vDiff !== 0) return vDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px 60px', fontFamily: 'monospace' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
          <h1 style={{ color: 'var(--tt-text)', fontSize: 22, fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>
            Community
          </h1>
          <span style={{
            fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--tt-accent)', fontWeight: 700,
          }}>
            Puzzles
          </span>
        </div>
        <p style={{ color: 'var(--tt-text-muted)', fontSize: 12, margin: '0 0 16px' }}>
          Player-created Perfect Clear setups. Vote for your favourites.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link
            href="/puzzle/editor"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 14px', borderRadius: 20,
              background: 'var(--tt-accent)', color: '#000',
              fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
              textDecoration: 'none', letterSpacing: '0.04em',
            }}
          >
            + Create Puzzle
          </Link>
          <Link
            href="/puzzle"
            style={{
              fontSize: 11, color: 'var(--tt-text-faint)', textDecoration: 'none',
              fontFamily: 'monospace', padding: '5px 10px',
            }}
          >
            ← Curated
          </Link>
          {isAdmin && (
            <Link
              href="/puzzle/review"
              style={{
                fontSize: 11, color: 'var(--tt-text-faint)', textDecoration: 'none',
                fontFamily: 'monospace', padding: '5px 10px',
                border: '1px solid var(--tt-border)', borderRadius: 20,
              }}
            >
              ⚑ Review
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
            <FilterChip
              key={d}
              label={d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
              active={diff === d}
              onClick={() => setDiff(d)}
            />
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 5 }}>
          <FilterChip label="Top" active={sort === 'votes'} onClick={() => setSort('votes')} />
          <FilterChip label="New" active={sort === 'newest'} onClick={() => setSort('newest')} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--tt-text-faint)', fontSize: 12, textAlign: 'center', padding: '60px 0' }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--tt-text-faint)', fontSize: 13, lineHeight: 1.8 }}>
          {puzzles.length === 0
            ? <>No community puzzles yet.<br />Be the first to submit one!</>
            : 'No puzzles match this filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <PuzzleCard
              key={p.submissionId}
              puzzle={p}
              voted={votedIds.has(p.submissionId)}
              voteCount={voteCounts.get(p.submissionId) ?? 0}
              onVote={handleVote}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--tt-border)', fontSize: 11, color: 'var(--tt-text-faint)', lineHeight: 1.7 }}>
        Submissions are reviewed before appearing here. Featured puzzles may be promoted to the curated list.
      </div>
    </div>
  );
}
