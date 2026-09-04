'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  AUTH_PAGE_WRAPPER_STYLE, AUTH_CARD_STYLE, FORM_HEADING_STYLE, FORM_BODY_STYLE,
  FIELD_STYLE, PRIMARY_BUTTON_STYLE, LINK_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE,
} from './authStyles';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, requestPasswordReset } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (user) router.replace('/profile');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.error) setError(result.error);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    if (result.error) setError(result.error);
    else setResetSent(true);
  };

  return (
    <div style={AUTH_PAGE_WRAPPER_STYLE}>
      <div style={AUTH_CARD_STYLE}>
        {showForgotPassword ? (
          <>
            <h1 style={FORM_HEADING_STYLE}>Reset Password</h1>
            <p style={FORM_BODY_STYLE}>Enter your account email and we&rsquo;ll send a reset link.</p>
            {resetSent ? (
              <p style={SUCCESS_TEXT_STYLE}>Check your email for a reset link.</p>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required style={FIELD_STYLE} />
                {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
                <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <button type="button" onClick={() => { setShowForgotPassword(false); setResetSent(false); setError(null); }} style={{ ...LINK_BUTTON_STYLE, marginTop: '1.25rem' }}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 style={FORM_HEADING_STYLE}>Sign In</h1>
            <p style={FORM_BODY_STYLE}>Welcome back.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required style={FIELD_STYLE} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" required style={FIELD_STYLE} />
              {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
            <button type="button" onClick={() => { setShowForgotPassword(true); setError(null); }} style={{ ...LINK_BUTTON_STYLE, marginTop: '1.25rem', display: 'block' }}>
              Forgot password?
            </button>
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
              Don&rsquo;t have an account?{' '}
              <Link href="/register" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>Create one</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
