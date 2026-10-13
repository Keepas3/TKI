import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const res = await fetch(`${url}/rest/v1/study_posts?limit=1&select=id`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Supabase returned ${res.status}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true, status: res.status });
}
