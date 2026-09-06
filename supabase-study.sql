-- ============================================================
-- Block Study: run this in your Supabase SQL editor
-- Compatible with PostgreSQL 15 (Supabase default)
-- Re-running is safe.
-- ============================================================

-- ── Study posts ─────────────────────────────────────────────
-- author_id is nullable — posts are anonymous (no auth required).

CREATE TABLE IF NOT EXISTS study_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid,   -- nullable: no FK to auth.users, anonymous posts allowed
  author_username text,
  title           text NOT NULL CHECK (char_length(title) >= 4 AND char_length(title) <= 120),
  topic           text NOT NULL CHECK (topic IN ('opening','40l','pc','blitz','combo','general')),
  summary         text CHECK (summary IS NULL OR char_length(summary) <= 300),
  content         jsonb NOT NULL DEFAULT '[]'::jsonb,
  chapters        text[] NOT NULL DEFAULT '{}'::text[],
  is_public       boolean NOT NULL DEFAULT true,
  vote_count      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Make author_id nullable on existing tables (if migrating from the auth version).
ALTER TABLE study_posts ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE study_posts DROP CONSTRAINT IF EXISTS study_posts_author_id_fkey;

-- Add columns if table already existed without them
ALTER TABLE study_posts ADD COLUMN IF NOT EXISTS author_username text;
ALTER TABLE study_posts ADD COLUMN IF NOT EXISTS chapters        text[]   NOT NULL DEFAULT '{}'::text[];
ALTER TABLE study_posts ADD COLUMN IF NOT EXISTS is_public       boolean  NOT NULL DEFAULT true;
ALTER TABLE study_posts ADD COLUMN IF NOT EXISTS edit_token      text;

-- Moderation: status column gates public visibility.
-- 'published' = approved/signed-in; 'pending' = anonymous, awaiting review; 'rejected' = hidden.
-- DEFAULT 'published' so existing rows are unaffected.
ALTER TABLE study_posts ADD COLUMN IF NOT EXISTS
  status text NOT NULL DEFAULT 'published'
  CHECK (status IN ('pending', 'published', 'rejected'));

ALTER TABLE study_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_posts_read"   ON study_posts;
DROP POLICY IF EXISTS "study_posts_insert" ON study_posts;
DROP POLICY IF EXISTS "study_posts_update" ON study_posts;
DROP POLICY IF EXISTS "study_posts_delete" ON study_posts;

-- Public can see published posts; authors can always see their own posts.
CREATE POLICY "study_posts_read" ON study_posts
  FOR SELECT USING (
    (is_public = true AND status = 'published')
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Anyone can submit (anonymous posts allowed).
CREATE POLICY "study_posts_insert" ON study_posts
  FOR INSERT WITH CHECK (true);

-- Authors can edit their own posts; admins can edit any post.
-- Anonymous posts (author_id IS NULL) allow update so guest edit_token flow still works.
CREATE POLICY "study_posts_update" ON study_posts
  FOR UPDATE USING (
    author_id IS NULL
    OR auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only the post author or an admin can delete.
CREATE POLICY "study_posts_delete" ON study_posts
  FOR DELETE USING (
    auth.uid() = author_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ── Study votes ──────────────────────────────────────────────
-- user_id stores an anonymous session ID from localStorage (not an auth.users FK).

CREATE TABLE IF NOT EXISTS study_votes (
  post_id    uuid NOT NULL REFERENCES study_posts(id) ON DELETE CASCADE,
  user_id    text NOT NULL,   -- anonymous session ID, not a UUID FK
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Drop policies first so the column type change below doesn't conflict.
DROP POLICY IF EXISTS "study_votes_read"   ON study_votes;
DROP POLICY IF EXISTS "study_votes_insert" ON study_votes;
DROP POLICY IF EXISTS "study_votes_delete" ON study_votes;

-- If migrating from the old uuid FK version:
ALTER TABLE study_votes DROP CONSTRAINT IF EXISTS study_votes_user_id_fkey;
ALTER TABLE study_votes ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE study_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_votes_read"   ON study_votes FOR SELECT USING (true);
CREATE POLICY "study_votes_insert" ON study_votes FOR INSERT WITH CHECK (true);
-- DELETE is open: user_id is a localStorage fingerprint, not auth.uid(), so
-- server-side identity verification is not possible here. Low-stakes accepted risk.
CREATE POLICY "study_votes_delete" ON study_votes FOR DELETE USING (true);

-- ── study_favorites: drop entirely (requires user identity) ──
DROP TABLE IF EXISTS study_favorites;

-- ── Vote count trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_study_vote_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE study_posts SET vote_count = vote_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE study_posts SET vote_count = vote_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS study_vote_count_trigger ON study_votes;
CREATE TRIGGER study_vote_count_trigger
AFTER INSERT OR DELETE ON study_votes
FOR EACH ROW EXECUTE FUNCTION update_study_vote_count();
