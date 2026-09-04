'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  AUTH_PAGE_WRAPPER_STYLE, AUTH_CARD_STYLE, FORM_HEADING_STYLE, FORM_BODY_STYLE,
  FIELD_STYLE, PRIMARY_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE,
} from './authStyles';

export default function RegisterPage() {
  const router = useRouter();
  const { user, signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/profile');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const result = await signUp(email, password, username);
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    if (result.needsConfirmation) {
      setConfirmMessage('Account created — check your email to confirm before signing in.');
    }
  };

  return (
    <div style={AUTH_PAGE_WRAPPER_STYLE}>
      <div style={AUTH_CARD_STYLE}>
        <h1 style={FORM_HEADING_STYLE}>Create Account</h1>
        <p style={FORM_BODY_STYLE}>A basic account — just enough to know who you are.</p>

        {confirmMessage ? (
          <p style={SUCCESS_TEXT_STYLE}>{confirmMessage}</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input value={username} onChange={(e) => setUsername(e.target.value.slice(0, 20))} placeholder="Username" maxLength={20} required style={FIELD_STYLE} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required style={FIELD_STYLE} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
            {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
            <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Working…' : 'Create Account'}
            </button>
          </form>
        )}

        {!confirmMessage && (
          <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
