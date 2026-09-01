'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePost, useVote, TOPICS, type Chapter, type TextBlock } from './useStudy';
import TetrisGame from './TetrisGame';

// ── Board display (static) ───────────────────────────────────────────────────

const CELL_COLORS = [
  'transparent', '#38bdf8', '#fbbf24', '#a78bfa',
  '#4ade80',   '#f87171', '#60a5fa', '#fb923c',
];

const GHOST_COLORS = [
  'transparent',
  'rgba(56,189,248,0.25)', 'rgba(251,191,36,0.25)', 'rgba(167,139,250,0.25)',
  'rgba(74,222,128,0.25)', 'rgba(248,113,113,0.25)', 'rgba(96,165,250,0.25)', 'rgba(251,146,60,0.25)',
];

function cellBg(value: number, cellSize: number): string {
  if (value === 0) return 'rgba(255,255,255,0.04)';
  if (value >= 8) return GHOST_COLORS[value - 7] ?? 'transparent';
  return CELL_COLORS[value] ?? 'transparent';
}

type ActivePiece = { type: number; x: number; y: number; matrix: number[][] };

function overlayActivePiece(grid: number[][], activePiece?: ActivePiece | null): number[][] {
  if (!activePiece) return grid;
  const display = grid.map(row => [...row]);
  activePiece.matrix.forEach((row, pr) => {
    row.forEach((val, pc) => {
      if (!val) return;
      const r = activePiece.y + pr;
      const c = activePiece.x + pc;
      if (r >= 0 && r < display.length && c >= 0 && c < (display[0]?.length ?? 0)) {
        display[r][c] = activePiece.type;
      }
    });
  });
  return display;
}

