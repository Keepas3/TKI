'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  AUTH_PAGE_WRAPPER_STYLE, AUTH_CARD_STYLE, FORM_HEADING_STYLE, FORM_BODY_STYLE,
  FIELD_STYLE, FIELD_LABEL_STYLE, PRIMARY_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE,
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
  id, value, onChange, label, autoComplete = 'new-password',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} style={FIELD_LABEL_STYLE}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
}

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
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  useEffect(() => {
    if (user) router.replace('/profile');
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await signUp(email, password, username);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setConfirmMessage('Almost there — check your inbox to confirm your email, then sign in.');
    }
  };

  return (
    <div style={AUTH_PAGE_WRAPPER_STYLE}>
      <div style={AUTH_CARD_STYLE}>
        <h1 style={FORM_HEADING_STYLE}>Create your account</h1>

        {confirmMessage ? (
          <>
            <p style={SUCCESS_TEXT_STYLE}>{confirmMessage}</p>
            <p style={{ margin: '1.25rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              <Link href="/login" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>Sign in →</Link>
            </p>
          </>
        ) : (
          <>
            <p style={FORM_BODY_STYLE}>Join TKI. Build your profile, track studies and puzzle completion.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="reg-username" style={FIELD_LABEL_STYLE}>Username</label>
                <input
                  id="reg-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                  placeholder="Your display name"
                  maxLength={20}
                  required
                  style={{
                    ...FIELD_STYLE,
                    border: usernameFocused ? '1px solid var(--tt-accent)' : FIELD_STYLE.border,
                  }}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />
              </div>

              <div>
                <label htmlFor="reg-email" style={FIELD_LABEL_STYLE}>Email</label>
                <input
                  id="reg-email"
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

              <PasswordField
                id="reg-password"
                value={password}
                onChange={setPassword}
                label="Password"
                autoComplete="new-password"
              />

              <PasswordField
                id="reg-confirm"
                value={confirmPassword}
                onChange={setConfirmPassword}
                label="Confirm password"
                autoComplete="new-password"
              />

              {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}

              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, marginTop: '0.25rem', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <p style={{ margin: '1.25rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
