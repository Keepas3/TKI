'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../app/utils/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Topic = 'opening' | '40l' | 'pc' | 'blitz' | 'combo' | 'general';
export type ViewType = 'all' | 'topic' | 'pending';
export type SortOrder = 'hot' | 'new';
export type BoardType = 'single' | '2v2' | 'coop';

export const TOPICS: { id: Topic; label: string; color: string; desc: string }[] = [
  { id: 'opening', label: 'Openings',      color: '#38bdf8', desc: 'First-piece setups & stacking patterns' },
  { id: '40l',     label: '40 Lines',      color: '#4ade80', desc: 'Sprint strategies to clear 40 lines fast' },
  { id: 'pc',      label: 'Perfect Clear', color: '#a78bfa', desc: 'PC setups, finishes & continuation paths' },
  { id: 'blitz',   label: 'Blitz',         color: '#f87171', desc: 'Scoring efficiently under the clock' },
  { id: 'combo',   label: 'Combos',        color: '#fbbf24', desc: 'Keeping chains alive & maximizing attacks' },
  { id: 'general', label: 'General',       color: '#94a3b8', desc: 'Fundamentals, tips & everything else' },
];

export const BOARD_TYPES: { id: BoardType; label: string; desc: string }[] = [
  { id: 'single', label: 'Single',   desc: 'Standard 1-player board' },
  { id: '2v2',    label: '2v2',      desc: 'Two boards side-by-side (vs)' },
  { id: 'coop',   label: 'Co-op',    desc: 'Two boards side-by-side (shared)' },
];

// Right-panel text content for each chapter (no board blocks — boards are chapter-level)
export type TextBlock =
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'heading'; level: 2 | 3; text: string }
  | { id: string; type: 'tip'; text: string }
  | { id: string; type: 'image'; url: string; caption: string };

export interface Chapter {
  id: string;
  title: string;
  boardType: BoardType;
  board: number[][];           // 10×20, primary board
  board2: number[][];          // 10×20, second board for 2v2/coop
  nextPieces?: number[];       // piece queue at freeze time (board 1)
  holdPiece?: number | null;   // hold piece at freeze time (board 1)
  nextPieces2?: number[];      // piece queue at freeze time (board 2)
  holdPiece2?: number | null;  // hold piece at freeze time (board 2)
  // Active falling piece at freeze time — stored separately so playback can
  // restore it as the live piece instead of baking it into board cells.
  activePiece?: { type: number; x: number; y: number; matrix: number[][] } | null;
  activePiece2?: { type: number; x: number; y: number; matrix: number[][] } | null;
  blocks: TextBlock[];         // right-panel commentary
}

export interface StudyPost {
  id: string;
  author_id: string;
  author_username: string | null;
  title: string;
  topic: Topic;
  summary: string | null;
  content: Chapter[];  // stored in the content JSONB column
  chapters: string[];  // denormalized chapter titles for card previews
  is_public: boolean;
  vote_count: number;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function emptyGrid(): number[][] {
  return Array.from({ length: 20 }, () => Array(10).fill(0));
}

export function newTextBlock(type: TextBlock['type']): TextBlock {
  const id = Math.random().toString(36).slice(2, 9);
  switch (type) {
    case 'paragraph': return { id, type, text: '' };
    case 'heading':   return { id, type, level: 2, text: '' };
    case 'tip':       return { id, type, text: '' };
    case 'image':     return { id, type, url: '', caption: '' };
  }
}

export function newChapter(title = 'New chapter'): Chapter {
  return {
    id: Math.random().toString(36).slice(2, 9),
    title,
    boardType: 'single',
    board: emptyGrid(),
    board2: emptyGrid(),
    blocks: [],
  };
}

export function extractChapterTitles(chapters: Chapter[]): string[] {
  return chapters.map((ch) => ch.title).filter(Boolean).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Post listing
// ---------------------------------------------------------------------------

const LIST_SELECT = 'id, author_id, author_username, title, topic, summary, chapters, is_public, vote_count, created_at';
const POST_SELECT = 'id, author_id, author_username, title, topic, summary, content, chapters, is_public, vote_count, status, created_at';

interface UsePostsOptions {
  view: ViewType;
  topic?: Topic | null;
  search?: string;
  sort?: SortOrder;
}

export function usePosts({ view, topic, search, sort = 'hot' }: UsePostsOptions) {
  const [posts, setPosts] = useState<StudyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      let q = view === 'pending'
        ? supabase.from('study_posts').select(LIST_SELECT).eq('status', 'pending')
        : supabase.from('study_posts').select(LIST_SELECT).eq('is_public', true).eq('status', 'published');
      if (view === 'topic' && topic) q = q.eq('topic', topic);
      if (search?.trim()) q = q.ilike('title', `%${search.trim()}%`);
      q = q.order(sort === 'hot' ? 'vote_count' : 'created_at', { ascending: false }).limit(80);

      const { data, error: err } = await q;
      if (!active) return;
      if (err) { setError(err.message); setLoading(false); return; }
      setPosts(normalise(data ?? []));
      setLoading(false);
    })();

