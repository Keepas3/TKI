'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { PROFILE_CARD_STYLE } from './ProfileLayout';
import { PRIMARY_BUTTON_STYLE, SECONDARY_BUTTON_STYLE } from './authStyles';
import PresetPicker from './PresetPicker';
import { BANNER_PRESETS, bannerPresetById, AvatarDisplay } from './avatarPresets';
import { supabase } from '../app/utils/supabaseClient';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block',
};


const SECTION_HEADING: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase',
  marginBottom: '1rem', display: 'flex', alignItems: 'center',
};

const AVATAR_BOX_SIZE = 72;

interface StudyStats {
  total: number;
  published: number;
  totalVotes: number;
}

interface PuzzleStats {
  solved: number;
  currentStreak: number;
  bestStreak: number;
}

function computeStreaks(dates: string[]): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 };
  const unique = [...new Set(dates)].sort();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const latest = unique[unique.length - 1];
  let best = 1, run = 1;
  for (let i = unique.length - 1; i > 0; i--) {
    const a = new Date(unique[i - 1]), b = new Date(unique[i]);
    const diff = (b.getTime() - a.getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  const anchor = latest === today || latest === yesterday ? latest : null;
  if (!anchor) return { current: 0, best };
  let current = 1;
  for (let i = unique.length - 2; i >= 0; i--) {
    const a = new Date(unique[i]), b = new Date(unique[i + 1]);
    if ((b.getTime() - a.getTime()) / 86400000 === 1) current++;
    else break;
  }
  return { current, best };
}

function StatRow({ label, value, isLast }: { label: string; value: string | number; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.45rem 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: typeof value === 'number' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)' }}>{value}</span>
    </div>
  );
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  const isReal = typeof value === 'number';
  return (
    <div>
      <span style={{ ...LABEL_STYLE, marginBottom: '0.25rem' }}>{label}</span>
      <span style={{ fontSize: '1.6rem', fontWeight: 'bold', lineHeight: 1, display: 'block', color: isReal ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', marginTop: '0.15rem', display: 'block' }}>{sub}</span>}
    </div>
  );
}

export default function ProfileTab() {
  const { user, displayName, avatarId, bannerId, uploadAvatar, updateProfileVisuals } = useAuth();
  const [pickerOpen, setPickerOpen] = useState<'banner' | null>(null);
  const [visualsBusy, setVisualsBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);
  const [puzzleStats, setPuzzleStats] = useState<PuzzleStats | null>(null);

  // Fetch real study stats.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('study_posts')
      .select('status, vote_count')
      .eq('author_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const published = data.filter((r) => r.status === 'published');
        setStudyStats({
          total: data.length,
          published: published.length,
          totalVotes: published.reduce((sum, r) => sum + (r.vote_count as number), 0),
        });
      });
  }, [user]);

  // Fetch real puzzle stats.
  useEffect(() => {
    if (!user) return;
    supabase
      .from('puzzle_solves')
      .select('puzzle_id, solved_at')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        const solved = new Set(data.map((r) => r.puzzle_id as string)).size;
        const dates = data.map((r) => (r.solved_at as string).slice(0, 10));
        const { current, best } = computeStreaks(dates);
        setPuzzleStats({ solved, currentStreak: current, bestStreak: best });
      });
  }, [user]);

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const banner = bannerPresetById(bannerId);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5 MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setAvatarError('Supported formats: JPG, PNG, WebP, GIF.'); return;
    }
    setAvatarError(null);
    setVisualsBusy(true);
    const result = await uploadAvatar(file);
    setVisualsBusy(false);
    if (result.error) setAvatarError(result.error);
    e.target.value = '';
  };

  const selectBanner = async (id: string) => {
    if (visualsBusy) return;
    setVisualsBusy(true);
    await updateProfileVisuals({ bannerId: id });
    setVisualsBusy(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Identity card */}
      <div style={{ ...PROFILE_CARD_STYLE, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: '140px', background: banner.background }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '0 1.5rem 0', marginTop: `-${AVATAR_BOX_SIZE / 2}px` }}>
          <div style={{ width: AVATAR_BOX_SIZE, height: AVATAR_BOX_SIZE, flexShrink: 0, borderRadius: '14px', backgroundColor: '#0a0a0e', border: '3px solid rgba(10,10,14,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <AvatarDisplay avatarId={avatarId} size={AVATAR_BOX_SIZE} />
          </div>
          <div style={{ paddingBottom: '0.15rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '0.03em' }}>{displayName}</h1>
            {memberSince && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>Member since {memberSince}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem 1.5rem 1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ ...SECONDARY_BUTTON_STYLE, cursor: visualsBusy ? 'not-allowed' : 'pointer', opacity: visualsBusy ? 0.6 : 1, display: 'inline-flex', alignItems: 'center' }}>
            {visualsBusy ? 'Uploading…' : 'Upload Photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} disabled={visualsBusy} style={{ display: 'none' }} />
          </label>
          <button type="button" onClick={() => setPickerOpen(pickerOpen === 'banner' ? null : 'banner')} style={pickerOpen === 'banner' ? PRIMARY_BUTTON_STYLE : SECONDARY_BUTTON_STYLE}>Change Banner</button>
          {avatarError && <span style={{ fontSize: '0.65rem', color: '#f87171' }}>{avatarError}</span>}
        </div>
        {pickerOpen === 'banner' && (
          <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <PresetPicker options={BANNER_PRESETS} selectedId={bannerId} onSelect={selectBanner} disabled={visualsBusy} renderSwatch={(preset) => (
              <div style={{ width: 64, height: 40, borderRadius: '8px', background: preset.background }} />
            )} />
          </div>
        )}
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Left column */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={PROFILE_CARD_STYLE}>
            <div style={SECTION_HEADING}>General</div>
            <StatRow label="Puzzles Solved" value={puzzleStats ? puzzleStats.solved : '—'} />
            <StatRow label="Studies Written" value={studyStats ? studyStats.total : '—'} />
            <StatRow label="Studies Published" value={studyStats ? studyStats.published : '—'} />
            <StatRow label="Total Votes Received" value={studyStats ? studyStats.totalVotes : '—'} isLast />
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Studies — real */}
          <div style={PROFILE_CARD_STYLE}>
            <div style={SECTION_HEADING}>Studies</div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <StatBlock label="Published" value={studyStats ? studyStats.published : '—'} />
              <StatBlock label="Total Votes" value={studyStats ? studyStats.totalVotes : '—'} />
              <StatBlock label="Total Views" value="—" sub="coming soon" />
            </div>
          </div>

          {/* Puzzles — real */}
          <div style={PROFILE_CARD_STYLE}>
            <div style={SECTION_HEADING}>Puzzles</div>
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <StatBlock label="Solved" value={puzzleStats ? puzzleStats.solved : '—'} />
              <StatBlock label="Current Streak" value={puzzleStats ? puzzleStats.currentStreak : '—'} sub={puzzleStats ? 'days' : undefined} />
              <StatBlock label="Best Streak" value={puzzleStats ? puzzleStats.bestStreak : '—'} sub={puzzleStats ? 'days' : undefined} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
