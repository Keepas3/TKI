import React from 'react';

export interface AvatarPreset {
  id: string;
  label: string;
  cells: number[][];  // 4x4 grid; truthy values filled with `color`
  color: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'i-piece', label: 'I', color: '#38bdf8', cells: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  { id: 'o-piece', label: 'O', color: '#fbbf24', cells: [[0,0,0,0],[0,1,1,0],[0,1,1,0],[0,0,0,0]] },
  { id: 't-piece', label: 'T', color: '#a78bfa', cells: [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]] },
  { id: 's-piece', label: 'S', color: '#4ade80', cells: [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]] },
  { id: 'z-piece', label: 'Z', color: '#f87171', cells: [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]] },
  { id: 'j-piece', label: 'J', color: '#0ea5e9', cells: [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]] },
  { id: 'l-piece', label: 'L', color: '#fb923c', cells: [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]] },
];

export const DEFAULT_AVATAR_ID = AVATAR_PRESETS[0].id;

export interface BannerPreset {
  id: string;
  label: string;
  background: string;
}

export const BANNER_PRESETS: BannerPreset[] = [
  { id: 'aurora',     label: 'Aurora',     background: 'linear-gradient(120deg, #0a1930 0%, #134e6f 45%, #38bdf8 100%)' },
  { id: 'sunset',     label: 'Sunset',     background: 'linear-gradient(120deg, #2a0a1a 0%, #b0324a 55%, #ffb020 100%)' },
  { id: 'deep-space', label: 'Deep Space', background: 'radial-gradient(ellipse at 30% 20%, #1e1046 0%, #0a0710 60%), radial-gradient(circle at 80% 70%, rgba(176,38,255,0.2) 0%, transparent 40%)' },
  { id: 'terminal',   label: 'Terminal',   background: 'repeating-linear-gradient(115deg, #06170c 0px, #06170c 18px, #0d2416 18px, #0d2416 20px)' },
  { id: 'blackout',   label: 'Blackout',   background: 'linear-gradient(160deg, #050506 0%, #14151a 100%)' },
];

export const DEFAULT_BANNER_ID = BANNER_PRESETS[0].id;

export function avatarPresetById(id: string | undefined): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0];
}

export function bannerPresetById(id: string | undefined): BannerPreset {
  return BANNER_PRESETS.find((p) => p.id === id) ?? BANNER_PRESETS[0];
}

export function AvatarMark({ preset, size }: { preset: AvatarPreset; size: number }) {
  const cell = size / 4;
  return (
    <div style={{ width: size, height: size, display: 'grid', gridTemplateColumns: `repeat(4, ${cell}px)`, gridTemplateRows: `repeat(4, ${cell}px)` }}>
      {preset.cells.flatMap((row, y) =>
        row.map((filled, x) => (
          <div key={`${y}-${x}`} style={{ width: cell, height: cell, backgroundColor: filled ? preset.color : 'transparent', boxShadow: filled ? `0 0 ${cell * 0.3}px ${preset.color}66` : 'none' }} />
        ))
      )}
    </div>
  );
}

export function isAvatarUrl(id: string | undefined): boolean {
  return !!id && id.startsWith('https://');
}

export function AvatarDisplay({ avatarId, size }: { avatarId: string | undefined; size: number }) {
  if (isAvatarUrl(avatarId)) {
    return (
      <img
        src={avatarId}
        alt="avatar"
        style={{ width: size, height: size, borderRadius: 4, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return <AvatarMark preset={avatarPresetById(avatarId)} size={size} />;
}
