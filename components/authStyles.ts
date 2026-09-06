import type React from 'react';

export const FIELD_LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem',
};

export const FIELD_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
  color: 'white', fontSize: '0.85rem', padding: '10px 12px', fontFamily: 'monospace',
  outline: 'none', width: '100%', boxSizing: 'border-box',
};

export const PRIMARY_BUTTON_STYLE: React.CSSProperties = {
  width: '100%', backgroundColor: 'var(--tt-accent)', color: 'black', fontWeight: 'bold', border: 'none',
  borderRadius: '6px', padding: '0.8rem 0.9rem', fontFamily: 'monospace', fontSize: '0.8rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
};

export const SECONDARY_BUTTON_STYLE: React.CSSProperties = {
  backgroundColor: 'transparent', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '6px', padding: '0.65rem 0.9rem', fontFamily: 'monospace', fontSize: '0.75rem',
  letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
};

export const LINK_BUTTON_STYLE: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--tt-accent)',
  fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer', padding: 0, letterSpacing: '0.03em',
};

export const AUTH_PAGE_WRAPPER_STYLE: React.CSSProperties = {
  minHeight: '100%', width: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
  fontFamily: 'monospace',
};

export const AUTH_CARD_STYLE: React.CSSProperties = {
  width: '100%', maxWidth: '460px',
  backgroundColor: 'rgba(5,5,8,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--tt-accent)',
  borderRadius: '12px', padding: '2.5rem',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
};

export const FORM_HEADING_STYLE: React.CSSProperties = { margin: '0 0 1.5rem 0', fontSize: '1.3rem', color: 'white', letterSpacing: '0.04em' };
export const FORM_BODY_STYLE: React.CSSProperties = { margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 };
export const ERROR_TEXT_STYLE: React.CSSProperties = { fontSize: '0.72rem', color: '#f87171', margin: 0 };
export const SUCCESS_TEXT_STYLE: React.CSSProperties = { fontSize: '0.82rem', color: '#7ee787', lineHeight: 1.55, margin: 0 };