    return () => { active = false; };
  }, [view, topic, search, sort]);

  return { posts, loading, error };
}

function normalise(rows: unknown[]): StudyPost[] {
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    author_id: row.author_id as string,
    author_username: (row.author_username ?? null) as string | null,
    title: row.title as string,
    topic: row.topic as Topic,
    summary: (row.summary ?? null) as string | null,
    content: [],
    chapters: (row.chapters as string[] | null) ?? [],
    is_public: (row.is_public as boolean) ?? true,
    vote_count: row.vote_count as number,
    status: (row.status as string | undefined) ?? 'published',
    created_at: row.created_at as string,
  }));
}

// ---------------------------------------------------------------------------
// Single post
// ---------------------------------------------------------------------------

export function usePost(id: string) {
  const [post, setPost] = useState<StudyPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);

    (async () => {
      const { data, error: err } = await supabase
        .from('study_posts').select(POST_SELECT).eq('id', id).single();

      if (!active) return;
      if (err) { setError(err.message); setLoading(false); return; }
      if (!data) { setError('Post not found'); setLoading(false); return; }

      const row = data as Record<string, unknown>;
      setPost({
        id: row.id as string,
        author_id: row.author_id as string,
        author_username: (row.author_username ?? null) as string | null,
        title: row.title as string,
        topic: row.topic as Topic,
        summary: (row.summary ?? null) as string | null,
        content: (row.content as Chapter[]) ?? [],
        chapters: (row.chapters as string[]) ?? [],
        is_public: (row.is_public as boolean) ?? true,
        vote_count: row.vote_count as number,
        status: (row.status as string | undefined) ?? 'published',
        created_at: row.created_at as string,
      });
      setLoading(false);
    })();

    return () => { active = false; };
  }, [id]);

  return { post, loading, error };
}

// ---------------------------------------------------------------------------
// Vote
// ---------------------------------------------------------------------------

export function useVote(postId: string, userId: string | null) {
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !postId) { setVoted(false); return; }
    supabase.from('study_votes').select('post_id').eq('post_id', postId).eq('user_id', userId)
      .maybeSingle().then(({ data }) => setVoted(!!data));
  }, [postId, userId]);

  const toggle = useCallback(async (currentCount: number, onCountChange: (n: number) => void) => {
    if (!userId || busy) return;
    setBusy(true);
    if (voted) {
      await supabase.from('study_votes').delete().eq('post_id', postId).eq('user_id', userId);
      setVoted(false); onCountChange(currentCount - 1);
    } else {
      await supabase.from('study_votes').insert({ post_id: postId, user_id: userId });
      setVoted(true); onCountChange(currentCount + 1);
    }
    setBusy(false);
  }, [postId, userId, voted, busy]);

  return { voted, toggle, busy };
}

// ---------------------------------------------------------------------------
// Local ownership — tracks post IDs created in this browser
// ---------------------------------------------------------------------------

const OWNED_KEY = 'study-owned-posts';

export function getOwnedPostIds(): string[] {
  try { return JSON.parse(localStorage.getItem(OWNED_KEY) ?? '[]'); } catch { return []; }
}

export function addOwnedPostId(id: string): void {
  try {
    const ids = getOwnedPostIds();
    if (!ids.includes(id)) localStorage.setItem(OWNED_KEY, JSON.stringify([...ids, id]));
  } catch { /* ignore */ }
}

export function isOwnedPost(id: string): boolean {
  try { return getOwnedPostIds().includes(id); } catch { return false; }
}

// Fetch the stored edit token for a post (used by the edit page to verify URL tokens).
export async function fetchEditToken(postId: string): Promise<string | null> {
  const { data } = await supabase
    .from('study_posts').select('edit_token').eq('id', postId).single();
  return (data as { edit_token: string | null } | null)?.edit_token ?? null;
}

// ---------------------------------------------------------------------------
// Save / delete
// ---------------------------------------------------------------------------

export async function savePost(
  draft: { title: string; topic: Topic; summary: string; chapters: Chapter[]; is_public: boolean },
  authorId: string | null,
  existingId?: string,
  authorUsername?: string | null,
  editToken?: string,
): Promise<{ id: string } | { error: string }> {
  const chapterTitles = extractChapterTitles(draft.chapters);
  const payload = {
    author_id: authorId,
    ...(authorUsername !== undefined ? { author_username: authorUsername } : {}),
    title: draft.title.trim(),
    topic: draft.topic,
    summary: draft.summary.trim() || null,
    content: draft.chapters,
    chapters: chapterTitles,
    is_public: draft.is_public,
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { error } = await supabase.from('study_posts').update(payload).eq('id', existingId);
    if (error) return { error: error.message };
    return { id: existingId };
  }

  // Authenticated posts publish immediately; anonymous go to pending review.
  const status = authorId ? 'published' : 'pending';
  const insertPayload = { ...payload, status, ...(editToken ? { edit_token: editToken } : {}) };
  const { data, error } = await supabase.from('study_posts').insert(insertPayload).select('id').single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

export async function deletePost(postId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('study_posts').delete().eq('id', postId);
  return error ? { error: error.message } : {};
}
