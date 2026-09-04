'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TOPICS, BOARD_TYPES, newChapter, newTextBlock, savePost, addOwnedPostId,
  type Chapter, type Topic, type BoardType, type TextBlock,
} from './useStudy';
import BlockGame from './BlockGame';
import { PieceIcon, PIECE_COLORS as PIECE_ICON_COLORS } from './StudyPostPage';

// ── Color maps ───────────────────────────────────────────────────────────────

const PIECE_COLORS = [
  'transparent',
  '#38bdf8', '#fbbf24', '#a78bfa',
  '#4ade80', '#f87171', '#60a5fa', '#fb923c',
];

const GHOST_COLORS = [
  'transparent',
  'rgba(56,189,248,0.25)', 'rgba(251,191,36,0.25)', 'rgba(167,139,250,0.25)',
  'rgba(74,222,128,0.25)', 'rgba(248,113,113,0.25)', 'rgba(96,165,250,0.25)', 'rgba(251,146,60,0.25)',
];

function cellColor(value: number): string {
  if (value === 0) return 'transparent';
  if (value >= 8) return GHOST_COLORS[value - 7] ?? 'transparent';
  return PIECE_COLORS[value] ?? 'transparent';
}

// ── Frozen preview ───────────────────────────────────────────────────────────

type ActivePiece = { type: number; x: number; y: number; matrix: number[][] };

function FrozenPreview({ board, activePiece }: { board: number[][]; activePiece?: ActivePiece | null }) {
  const CELL = 17;
  const COLS = board[0]?.length ?? 10;
  const ROWS = board.length;

  // Build display grid: board cells + active piece overlay (for visual only)
  const display = board.map((row) => [...row]);
  if (activePiece) {
    for (let pr = 0; pr < activePiece.matrix.length; pr++) {
      for (let pc = 0; pc < activePiece.matrix[pr].length; pc++) {
        if (!activePiece.matrix[pr][pc]) continue;
        const r = activePiece.y + pr;
        const c = activePiece.x + pc;
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) display[r][c] = activePiece.type;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
        Frozen
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`,
        gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`,
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 2,
        overflow: 'hidden',
        background: '#0a0a0f',
      }}>
        {display.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              style={{
                width: CELL, height: CELL,
                background: cellColor(val),
                boxSizing: 'border-box',
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Shared style tokens ──────────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'var(--tt-text-faint)', cursor: 'pointer',
  fontSize: 11, padding: '1px 3px', borderRadius: 2,
  flexShrink: 0,
};

const smallBtnStyle: React.CSSProperties = {
  padding: '5px 0', borderRadius: 4,
  border: '1px solid var(--tt-border)',
  background: 'transparent',
  color: 'var(--tt-text-muted)',
  fontFamily: 'monospace', fontSize: 10,
  cursor: 'pointer', outline: 'none',
  textAlign: 'center' as const,
};

// ── Text block editor ────────────────────────────────────────────────────────

function PieceInsertBar({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {Object.keys(PIECE_ICON_COLORS).map((letter) => {
        const color = PIECE_ICON_COLORS[letter as keyof typeof PIECE_ICON_COLORS];
        return (
          <button
            key={letter}
            onMouseDown={(e) => { e.preventDefault(); onInsert(`[${letter}]`); }}
            title={`Insert ${letter}-piece`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '3px 6px', borderRadius: 4,
              border: `1px solid ${color}44`, background: `${color}14`,
              cursor: 'pointer', outline: 'none',
              gap: 4,
            }}
          >
            <PieceIcon letter={letter} size={5} />
          </button>
        );
      })}
      <span style={{ fontSize: 9, color: 'var(--tt-text-dim)', marginLeft: 2, fontFamily: 'monospace' }}>insert piece</span>
    </div>
  );
}

function TextBlockEditor({
  block, onChange, onDelete, onMoveUp, onMoveDown,
}: {
  block: TextBlock;
  onChange: (b: TextBlock) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(token: string) {
    const el = block.type === 'heading'
      ? inputRef.current as HTMLInputElement | HTMLTextAreaElement | null
      : textareaRef.current;
    if (!el) {
      if (block.type !== 'image') onChange({ ...block, text: block.text + token });
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const newText = el.value.slice(0, start) + token + el.value.slice(end);
    if (block.type !== 'image') onChange({ ...block, text: newText });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  }

  const baseStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '6px 8px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4, color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 12,
    resize: 'vertical' as const, outline: 'none',
  };

  let editor: React.ReactNode;
  if (block.type === 'paragraph') {
    editor = (
      <>
        <PieceInsertBar onInsert={insertAtCursor} />
        <textarea
          ref={textareaRef}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Write your text here…"
          rows={3}
          style={baseStyle}
        />
      </>
    );
  } else if (block.type === 'heading') {
    editor = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <PieceInsertBar onInsert={insertAtCursor} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => onChange({ ...block, level: block.level === 2 ? 3 : 2 })}
            style={{
              padding: '4px 8px', background: 'var(--tt-surface-hover)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
              color: 'var(--tt-text)', fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            H{block.level}
          </button>
          <input
            ref={inputRef}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Heading text…"
            style={{ ...baseStyle, resize: 'none' as const }}
          />
        </div>
      </div>
    );
  } else if (block.type === 'tip') {
    editor = (
      <>
        <PieceInsertBar onInsert={insertAtCursor} />
        <textarea
          ref={textareaRef}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Key insight or tip…"
          rows={2}
          style={{
            ...baseStyle,
            borderLeft: '3px solid var(--tt-accent, #38bdf8)',
            background: 'rgba(56,189,248,0.08)',
          }}
        />
      </>
    );
  } else {
    editor = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="Image URL…"
          style={{ ...baseStyle, resize: 'none' as const }}
        />
        <input
          value={block.caption}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Caption (optional)…"
          style={{ ...baseStyle, resize: 'none' as const, fontSize: 11 }}
        />
        {block.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.url} alt={block.caption}
            style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 4 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
      </div>
    );
  }

  const typeLabel = block.type === 'paragraph' ? '¶'
    : block.type === 'heading' ? `H${(block as Extract<TextBlock, { type: 'heading' }>).level}`
    : block.type === 'tip' ? '💡'
    : '🖼';

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '6px 0',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', paddingTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', width: 18, textAlign: 'center' }}>
          {typeLabel}
        </span>
        {onMoveUp && <button onClick={onMoveUp} style={{ ...iconBtnStyle, fontSize: 9 }} title="Move up">▲</button>}
        {onMoveDown && <button onClick={onMoveDown} style={{ ...iconBtnStyle, fontSize: 9 }} title="Move down">▼</button>}
        <button onClick={onDelete} style={{ ...iconBtnStyle, color: '#f87171' }} title="Delete">✕</button>
      </div>
      <div style={{ flex: 1 }}>{editor}</div>
    </div>
  );
}

