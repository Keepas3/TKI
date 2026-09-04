import React from 'react';
import { PROFILE_CARD_STYLE } from './ProfileLayout';

export default function ComingSoonTab({ label, blurb }: { label: string; blurb: string }) {
  return (
    <div style={{ ...PROFILE_CARD_STYLE, textAlign: 'center', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Soon
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{blurb}</p>
    </div>
  );
}
