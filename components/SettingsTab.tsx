'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';
import { PROFILE_CARD_STYLE } from './ProfileLayout';
import { FIELD_STYLE, PRIMARY_BUTTON_STYLE, SECONDARY_BUTTON_STYLE, ERROR_TEXT_STYLE, SUCCESS_TEXT_STYLE } from './authStyles';

const LABEL_STYLE: React.CSSProperties = {
  fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block',
};

export default function SettingsTab() {
  const router = useRouter();
  const { updatePassword, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSaved(false);
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const result = await updatePassword(newPassword);
    setBusy(false);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={PROFILE_CARD_STYLE}>
        <span style={LABEL_STYLE}>Change Password</span>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px' }}>
          <input type="password" value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setSaved(false); }} placeholder="New Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
          <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setSaved(false); }} placeholder="Confirm New Password" autoComplete="new-password" minLength={6} required style={FIELD_STYLE} />
          {error && <p style={ERROR_TEXT_STYLE}>{error}</p>}
          {saved && <p style={SUCCESS_TEXT_STYLE}>Password updated.</p>}
          <button type="submit" disabled={busy} style={{ ...PRIMARY_BUTTON_STYLE, opacity: busy ? 0.6 : 1, alignSelf: 'flex-start' }}>
            {busy ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
      <div style={PROFILE_CARD_STYLE}>
        <span style={LABEL_STYLE}>Account</span>
        <button type="button" onClick={handleSignOut} style={SECONDARY_BUTTON_STYLE}>Sign Out</button>
      </div>
    </div>
  );
}
