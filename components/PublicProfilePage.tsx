'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../app/utils/supabaseClient';
import { useAuth } from './useAuth';
import { bannerPresetById, AvatarDisplay } from './avatarPresets';
import { SECONDARY_BUTTON_STYLE } from './authStyles';
import { TOPICS } from './useStudy';
import { timeAgo } from './studyUtils';

const AVATAR_BOX_SIZE = 72;

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: 'rgba(5,5,8,0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '1.5rem',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)', color: 'white',
};

interface ProfileRow {
  id: string;
  username: string | null;
  avatar_id: string | null;
  banner_id: string | null;
}

interface StudyRow {
  id: string;
  title: string;
  topic: string;
  vote_count: number;
  created_at: string;
}

export default function PublicProfilePage({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null | 'loading'>('loading');
  const [studies, setStudies] = useState<StudyRow[]>([]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, avatar_id, banner_id')
      .eq('id', userId)
      .limit(1)
      .then(({ data }) => {
        setProfile(data && data.length > 0 ? (data[0] as ProfileRow) : null);
      });

    supabase
      .from('study_posts')
      .select('id, title, topic, vote_count, created_at')
      .eq('author_id', userId)
      .eq('is_public', true)
      .eq('status', 'published')
      .order('vote_count', { ascending: false })
      .limit(20)
      .then(({ data }) => setStudies((data ?? []) as StudyRow[]));
  }, [userId]);

  if (profile === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', fontFamily: 'monospace' }}>
        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Player not found.</span>
        <Link href="/study" style={{ fontSize: '0.75rem', color: 'var(--tt-accent)', textDecoration: 'none' }}>← Browse Studies</Link>
      </div>
    );
  }

  const isOwn = user?.id === userId;
  const banner = bannerPresetById(profile.banner_id ?? undefined);
  const displayName = profile.username ?? 'Unknown Player';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Identity card */}
      <div style={{ ...CARD_STYLE, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: '140px', background: banner.background }} />
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          gap: '1rem', padding: '0 1.5rem 1.25rem',
          marginTop: `-${AVATAR_BOX_SIZE / 2}px`, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <div style={{
              width: AVATAR_BOX_SIZE, height: AVATAR_BOX_SIZE, flexShrink: 0, borderRadius: '14px',
              backgroundColor: '#0a0a0e', border: '3px solid rgba(10,10,14,1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)', overflow: 'hidden',
            }}>
              <AvatarDisplay avatarId={profile.avatar_id ?? undefined} size={AVATAR_BOX_SIZE} />
            </div>
            <div style={{ paddingBottom: '0.15rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.03em' }}>{displayName}</h1>
            </div>
          </div>
          {isOwn && (
            <div style={{ paddingBottom: '0.5rem' }}>
              <Link href="/profile" style={{ ...SECONDARY_BUTTON_STYLE, textDecoration: 'none', display: 'inline-block' }}>
                Edit Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Studies */}
      <div style={CARD_STYLE}>
        <div style={{ fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Studies
          <span style={{ marginLeft: '0.5rem', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
            {studies.length} published
          </span>
        </div>

        {studies.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: 0 }}>
            No published studies yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {studies.map((s) => {
              const topic = TOPICS.find((t) => t.id === s.topic);
              return (
                <Link
                  key={s.id}
                  href={`/study/${s.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.04)', textDecoration: 'none', color: 'inherit' }}
                >
                  {topic && (
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: topic.color, flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>▲ {s.vote_count}</span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{timeAgo(s.created_at)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
