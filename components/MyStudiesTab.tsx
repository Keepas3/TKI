'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './useAuth';
import { PROFILE_CARD_STYLE } from './ProfileLayout';
import { supabase } from '../app/utils/supabaseClient';
import { TOPICS } from './useStudy';

interface MyStudy {
  id: string;
  title: string;
  topic: string;
  status: string;
  vote_count: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: '#4ade80',
  pending:   '#fbbf24',
  rejected:  '#f87171',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: '0.55rem', letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '2px 6px', borderRadius: 3, fontWeight: 700,
      color: STATUS_COLORS[status] ?? 'rgba(255,255,255,0.4)',
      background: `${STATUS_COLORS[status] ?? 'rgba(255,255,255,0.1)'}18`,
      border: `1px solid ${STATUS_COLORS[status] ?? 'rgba(255,255,255,0.1)'}44`,
    }}>
      {status}
    </span>
  );
}

export default function MyStudiesTab() {
  const { user } = useAuth();
  const [studies, setStudies] = useState<MyStudy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('study_posts')
      .select('id, title, topic, status, vote_count, created_at')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setStudies((data ?? []) as MyStudy[]);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontFamily: 'monospace', padding: '2rem 0' }}>
        Loading…
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div style={{ ...PROFILE_CARD_STYLE, textAlign: 'center', padding: '3rem 1.5rem' }}>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', margin: '0 0 1rem' }}>
          You haven&apos;t written any studies yet.
        </p>
        <Link href="/study/new" style={{
          display: 'inline-block', padding: '0.5rem 1.25rem', borderRadius: 6,
          background: 'var(--tt-accent)', color: '#000',
          fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
        }}>
          Write a Study
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {studies.length} {studies.length === 1 ? 'study' : 'studies'}
        </span>
        <Link href="/study/new" style={{
          fontSize: '0.7rem', color: 'var(--tt-accent)', textDecoration: 'none',
          fontFamily: 'monospace', fontWeight: 700,
        }}>
          + New Study
        </Link>
      </div>

      {studies.map((s) => {
        const topic = TOPICS.find((t) => t.id === s.topic);
        const date = new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        return (
          <div key={s.id} style={{ ...PROFILE_CARD_STYLE, padding: '0.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {topic && (
              <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: topic.color, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                <Link href={`/study/${s.id}`} style={{
                  fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.88)',
                  textDecoration: 'none', letterSpacing: '0.02em',
                }}>
                  {s.title}
                </Link>
                <StatusBadge status={s.status} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {topic && (
                  <span style={{ fontSize: '0.65rem', color: topic.color, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700 }}>
                    {topic.label}
                  </span>
                )}
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>{date}</span>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>▲ {s.vote_count}</span>
              </div>
            </div>
            <Link href={`/study/${s.id}/edit`} style={{
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 8px',
              flexShrink: 0,
            }}>
              Edit
            </Link>
          </div>
        );
      })}
    </div>
  );
}
