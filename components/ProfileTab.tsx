'use client';

import React, { useState } from 'react';
import { useAuth } from './useAuth';
import { PROFILE_CARD_STYLE } from './ProfileLayout';
import { FIELD_STYLE, PRIMARY_BUTTON_STYLE, SECONDARY_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE } from './authStyles';
import PresetPicker from './PresetPicker';
import { AVATAR_PRESETS, BANNER_PRESETS, avatarPresetById, bannerPresetById, AvatarMark } from './avatarPresets';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block',
};

const SOON_TAG: React.CSSProperties = {
  fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '3px', padding: '1px 4px', letterSpacing: '0.08em', textTransform: 'uppercase',
  verticalAlign: 'middle', marginLeft: '0.4rem',
};

const SECTION_HEADING: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase',
  marginBottom: '1rem', display: 'flex', alignItems: 'center',
};

const AVATAR_BOX_SIZE = 72;

function StatRow({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.45rem 0', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.25)' }}>{value}</span>
    </div>
  );
}

function ModePanel({ label, stats, compact }: { label: string; stats: string[]; compact?: boolean }) {
  return (
    <div style={PROFILE_CARD_STYLE}>
      <div style={SECTION_HEADING}>
        {label}
        <span style={SOON_TAG}>Soon</span>
      </div>
      {compact ? (
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          {stats.map((stat) => (
            <div key={stat}>
              <span style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.2)', display: 'block', lineHeight: 1 }}>—</span>
              <span style={{ ...LABEL_STYLE, marginTop: '0.3rem', marginBottom: 0 }}>{stat}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem' }}>
          {stats.map((stat) => (
            <div key={stat}>
              <span style={LABEL_STYLE}>{stat}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.25)' }}>—</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfileTab() {
  const { user, displayName, avatarId, bannerId, updateUsername, updateProfileVisuals } = useAuth();
  const [username, setUsername] = useState(displayName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<'avatar' | 'banner' | null>(null);
  const [visualsBusy, setVisualsBusy] = useState(false);

  if (!user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const avatar = avatarPresetById(avatarId);
  const banner = bannerPresetById(bannerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSaved(false);
    const trimmed = username.trim();
    if (!trimmed) { setError('Username can\'t be empty.'); return; }
    setBusy(true);
    const result = await updateUsername(trimmed);
    setBusy(false);
    if (result.error) setError(result.error);
    else setSaved(true);
  };

  const selectAvatar = async (id: string) => {
    if (visualsBusy) return;
    setVisualsBusy(true);
    await updateProfileVisuals({ avatarId: id });
    setVisualsBusy(false);
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
          <div style={{ width: AVATAR_BOX_SIZE, height: AVATAR_BOX_SIZE, flexShrink: 0, borderRadius: '14px', backgroundColor: '#0a0a0e', border: '3px solid rgba(10,10,14,1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
            <AvatarMark preset={avatar} size={AVATAR_BOX_SIZE - 24} />
          </div>
          <div style={{ paddingBottom: '0.15rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '0.03em' }}>{displayName}</h1>
            {memberSince && <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>Member since {memberSince}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem 1.5rem 1.25rem' }}>
          <button type="button" onClick={() => setPickerOpen(pickerOpen === 'avatar' ? null : 'avatar')} style={pickerOpen === 'avatar' ? PRIMARY_BUTTON_STYLE : SECONDARY_BUTTON_STYLE}>Change Avatar</button>
          <button type="button" onClick={() => setPickerOpen(pickerOpen === 'banner' ? null : 'banner')} style={pickerOpen === 'banner' ? PRIMARY_BUTTON_STYLE : SECONDARY_BUTTON_STYLE}>Change Banner</button>
        </div>
        {pickerOpen === 'avatar' && (
          <div style={{ padding: '0 1.5rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <PresetPicker options={AVATAR_PRESETS} selectedId={avatarId} onSelect={selectAvatar} disabled={visualsBusy} renderSwatch={(preset) => (
              <div style={{ width: 44, height: 44, borderRadius: '8px', backgroundColor: '#0a0a0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AvatarMark preset={preset} size={32} />
              </div>
            )} />
          </div>
        )}
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
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={PROFILE_CARD_STYLE}>
            <div style={SECTION_HEADING}>Account</div>
            <div style={{ marginBottom: '1rem' }}>
              <span style={LABEL_STYLE}>Email</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{user.email}</span>
            </div>
            <span style={LABEL_STYLE}>Username</span>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input value={username} onChange={(e) => { setUsername(e.target.value.slice(0, 20)); setSaved(false); }} maxLength={20} required style={FIELD_STYLE} />
              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save Username'}</button>
            </form>
            {error && <p style={{ ...ERROR_TEXT_STYLE, marginTop: '0.5rem' }}>{error}</p>}
            {saved && <p style={{ ...SUCCESS_TEXT_STYLE, marginTop: '0.5rem' }}>Username updated.</p>}
          </div>
          <div style={PROFILE_CARD_STYLE}>
            <div style={SECTION_HEADING}>General<span style={SOON_TAG}>Soon</span></div>
            <StatRow label="Puzzles Solved" value="—" />
            <StatRow label="Studies Written" value="—" isLast />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ModePanel label="Puzzles" stats={['Solved', 'Current Streak', 'Best Streak', 'Avg Solve Time']} />
          <ModePanel label="Studies" stats={['Published', 'Total Views', 'Total Votes']} compact />
        </div>
      </div>
    </div>
  );
}