function BoardGrid({
  grid, cellSize, label, labelColor,
}: {
  grid: number[][];
  cellSize: number;
  label?: string;
  labelColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {label && (
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 2,
          color: labelColor ?? 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(10, ${cellSize}px)`,
          gridTemplateRows: `repeat(20, ${cellSize}px)`,
          gap: 1,
          padding: 4,
          background: 'rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          flexShrink: 0,
        }}
      >
        {grid.flatMap((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                width: cellSize,
                height: cellSize,
                background: cellBg(val, cellSize),
                borderRadius: 2,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Piece icons ──────────────────────────────────────────────────────────────

export const PIECE_COLORS: Record<string, string> = {
  I: '#38bdf8', O: '#fbbf24', T: '#a78bfa',
  S: '#4ade80', Z: '#f87171', L: '#60a5fa', J: '#fb923c',
};

const PIECE_SHAPES: Record<string, number[][]> = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  L: [[0,0,1],[1,1,1]],
  J: [[1,0,0],[1,1,1]],
};

export function PieceIcon({ letter, size = 6 }: { letter: string; size?: number }) {
  const shape = PIECE_SHAPES[letter.toUpperCase()];
  const color = PIECE_COLORS[letter.toUpperCase()];
  if (!shape || !color) return null;
  const GAP = 1;
  const cols = shape[0].length;
  const rows = shape.length;
  const w = cols * size + (cols - 1) * GAP;
  const h = rows * size + (rows - 1) * GAP;
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 3px', flexShrink: 0 }}
      aria-label={`${letter.toUpperCase()} piece`}
    >
      {shape.flatMap((row, r) =>
        row.map((val, c) =>
          val ? (
            <rect
              key={`${r}-${c}`}
              x={c * (size + GAP)} y={r * (size + GAP)}
              width={size} height={size}
              rx={1} fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

function renderWithPieces(text: string): React.ReactNode {
  const parts = text.split(/(\[[IOTSZLJ]\])/gi);
  return parts.map((part, i) => {
    const m = part.match(/^\[([IOTSZLJ])\]$/i);
    if (m) {
      const letter = m[1].toUpperCase();
      if (PIECE_COLORS[letter]) {
        return <PieceIcon key={i} letter={letter} size={7} />;
      }
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

// ── Text rendering ───────────────────────────────────────────────────────────

const PROSE_FONT = `'Inter', system-ui, -apple-system, sans-serif`;

function BlockRenderer({ block }: { block: TextBlock }) {
  if (block.type === 'heading') {
    const isH2 = block.level === 2;
    const Tag = isH2 ? 'h2' : 'h3';
    return (
      <Tag style={{
        margin: isH2 ? '20px 0 8px' : '14px 0 4px',
        fontSize: isH2 ? 16 : 13.5,
        fontWeight: isH2 ? 700 : 600,
        fontFamily: PROSE_FONT,
        color: isH2 ? '#f1f5f9' : '#cbd5e1',
        letterSpacing: isH2 ? -0.3 : 0,
        borderBottom: isH2 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        paddingBottom: isH2 ? 6 : 0,
        lineHeight: 1.3,
      }}>
        {renderWithPieces(block.text)}
      </Tag>
    );
  }
  if (block.type === 'paragraph') {
    return (
      <p style={{
        margin: '0 0 12px', lineHeight: 1.78,
        color: 'rgba(255,255,255,0.78)', fontSize: 13.5,
        fontFamily: PROSE_FONT,
      }}>
        {renderWithPieces(block.text)}
      </p>
    );
  }
  if (block.type === 'tip') {
    return (
      <div style={{
        margin: '10px 0', padding: '10px 12px',
        borderLeft: '3px solid var(--tt-accent, #38bdf8)',
        background: 'rgba(56,189,248,0.07)',
        borderRadius: '0 6px 6px 0',
        fontSize: 13, lineHeight: 1.7,
        color: 'rgba(255,255,255,0.85)',
        fontFamily: PROSE_FONT,
      }}>
        {renderWithPieces(block.text)}
      </div>
    );
  }
  if (block.type === 'image') {
    return (
      <div style={{ margin: '8px 0' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.url} alt={block.caption}
          style={{ maxWidth: '100%', borderRadius: 4, display: 'block' }}
        />
        {block.caption && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
            {block.caption}
          </div>
        )}
      </div>
    );
  }
  return null;
}

// ── Board area: static preview + "Play from here" ───────────────────────────

function ChapterBoardArea({ chapter }: { chapter: Chapter }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const centerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(22);
  const boardTypeRef = useRef(chapter.boardType);
  boardTypeRef.current = chapter.boardType;

  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;

    function compute() {
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const numBoards = boardTypeRef.current === 'single' ? 1 : 2;
      const gap = numBoards > 1 ? 14 : 0;
      // padding (72px top+bottom) + button+gap (~56px) = ~128px reserved
      const availW = width - 32;
      const availH = height - 128;
      const byW = Math.floor((availW - gap) / (numBoards * 10));
      const byH = Math.floor(availH / 20);
      setCellSize(Math.max(14, Math.min(byW, byH, 38)));
    }

    compute();
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!centerRef.current) return;
    const { width, height } = centerRef.current.getBoundingClientRect();
    const numBoards = chapter.boardType === 'single' ? 1 : 2;
    const gap = numBoards > 1 ? 14 : 0;
    const availW = width - 32;
    const availH = height - 128;
    const byW = Math.floor((availW - gap) / (numBoards * 10));
    const byH = Math.floor(availH / 20);
    setCellSize(Math.max(14, Math.min(byW, byH, 38)));
  }, [chapter.boardType]);

  const isSingle = chapter.boardType === 'single';

  const restartPlay = () => {
    setPlayKey((k) => k + 1);
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Play toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setIsPlaying(false)}
            style={{
              padding: '4px 10px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}
          >
            ← Back to position
          </button>
          <button
            onClick={restartPlay}
            style={{
              padding: '4px 10px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}
          >
            🔄 Restart
          </button>
        </div>

        {/* Live game */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: 8,
        }}>
          <TetrisGame
            key={`study-viewer-${chapter.id}-${playKey}`}
            mode="practice"
            onMenu={() => setIsPlaying(false)}
            initialBoard={chapter.board.map((row) => row.map((v) => (v >= 8 ? 0 : v)))}
            initialNextPieces={chapter.nextPieces}
            initialHoldPiece={chapter.holdPiece}
            initialActivePiece={chapter.activePiece}
          />
        </div>
      </div>
    );
  }

  // Static board preview
  return (
    <div
      ref={centerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        overflow: 'hidden',
        padding: '48px 16px 24px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <BoardGrid
          grid={overlayActivePiece(chapter.board, chapter.activePiece)}
          cellSize={cellSize}
          label={!isSingle ? (chapter.boardType === 'coop' ? 'Co-op A' : 'Player 1') : undefined}
          labelColor="#38bdf8"
        />
        {!isSingle && (
          <BoardGrid
            grid={overlayActivePiece(chapter.board2, chapter.activePiece2)}
            cellSize={cellSize}
            label={chapter.boardType === 'coop' ? 'Co-op B' : 'Player 2'}
            labelColor="#a78bfa"
          />
        )}
      </div>

      {/* Play from here button */}
      <button
        onClick={() => setIsPlaying(true)}
        style={{
          padding: '8px 20px', borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.06)',
          color: '#e2e8f0',
          fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', outline: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
      >
        <span style={{ fontSize: 16 }}>▶</span> Play from here
      </button>
    </div>
  );
}

// ── Main viewer ──────────────────────────────────────────────────────────────

function getAnonId(): string {
  try {
    let id = localStorage.getItem('anon-session-id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('anon-session-id', id); }
    return id;
  } catch { return 'anon'; }
}

export default function StudyPostPage({ id }: { id: string }) {
  const { post, loading, error } = usePost(id);
  const [activeIdx, setActiveIdx] = useState(0);
  const [voteCount, setVoteCount] = useState(0);
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => { setAnonId(getAnonId()); }, []);

  const { voted, toggle: toggleVote } = useVote(id, anonId);

  useEffect(() => {
    if (post) setVoteCount(post.vote_count);
  }, [post]);

  const chapters: Chapter[] = post?.content ?? [];
  const safeIdx = Math.min(activeIdx, Math.max(0, chapters.length - 1));
  const activeChapter: Chapter | undefined = chapters[safeIdx];
  const totalChapters = chapters.length;


  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: 12 }}>Loading…</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12 }}>
          {error ?? 'Study not found.'}
        </div>
      </div>
    );
  }

  const topicMeta = TOPICS.find((t) => t.id === post.topic);

  const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0',
    }}>

      {/* ── Left panel ── */}
      <div style={{
        width: 270, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        {/* Study info */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link href="/study" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: 0.5 }}>
            ← All studies
          </Link>

          {/* Topic badge */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {topicMeta && (
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                padding: '3px 8px', borderRadius: 4,
                background: `${topicMeta.color}28`,
                border: `1px solid ${topicMeta.color}55`,
                color: topicMeta.color, textTransform: 'uppercase',
              }}>
                {topicMeta.label}
              </span>
            )}
            {!post.is_public && (
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>🔒 Private</span>
            )}
          </div>

          {/* Title */}
          <div style={{ marginTop: 8, fontSize: 20, fontWeight: 800, lineHeight: 1.25, color: '#f1f5f9', letterSpacing: -0.3 }}>
            {post.title}
          </div>

          {/* Summary */}
          {post.summary && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              {post.summary}
            </div>
          )}

          {/* Author + time */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tt-accent, #38bdf8)' }}>
              {post.author_username ?? 'Anonymous'}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{relativeTime(post.created_at)}</span>
          </div>
        </div>

        {/* Chapter list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{
            padding: '10px 16px 5px',
            fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
          }}>
            {totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'}
          </div>
          {chapters.map((ch, i) => (
            <div
              key={ch.id}
              onClick={() => setActiveIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px 8px 16px',
                background: safeIdx === i ? 'rgba(255,255,255,0.07)' : 'transparent',
                borderLeft: safeIdx === i
                  ? '2px solid var(--tt-accent, #38bdf8)'
                  : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 16, flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{
                fontSize: 12, lineHeight: 1.3,
                color: safeIdx === i ? '#e2e8f0' : 'rgba(255,255,255,0.5)',
              }}>
                {ch.title || 'Untitled'}
              </span>
              {ch.boardType !== 'single' && (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', flexShrink: 0 }}>
                  {ch.boardType === 'coop' ? 'Co-op' : '2v2'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => toggleVote(voteCount, setVoteCount)}
            style={{
              padding: '5px 0', borderRadius: 4,
              border: `1px solid ${voted ? 'var(--tt-accent, #38bdf8)' : 'rgba(255,255,255,0.12)'}`,
              background: voted ? 'rgba(56,189,248,0.12)' : 'transparent',
              color: voted ? 'var(--tt-accent, #38bdf8)' : 'rgba(255,255,255,0.5)',
              fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}
            title={voted ? 'Remove vote' : 'Upvote'}
          >
            ♥ {voteCount}
          </button>
        </div>
      </div>

      {/* ── Center panel (board + play) ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'rgba(0,0,0,0.15)',
      }}>
        {activeChapter ? (
          <>
            <ChapterBoardArea
              key={`board-${activeChapter.id}`}
              chapter={activeChapter}
            />

            {/* Chapter navigation */}
            <div style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 16, padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button
                onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
                disabled={safeIdx === 0}
                style={{
                  padding: '5px 14px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: safeIdx === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'monospace', fontSize: 12,
                  cursor: safeIdx === 0 ? 'default' : 'pointer', outline: 'none',
                }}
              >
                ←
              </button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', minWidth: 60, textAlign: 'center' }}>
                {safeIdx + 1} / {totalChapters}
              </span>
              <button
                onClick={() => setActiveIdx((i) => Math.min(totalChapters - 1, i + 1))}
                disabled={safeIdx >= totalChapters - 1}
                style={{
                  padding: '5px 14px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: safeIdx >= totalChapters - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'monospace', fontSize: 12,
                  cursor: safeIdx >= totalChapters - 1 ? 'default' : 'pointer', outline: 'none',
                }}
              >
                →
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No chapters</div>
          </div>
        )}
      </div>

      {/* ── Right panel (text) ── */}
      <div style={{
        width: 300, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}>
        {activeChapter ? (
          <>
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                Chapter {safeIdx + 1}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>
                {activeChapter.title || 'Untitled'}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
              {activeChapter.blocks.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontStyle: 'italic' }}>
                  No notes for this chapter.
                </div>
              ) : (
                activeChapter.blocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>No content</div>
          </div>
        )}
      </div>
    </div>
  );
}