// ── Markdown ↔ TextBlock[] round-trip ───────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function blocksToMd(blocks: TextBlock[]): string {
  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': return `${'#'.repeat(b.level)} ${b.text}`;
      case 'tip':     return b.text.split('\n').map((l) => `> ${l}`).join('\n');
      case 'image':   return b.caption ? `![${b.url} | ${b.caption}]` : `![${b.url}]`;
      case 'paragraph': return b.text;
    }
  }).join('\n\n');
}

function mdToBlocks(md: string): TextBlock[] {
  const chunks = md.split(/\n{2,}/);
  const out: TextBlock[] = [];
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    if (chunk.startsWith('### ')) {
      out.push({ id: uid(), type: 'heading', level: 3, text: chunk.slice(4) });
    } else if (chunk.startsWith('## ')) {
      out.push({ id: uid(), type: 'heading', level: 2, text: chunk.slice(3) });
    } else if (chunk.startsWith('> ')) {
      const text = chunk.split('\n').map((l) => l.replace(/^> ?/, '')).join('\n');
      out.push({ id: uid(), type: 'tip', text });
    } else if (/^\!\[/.test(chunk)) {
      const inner = chunk.slice(2, chunk.lastIndexOf(']'));
      const sep = inner.indexOf(' | ');
      if (sep !== -1) {
        out.push({ id: uid(), type: 'image', url: inner.slice(0, sep).trim(), caption: inner.slice(sep + 3).trim() });
      } else {
        out.push({ id: uid(), type: 'image', url: inner.trim(), caption: '' });
      }
    } else {
      out.push({ id: uid(), type: 'paragraph', text: chunk });
    }
  }
  return out;
}

// ── Main editor ──────────────────────────────────────────────────────────────

interface StudyEditorPageProps {
  postId?: string;
  initialTitle?: string;
  initialTopic?: Topic;
  initialSummary?: string;
  initialChapters?: Chapter[];
  initialIsPublic?: boolean;
}

