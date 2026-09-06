'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  AUTH_PAGE_WRAPPER_STYLE, AUTH_CARD_STYLE, FORM_HEADING_STYLE, FORM_BODY_STYLE,
  FIELD_STYLE, FIELD_LABEL_STYLE, PRIMARY_BUTTON_STYLE, LINK_BUTTON_STYLE,
  ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE,
} from './authStyles';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M4.2 4.3C2.8 5.3 1.7 6.7 1 8c1.3 2.6 4 5 7 5a7 7 0 0 0 3.4-.9M6.8 3.1A7 7 0 0 1 8 3c3 0 5.7 2.4 7 5a9.5 9.5 0 0 1-1.6 2.5" />
    </svg>
  );
}

function PasswordField({
  value, onChange, placeholder = '', autoComplete = 'current-password', id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={6}
        style={{
          ...FIELD_STYLE,
          paddingRight: '2.5rem',
          border: focused ? '1px solid var(--tt-accent)' : FIELD_STYLE.border,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex',
        }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, requestPasswordReset } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

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
            <h1 style={FORM_HEADING_STYLE}>Forgot your password?</h1>

            {resetSent ? (
              <p style={SUCCESS_TEXT_STYLE}>Reset link sent — check your inbox.</p>
            ) : (
              <>
                <p style={FORM_BODY_STYLE}>Enter the email on your account and we&rsquo;ll send a reset link.</p>
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label htmlFor="reset-email" style={FIELD_LABEL_STYLE}>Email</label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                      style={{
                        ...FIELD_STYLE,
                        border: emailFocused ? '1px solid var(--tt-accent)' : FIELD_STYLE.border,
                      }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </div>
                  {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
                  <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>
                    {busy ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}

            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setResetSent(false); setError(null); }}
              style={{ ...LINK_BUTTON_STYLE, marginTop: '1.5rem', display: 'block' }}
            >
              ← Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 style={FORM_HEADING_STYLE}>Welcome back</h1>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="login-email" style={FIELD_LABEL_STYLE}>Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={{
                    ...FIELD_STYLE,
                    border: emailFocused ? '1px solid var(--tt-accent)' : FIELD_STYLE.border,
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <label htmlFor="login-password" style={{ ...FIELD_LABEL_STYLE, marginBottom: 0 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setShowForgotPassword(true); setError(null); }}
                    style={{ ...LINK_BUTTON_STYLE, fontSize: '0.68rem' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordField
                  id="login-password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                />
              </div>

              {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}

              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, marginTop: '0.25rem', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p style={{ margin: '1.25rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              New here?{' '}
              <Link href="/register" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>Create an account</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
