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

export default function ResetPasswordPage() {
  const router = useRouter();
  const { user, isPasswordRecovery, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const timeout = setTimeout(() => router.replace('/profile'), 1500);
      return () => clearTimeout(timeout);
    }
  }, [done, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) setError(result.error);
    else setDone(true);
  };

  const stillChecking = user === undefined;

  return (
    <div style={AUTH_PAGE_WRAPPER_STYLE}>
      <div style={AUTH_CARD_STYLE}>
        <h1 style={FORM_HEADING_STYLE}>Reset your password</h1>

        {stillChecking ? (
          <p style={FORM_BODY_STYLE}>Checking your link…</p>
        ) : done ? (
          <p style={SUCCESS_TEXT_STYLE}>Password updated. Taking you to your profile…</p>
        ) : !isPasswordRecovery ? (
          <div>
            <p style={{ ...ERROR_TEXT_STYLE, marginBottom: '0.85rem' }}>
              This link is invalid or has expired.
            </p>
            <Link
              href="/login"
              style={{ fontSize: '0.75rem', color: 'var(--tt-accent)', textDecoration: 'none' }}
            >
              Request a new one →
            </Link>
          </div>
        ) : (
          <>
            <p style={FORM_BODY_STYLE}>Choose a new password for your account.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <PasswordField
                id="reset-password"
                value={password}
                onChange={setPassword}
                label="New password"
              />
              <PasswordField
                id="reset-confirm"
                value={confirmPassword}
                onChange={setConfirmPassword}
                label="Confirm new password"
              />
              {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, marginTop: '0.25rem', opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