type LiveState = {
  board: number[][];
  pieceMatrix: number[][];
  pieceType: number;
  pieceX: number;
  pieceY: number;
  ghostY: number;
  nextPieces: number[];
  holdPiece: number | null;
};

// ── Publish modal ────────────────────────────────────────────────────────────

function PublishModal({
  initial, onConfirm, onCancel,
}: { initial: string; onConfirm: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = React.useState(initial);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: 'var(--tt-bg-elevated)', border: '1px solid var(--tt-border-strong)',
        borderRadius: 10, padding: '1.75rem 2rem', width: 340, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Publish study</h2>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--tt-text-muted)', lineHeight: 1.5 }}>
          Your name will appear on the study. Leave blank to publish anonymously.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={{ fontSize: 11, color: 'var(--tt-text-muted)', letterSpacing: '0.05em' }}>YOUR NAME</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(name); if (e.key === 'Escape') onCancel(); }}
            placeholder="e.g. OnionWings"
            maxLength={40}
            style={{
              background: 'var(--tt-surface)', border: '1px solid var(--tt-border-strong)',
              borderRadius: 6, padding: '0.5rem 0.75rem', color: '#fff',
              fontFamily: 'monospace', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.25rem' }}>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--tt-text-faint)', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '0.4rem 0.7rem' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name)}
            style={{
              background: 'var(--tt-accent)', border: 'none', borderRadius: 6,
              color: '#000', fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
              padding: '0.45rem 1.1rem', cursor: 'pointer',
            }}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Published success modal ──────────────────────────────────────────────────

