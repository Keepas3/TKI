'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import {
  AUTH_PAGE_WRAPPER_STYLE, AUTH_CARD_STYLE, FORM_HEADING_STYLE, FORM_BODY_STYLE,
  FIELD_STYLE, PRIMARY_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE,
} from './authStyles';

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
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
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
        <h1 style={FORM_HEADING_STYLE}>Reset Password</h1>
        {stillChecking ? (
          <p style={FORM_BODY_STYLE}>One moment…</p>
        ) : done ? (
          <p style={SUCCESS_TEXT_STYLE}>Password updated — taking you to your profile…</p>
        ) : !isPasswordRecovery ? (
          <p style={ERROR_TEXT_STYLE}>This reset link is invalid or has expired. Request a new one from the sign-in page.</p>
        ) : (
          <>
            <p style={FORM_BODY_STYLE}>Choose a new password.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
              {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
              <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
