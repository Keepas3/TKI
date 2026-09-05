'use client';

import React, { useEffect, useState } from 'react';
import { PROFILE_CARD_STYLE } from './ProfileLayout';

// Mirrors the same localStorage keys and defaults BlockGame.tsx uses on mount.
// Changes made here take effect the next time a game starts — no running
// instance needs to be notified.
const DEFAULT_CONTROLS: Record<string, string> = {
  'Left': 'ArrowLeft', 'Right': 'ArrowRight', 'Down': 'ArrowDown',
  'Rotate CW': 'ArrowUp', 'Rotate CCW': 'z', 'Rotate 180': 'a',
  'Hard Drop': ' ', 'Hold': 'c',
};
const CONTROL_ACTIONS = Object.keys(DEFAULT_CONTROLS);
const DEFAULT_TUNING = { das: 170, arr: 30, dcd: 0, sdf: 40 };

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: '0.35rem', display: 'block',
};

const SECTION_HEADING: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em',
  textTransform: 'uppercase', marginBottom: '1rem',
};

function keyLabel(key: string) {
  if (key === ' ') return 'Space';
  return key.replace('Arrow', '');
}

function Slider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--tt-accent)', height: '4px', cursor: 'pointer' }}
      />
    </div>
  );
}

export default function ControlsSettings() {
  const [controls, setControls] = useState<Record<string, string>>(DEFAULT_CONTROLS);
  const [tuning, setTuning] = useState(DEFAULT_TUNING);
  const [listening, setListening] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gameControls') ?? localStorage.getItem('tetrisControls');
      if (saved) setControls((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch { /* keep defaults */ }
    try {
      const saved = localStorage.getItem('gameTuning') ?? localStorage.getItem('tetrisTuning');
      if (saved) setTuning((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch { /* keep defaults */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem('gameControls', JSON.stringify(controls));
  }, [controls, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem('gameTuning', JSON.stringify(tuning));
  }, [tuning, loaded]);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      setControls((prev) => ({ ...prev, [listening]: e.key }));
      setListening(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listening]);

  return (
    <>
      <div style={PROFILE_CARD_STYLE}>
        <div style={SECTION_HEADING}>Keybinds</div>
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Click a key to rebind it, then press the new key.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {CONTROL_ACTIONS.map((action) => (
            <div key={action}>
              <span style={LABEL_STYLE}>{action}</span>
              <button
                onClick={() => setListening(listening === action ? null : action)}
                style={{
                  width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px',
                  border: `1px solid ${listening === action ? 'var(--tt-accent)' : 'rgba(255,255,255,0.12)'}`,
                  backgroundColor: listening === action ? 'color-mix(in srgb, var(--tt-accent) 15%, transparent)' : 'rgba(255,255,255,0.05)',
                  color: listening === action ? 'var(--tt-accent)' : 'rgba(255,255,255,0.8)',
                  fontFamily: 'monospace', fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'border-color 0.12s, background-color 0.12s, color 0.12s',
                  letterSpacing: '0.04em',
                }}
              >
                {listening === action ? '…' : keyLabel(controls[action] ?? DEFAULT_CONTROLS[action])}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={PROFILE_CARD_STYLE}>
        <div style={SECTION_HEADING}>Handling</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', maxWidth: '440px' }}>
          <Slider label="DAS — Delayed Auto Shift" value={tuning.das} min={50} max={300} step={10}
            display={`${tuning.das} ms`} onChange={(v) => setTuning((p) => ({ ...p, das: v }))} />
          <Slider label="ARR — Auto Repeat Rate" value={tuning.arr} min={0} max={100} step={1}
            display={`${tuning.arr} ms`} onChange={(v) => setTuning((p) => ({ ...p, arr: v }))} />
          <Slider label="DCD — DAS Cut Delay" value={tuning.dcd} min={0} max={100} step={1}
            display={`${tuning.dcd} ms`} onChange={(v) => setTuning((p) => ({ ...p, dcd: v }))} />
          <Slider label="SDF — Soft Drop Factor" value={tuning.sdf} min={2} max={41} step={1}
            display={tuning.sdf >= 41 ? 'MAX' : `${tuning.sdf}×`} onChange={(v) => setTuning((p) => ({ ...p, sdf: v }))} />
        </div>
      </div>
    </>
  );
}
