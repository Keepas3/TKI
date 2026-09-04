'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../app/utils/supabaseClient';
import { DEFAULT_AVATAR_ID, DEFAULT_BANNER_ID } from './avatarPresets';

async function syncProfileToTable(u: User) {
  await supabase.from('profiles').upsert({
    id: u.id,
    username: (u.user_metadata?.username as string | undefined) ?? null,
    avatar_id: (u.user_metadata?.avatarId as string | undefined) ?? DEFAULT_AVATAR_ID,
    banner_id: (u.user_metadata?.bannerId as string | undefined) ?? DEFAULT_BANNER_ID,
  }, { onConflict: 'id' });
}

export interface AuthResult {
  error?: string;
  needsConfirmation?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) syncProfileToTable(u);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      else if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      else if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        syncProfileToTable(session.user);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateUsername = useCallback(async (username: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ data: { username } });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updateProfileVisuals = useCallback(async (visuals: { avatarId?: string; bannerId?: string }): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ data: visuals });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const username = user?.user_metadata?.username as string | undefined;
  const displayName = username || user?.email?.split('@')[0] || '';
  const avatarId = (user?.user_metadata?.avatarId as string | undefined) ?? DEFAULT_AVATAR_ID;
  const bannerId = (user?.user_metadata?.bannerId as string | undefined) ?? DEFAULT_BANNER_ID;

  return {
    user, displayName, avatarId, bannerId, isPasswordRecovery,
    signUp, signIn, signOut, updateUsername, updateProfileVisuals, updatePassword, requestPasswordReset,
  };
}