function PublishedModal({ id, editToken, onClose }: { id: string; editToken: string; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const editUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/study/${id}/edit?token=${editToken}`
    : `/study/${id}/edit?token=${editToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(editUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--tt-bg-elevated)', border: '1px solid var(--tt-border-strong)',
        borderRadius: 10, padding: '1.75rem 2rem', width: 420, maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#4ade80' }}>Study published!</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--tt-text-muted)', lineHeight: 1.5 }}>
            Save this link to edit your study from any device. Anyone with the link can edit it.
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <div style={{
              flex: 1, padding: '0.4rem 0.6rem', borderRadius: 5,
              background: 'var(--tt-surface)', border: '1px solid var(--tt-border)',
              fontFamily: 'monospace', fontSize: 10, color: 'var(--tt-text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {editUrl}
            </div>
            <button
              onClick={copyLink}
              style={{
                flexShrink: 0, padding: '0.4rem 0.75rem', borderRadius: 5,
                background: copied ? '#4ade8033' : 'var(--tt-surface)',
                border: `1px solid ${copied ? '#4ade80' : 'var(--tt-border-strong)'}`,
                color: copied ? '#4ade80' : 'var(--tt-text-muted)',
                fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: 10, color: 'var(--tt-text-faint)', lineHeight: 1.4 }}>
            On this device, the Edit button will appear automatically on your study page.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--tt-text-faint)', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', padding: '0.4rem 0.7rem' }}
          >
            Continue editing
          </button>
          <a
            href={`/study/${id}`}
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'var(--tt-accent)', borderRadius: 6,
              color: '#000', fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
              padding: '0.45rem 1.1rem', textDecoration: 'none',
            }}
          >
            View study →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StudyEditorPage({
  postId,
  initialTitle = '',
  initialTopic = 'general',
  initialSummary = '',
  initialChapters,
  initialIsPublic = true,
}: StudyEditorPageProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [topic, setTopic] = useState<Topic>(initialTopic);
  const [summary, setSummary] = useState(initialSummary);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [chapters, setChapters] = useState<Chapter[]>(
    initialChapters?.length ? initialChapters : [newChapter('Introduction')]
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeBoard, setActiveBoard] = useState<1 | 2>(1);
  const [gameKey, setGameKey] = useState(0);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishedInfo, setPublishedInfo] = useState<{ id: string; token: string } | null>(null);
  const [authorName, setAuthorName] = useState(() => {
    try { return localStorage.getItem('study-author') ?? ''; } catch { return ''; }
  });
  const [frozenFlash, setFrozenFlash] = useState(false);

  // Freeze options
  const [includePiece, setIncludePiece] = useState(true);
  const [includeGhost, setIncludeGhost] = useState(true);

  // The live game state — updated every frame via the ref passed to BlockGame
  const liveStateRef = useRef<LiveState | null>(null);

  // Focus state: game only captures keys when the user has clicked into it
  const [gameFocused, setGameFocused] = useState(false);
  const focusRef = useRef<boolean>(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const safeIdx = Math.min(activeIdx, chapters.length - 1);
  const activeChapter = chapters[safeIdx];
  const isSingle = activeChapter.boardType === 'single';

  const frozenBoard = activeBoard === 1 ? activeChapter.board : activeChapter.board2;

  // Markdown editor state — lives here so safeIdx/activeChapter are available
  const [markdown, setMarkdown] = useState(() => blocksToMd(initialChapters?.[0]?.blocks ?? []));
  const mdTextareaRef = useRef<HTMLTextAreaElement>(null);
  const prevSafeIdxRef = useRef(0);

  // Re-derive markdown from blocks when switching chapters
  useEffect(() => {
    if (prevSafeIdxRef.current !== safeIdx) {
      prevSafeIdxRef.current = safeIdx;
      setMarkdown(blocksToMd(activeChapter.blocks));
    }
  }, [safeIdx, activeChapter.blocks]);

  // Blur game when user clicks outside the game area
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (gameAreaRef.current && !gameAreaRef.current.contains(e.target as Node)) {
        setGameFocused(false);
        focusRef.current = false;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    liveStateRef.current = null;
    setGameKey((k) => k + 1);
  }, [safeIdx, activeBoard]);

  useEffect(() => {
    if (activeChapter.boardType === 'single') setActiveBoard(1);
  }, [activeChapter.boardType]);

  const updateChapter = useCallback((idx: number, patch: Partial<Chapter>) => {
    setChapters((prev) => prev.map((ch, i) => i === idx ? { ...ch, ...patch } : ch));
  }, []);

  // Toolbar helpers — operate on the markdown textarea
  const applyMd = useCallback((newVal: string) => {
    setMarkdown(newVal);
    updateChapter(safeIdx, { blocks: mdToBlocks(newVal) });
  }, [safeIdx, updateChapter]);

  const insertPieceToken = useCallback((token: string) => {
    const el = mdTextareaRef.current;
    if (!el) { applyMd(markdown + token); return; }
    const s = el.selectionStart ?? el.value.length;
    const e2 = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, s) + token + el.value.slice(e2);
    applyMd(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); }, 0);
  }, [markdown, applyMd]);

  const applyLineFormat = useCallback((prefix: string) => {
    const el = mdTextareaRef.current;
    if (!el) return;
    const val = el.value;
    const cursor = el.selectionStart ?? 0;
    const lineStart = val.lastIndexOf('\n', cursor - 1) + 1;
    const lineEnd2 = val.indexOf('\n', cursor);
    const lineEnd = lineEnd2 === -1 ? val.length : lineEnd2;
    const line = val.slice(lineStart, lineEnd);
    const stripped = line.replace(/^(#{2,3} |> )/, '');
    const newLine = line.startsWith(prefix) ? stripped : prefix + stripped;
    const next = val.slice(0, lineStart) + newLine + val.slice(lineEnd);
    applyMd(next);
    const delta = newLine.length - line.length;
    setTimeout(() => { el.focus(); const c = Math.max(lineStart, cursor + delta); el.setSelectionRange(c, c); }, 0);
  }, [applyMd]);

  const insertImageTemplate = useCallback(() => {
    const el = mdTextareaRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, pos);
    const after = el.value.slice(pos);
    const needsBefore = before.length > 0 && !before.endsWith('\n\n');
    const needsAfter = after.length > 0 && !after.startsWith('\n\n');
    const tpl = '![https:// | Image caption]';
    const insert = (needsBefore ? '\n\n' : '') + tpl + (needsAfter ? '\n\n' : '');
    const next = before + insert + after;
    applyMd(next);
    const urlStart = pos + (needsBefore ? 2 : 0) + 2;
    setTimeout(() => { el.focus(); el.setSelectionRange(urlStart, urlStart + 'https://'.length); }, 0);
  }, [applyMd]);

  const addChapter = () => {
    const idx = chapters.length;
    setChapters((prev) => [...prev, newChapter(`Chapter ${idx + 1}`)]);
    setActiveIdx(idx);
    setRenamingIdx(idx);
  };

  const deleteChapter = (idx: number) => {
    if (chapters.length === 1) return;
    setChapters((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((prev) => Math.min(prev, chapters.length - 2));
  };

  // Build the frozen board by compositing settled board + optional ghost.
  // The active piece is stored separately (not baked in) so viewers can
  // play from the exact position — it becomes their first live piece.
  const freezePosition = () => {
    const live = liveStateRef.current;
    if (!live) return;

    // Deep copy the settled board
    const frozen = live.board.map((r) => [...r]);
    const rows = frozen.length;
    const cols = frozen[0]?.length ?? 10;

    // Stamp ghost onto empty settled cells (informational, not interactive)
    if (includeGhost && live.ghostY !== live.pieceY) {
      for (let pr = 0; pr < live.pieceMatrix.length; pr++) {
        for (let pc = 0; pc < live.pieceMatrix[pr].length; pc++) {
          if (!live.pieceMatrix[pr][pc]) continue;
          const r = live.ghostY + pr;
          const c = live.pieceX + pc;
          if (r >= 0 && r < rows && c >= 0 && c < cols && frozen[r][c] === 0) {
            frozen[r][c] = live.pieceType + 7;
          }
        }
      }
    }

    // Active piece is stored separately — never baked into the board —
    // so it can be restored as the live piece for both editor and viewer.
    const savedPiece: ActivePiece | null = includePiece
      ? { type: live.pieceType, x: live.pieceX, y: live.pieceY, matrix: live.pieceMatrix.map((r) => [...r]) }
      : null;

    if (activeBoard === 1) {
      updateChapter(safeIdx, {
        board: frozen,
        nextPieces: live.nextPieces,
        holdPiece: live.holdPiece,
        activePiece: savedPiece,
      });
    } else {
      updateChapter(safeIdx, {
        board2: frozen,
        nextPieces2: live.nextPieces,
        holdPiece2: live.holdPiece,
        activePiece2: savedPiece,
      });
    }
    setFrozenFlash(true);
    setTimeout(() => setFrozenFlash(false), 1200);
  };

  const resetGame = () => {
    liveStateRef.current = null;
    setGameFocused(false);
    focusRef.current = false;
    setGameKey((k) => k + 1);
  };

  const handleSave = async () => {
    if (title.trim().length < 4) { setSaveError('Title must be at least 4 characters.'); return; }
    // New post: ask for author name first
    if (!postId) { setShowPublishModal(true); return; }
    // Editing existing post: save directly (author already set)
    setSaving(true);
    setSaveError(null);
    const result = await savePost(
      { title, topic, summary, chapters, is_public: isPublic },
      null, postId, authorName.trim() || 'Anonymous',
    );
    setSaving(false);
    if ('error' in result) { setSaveError(result.error); return; }
    router.push(`/study/${result.id}`);
  };

  const confirmPublish = async (name: string) => {
    const trimmed = name.trim();
    try { if (trimmed) localStorage.setItem('study-author', trimmed); } catch { /* ignore */ }
    setShowPublishModal(false);
    setSaving(true);
    setSaveError(null);
    const token = crypto.randomUUID();
    const result = await savePost(
      { title, topic, summary, chapters, is_public: isPublic },
      null, undefined, trimmed || 'Anonymous', token,
    );
    setSaving(false);
    if ('error' in result) { setSaveError(result.error); return; }
    addOwnedPostId(result.id);
    setPublishedInfo({ id: result.id, token });
  };

  const topicColor = TOPICS.find((t) => t.id === topic)?.color ?? '#94a3b8';

  return (
    <div style={{
      display: 'flex', height: '100%', overflow: 'hidden',
      fontFamily: 'monospace', fontSize: 13, color: 'var(--tt-text)',
    }}>

      {/* ── Publish modal ── */}
      {showPublishModal && (
        <PublishModal
          initial={authorName}
          onConfirm={confirmPublish}
          onCancel={() => setShowPublishModal(false)}
        />
      )}

      {/* ── Published success modal ── */}
      {publishedInfo && (
        <PublishedModal
          id={publishedInfo.id}
          editToken={publishedInfo.token}
          onClose={() => setPublishedInfo(null)}
        />
      )}

      {/* ── Left panel ── */}
      <div style={{
        width: 190, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--tt-border)',
        overflow: 'hidden',
      }}>
        {/* Study metadata */}
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--tt-text-faint)', marginBottom: 6, textTransform: 'uppercase' }}>
            {postId ? 'Edit Study' : 'New Study'}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Study title…"
            maxLength={120}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '5px 7px', marginBottom: 6,
              background: 'var(--tt-surface)',
              border: '1px solid var(--tt-border-strong)',
              borderRadius: 4, color: 'var(--tt-text)',
              fontFamily: 'monospace', fontSize: 12, outline: 'none',
            }}
          />
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as Topic)}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '4px 6px', marginBottom: 7,
              background: 'var(--tt-surface)',
              border: '1px solid var(--tt-border-strong)',
              borderRadius: 4, color: topicColor,
              fontFamily: 'monospace', fontSize: 11, outline: 'none',
            }}
          >
            {TOPICS.map((t) => (
              <option key={t.id} value={t.id} style={{ color: t.color, background: '#1a1a2e' }}>
                {t.label}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 5 }}>
            {([true, false] as const).map((pub) => (
              <button
                key={String(pub)}
                onClick={() => setIsPublic(pub)}
                style={{
                  flex: 1, padding: '3px 0', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: isPublic === pub ? 'var(--tt-surface-hover)' : 'transparent',
                  color: isPublic === pub ? '#e2e8f0' : 'rgba(255,255,255,0.35)',
                  fontFamily: 'monospace', fontSize: 10,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {pub ? '🌐 Public' : '🔒 Private'}
              </button>
            ))}
          </div>
        </div>

        {/* Board type selector */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.2, color: 'var(--tt-text-dim)', marginBottom: 5, textTransform: 'uppercase' }}>
            Display mode
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {BOARD_TYPES.map((bt) => (
              <button
                key={bt.id}
                onClick={() => updateChapter(safeIdx, { boardType: bt.id as BoardType })}
                title={bt.desc}
                style={{
                  flex: 1, padding: '3px 0',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4,
                  background: activeChapter.boardType === bt.id ? 'var(--tt-surface-hover)' : 'transparent',
                  color: activeChapter.boardType === bt.id ? '#e2e8f0' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'monospace', fontSize: 10,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {bt.label}
              </button>
            ))}
          </div>
          {!isSingle && (
            <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setActiveBoard(n)}
                  style={{
                    flex: 1, padding: '3px 0', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: activeBoard === n ? 'var(--tt-surface-hover)' : 'transparent',
                    color: activeBoard === n ? '#e2e8f0' : 'rgba(255,255,255,0.35)',
                    fontFamily: 'monospace', fontSize: 10,
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  Board {n}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chapter list */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '8px 12px 4px',
            fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
            color: 'var(--tt-text-faint)',
          }}>
            Chapters
          </div>
          {chapters.map((ch, i) => (
            <div
              key={ch.id}
              onClick={() => { setActiveIdx(i); setRenamingIdx(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 8px 6px 12px',
                background: safeIdx === i ? 'var(--tt-surface-hover)' : 'transparent',
                borderLeft: safeIdx === i
                  ? '2px solid var(--tt-accent, #38bdf8)'
                  : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--tt-text-faint)', width: 14, flexShrink: 0 }}>
                {i + 1}
              </span>
              {renamingIdx === i ? (
                <input
                  autoFocus
                  value={ch.title}
                  onChange={(e) => updateChapter(i, { title: e.target.value })}
                  onBlur={() => setRenamingIdx(null)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setRenamingIdx(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1, padding: '2px 4px',
                    background: 'var(--tt-surface-hover)',
                    border: '1px solid var(--tt-border-strong)',
                    borderRadius: 3, color: 'var(--tt-text)',
                    fontFamily: 'monospace', fontSize: 11, outline: 'none',
                  }}
                />
              ) : (
                <>
                  <span style={{
                    flex: 1, fontSize: 11,
                    color: safeIdx === i ? 'var(--tt-text)' : 'var(--tt-text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ch.title || 'Untitled'}
                  </span>
                  {safeIdx === i && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setRenamingIdx(i); }}
                        title="Rename"
                        style={iconBtnStyle}
                      >✎</button>
                      {chapters.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChapter(i); }}
                          title="Delete"
                          style={{ ...iconBtnStyle, color: '#f87171' }}
                        >✕</button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          ))}
          <button
            onClick={addChapter}
            style={{
              margin: '8px 12px', padding: '5px 0',
              background: 'transparent',
              border: '1px dashed var(--tt-border-strong)',
              borderRadius: 4, color: 'var(--tt-text-faint)',
              fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}
          >
            + Add chapter
          </button>
        </div>

        {/* Save */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--tt-border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {saveError && <div style={{ fontSize: 10, color: '#f87171', lineHeight: 1.4 }}>{saveError}</div>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '7px 0', borderRadius: 5,
              background: 'var(--tt-accent, #38bdf8)',
              border: 'none', color: '#000',
              fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
              cursor: saving ? 'wait' : 'pointer', outline: 'none',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : postId ? 'Save changes' : 'Publish study'}
          </button>
        </div>
      </div>

      {/* ── Center panel (live game) ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', background: 'rgba(0,0,0,0.2)',
      }}>
        {/* Freeze toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          borderBottom: '1px solid var(--tt-border)',
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 10, color: 'var(--tt-text-faint)', lineHeight: 1.4 }}>
            Play to set up your board, then freeze.
          </div>
          <div style={{ flex: 1 }} />

          {/* Include-piece toggle */}
          <button
            onClick={() => setIncludePiece((v) => !v)}
            title="Include the active falling piece in the frozen snapshot"
            style={{
              padding: '4px 9px', borderRadius: 4,
              border: `1px solid ${includePiece ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              background: includePiece ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: includePiece ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
              fontFamily: 'monospace', fontSize: 10,
              cursor: 'pointer', outline: 'none',
            }}
          >
            + piece
          </button>

          {/* Include-ghost toggle */}
          <button
            onClick={() => setIncludeGhost((v) => !v)}
            title="Include the ghost (landing preview) in the frozen snapshot"
            style={{
              padding: '4px 9px', borderRadius: 4,
              border: `1px solid ${includeGhost ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              background: includeGhost ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: includeGhost ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
              fontFamily: 'monospace', fontSize: 10,
              cursor: 'pointer', outline: 'none',
            }}
          >
            + ghost
          </button>

          <button
            onClick={resetGame}
            title="Reset game to frozen board"
            style={{
              padding: '5px 12px', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: 'var(--tt-text-muted)',
              fontFamily: 'monospace', fontSize: 11,
              cursor: 'pointer', outline: 'none',
            }}
          >
            🔄 Reset
          </button>
          <button
            onClick={freezePosition}
            title="Save current board position to this chapter"
            style={{
              padding: '5px 14px', borderRadius: 4,
              border: `1px solid ${frozenFlash ? '#4ade80' : 'rgba(255,255,255,0.2)'}`,
              background: frozenFlash ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
              color: frozenFlash ? '#4ade80' : '#e2e8f0',
              fontFamily: 'monospace', fontWeight: 700, fontSize: 12,
              cursor: 'pointer', outline: 'none',
              transition: 'all 0.15s',
            }}
          >
            {frozenFlash ? '✓ Frozen!' : '📸 Freeze position'}
          </button>
        </div>

        {/* Game + frozen preview */}
        <div
          ref={gameAreaRef}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto',
            padding: '8px',
            gap: 40,
          }}
        >
          {/* scale(1.2) expands the visual without growing the layout box, so add
              enough right margin to keep the frozen preview outside the overflow zone */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            {/* Game with click-to-focus overlay — scaled up 20% via CSS transform */}
            <div style={{ position: 'relative', flexShrink: 0, transform: 'scale(1.2)', transformOrigin: 'center center', margin: '60px 90px 60px 30px' }}>
              <BlockGame
                key={`study-editor-${safeIdx}-${activeBoard}-${gameKey}`}
                mode="practice"
                onMenu={resetGame}
                initialBoard={frozenBoard.map((row) => row.map((v) => (v >= 8 ? 0 : v)))}
                initialNextPieces={activeBoard === 1 ? activeChapter.nextPieces : activeChapter.nextPieces2}
                initialHoldPiece={activeBoard === 1 ? activeChapter.holdPiece : activeChapter.holdPiece2}
                initialActivePiece={activeBoard === 1 ? activeChapter.activePiece : activeChapter.activePiece2}
                liveStateRef={liveStateRef}
                focusRef={focusRef}
              />
              {/* Unfocused overlay — click to activate game controls */}
              {!gameFocused && (
                <div
                  onClick={() => { setGameFocused(true); focusRef.current = true; }}
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'rgba(0,0,0,0.55)',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ fontSize: 28, opacity: 0.7 }}>▶</div>
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.6)',
                    fontFamily: 'monospace', letterSpacing: 1,
                    textAlign: 'center', lineHeight: 1.5,
                  }}>
                    Click to focus<br />
                    <span style={{ fontSize: 9, opacity: 0.6 }}>Click outside to type</span>
                  </div>
                </div>
              )}
            </div>
            {(frozenBoard.some((row) => row.some((v) => v !== 0)) ||
              (activeBoard === 1 ? activeChapter.activePiece : activeChapter.activePiece2)) && (
              <div style={{ flexShrink: 0 }}>
                <FrozenPreview
                  board={frozenBoard}
                  activePiece={activeBoard === 1 ? activeChapter.activePiece : activeChapter.activePiece2}
                />
              </div>
            )}
          </div>
        </div>

        {/* Hint below game */}
        <div style={{
          padding: '6px 14px',
          borderTop: '1px solid var(--tt-border)',
          flexShrink: 0,
          fontSize: 10, color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
        }}>
          {!isSingle && `Editing Board ${activeBoard} — switch in the left panel to set up the other board.`}
          {isSingle && 'Freeze a position to save it. Reset to replay from the last frozen state.'}
        </div>
      </div>

      {/* ── Right panel (text blocks) ── */}
      <div style={{
        width: 300, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid var(--tt-border)',
        overflow: 'hidden',
      }}>
        {/* Chapter header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--tt-border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--tt-text-faint)', marginBottom: 5, textTransform: 'uppercase' }}>
            Chapter {safeIdx + 1}
          </div>
          <input
            value={activeChapter.title}
            onChange={(e) => updateChapter(safeIdx, { title: e.target.value })}
            placeholder="Chapter title…"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '4px 7px',
              background: 'var(--tt-surface)',
              border: '1px solid var(--tt-border)',
              borderRadius: 4, color: 'var(--tt-text)',
              fontFamily: 'monospace', fontSize: 12, outline: 'none', marginBottom: 6,
            }}
          />
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Study summary (shown on listing)…"
            maxLength={300}
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '4px 7px',
              background: 'var(--tt-surface)',
              border: '1px solid var(--tt-border)',
              borderRadius: 4, color: 'var(--tt-text-muted)',
              fontFamily: 'monospace', fontSize: 10,
              resize: 'none' as const, outline: 'none',
            }}
          />
        </div>

        {/* Toolbar + editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Formatting toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
            padding: '6px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            {/* Format buttons */}
            {([
              { label: 'H2', title: 'Section heading', prefix: '## ' },
              { label: 'H3', title: 'Sub-heading', prefix: '### ' },
            ] as const).map(({ label, title, prefix }) => (
              <button
                key={label}
                onMouseDown={(e) => { e.preventDefault(); applyLineFormat(prefix); }}
                title={title}
                style={{
                  padding: '2px 7px', borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'var(--tt-surface)',
                  color: 'var(--tt-text-muted)',
                  fontFamily: 'monospace', fontWeight: 700, fontSize: 10,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                {label}
              </button>
            ))}

            <button
              onMouseDown={(e) => { e.preventDefault(); applyLineFormat('> '); }}
              title="Tip / callout — highlighted box"
              style={{
                padding: '2px 8px', borderRadius: 3,
                border: '1px solid rgba(56,189,248,0.3)',
                background: 'rgba(56,189,248,0.08)',
                color: 'rgba(56,189,248,0.8)',
                fontFamily: 'monospace', fontSize: 10,
                cursor: 'pointer', outline: 'none',
              }}
            >
              💡 Tip
            </button>

            <button
              onMouseDown={(e) => { e.preventDefault(); insertImageTemplate(); }}
              title="Insert image"
              style={{
                padding: '2px 8px', borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--tt-text-muted)',
                fontFamily: 'monospace', fontSize: 10,
                cursor: 'pointer', outline: 'none',
              }}
            >
              🖼 Image
            </button>

            {/* Divider */}
            <div style={{ width: 1, height: 14, background: 'var(--tt-surface-hover)', margin: '0 2px', flexShrink: 0 }} />

            {/* Piece insert buttons */}
            <PieceInsertBar onInsert={insertPieceToken} />
          </div>

          {/* Main textarea */}
          <textarea
            ref={mdTextareaRef}
            value={markdown}
            onChange={(e) => applyMd(e.target.value)}
            placeholder={'Write your chapter notes here...\n\nUse the toolbar above to add headings, tips, images, and piece icons. Press Enter twice to start a new paragraph.'}
            style={{
              flex: 1, width: '100%', boxSizing: 'border-box',
              padding: '12px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--tt-text)',
              fontFamily: `'Inter', system-ui, sans-serif`,
              fontSize: 13, lineHeight: 1.75,
              resize: 'none', outline: 'none',
            }}
          />

          {/* Gentle hint */}
          <div style={{
            padding: '4px 12px 8px',
            fontSize: 9.5, color: 'var(--tt-text-dim)',
            fontFamily: 'monospace', flexShrink: 0,
          }}>
            Enter twice = new paragraph · toolbar buttons work on current line
          </div>
        </div>
      </div>
    </div>
  );
}
