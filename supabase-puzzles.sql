-- ============================================================
-- Blocks Content: Puzzle Submissions
-- Run this in your Supabase SQL editor.
-- Re-running is safe (all statements use IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================

-- puzzle_submissions: community-submitted PC setups awaiting admin review.
-- The board and queue are stored as JSONB so no fixed schema is needed
-- when puzzle format evolves. Approved puzzles are manually copied into
-- puzzleData.ts by the admin; this table is for curation tracking only.
-- author_id is nullable — submissions are anonymous (no auth required).

CREATE TABLE IF NOT EXISTS puzzle_submissions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid,       -- nullable: no FK to auth.users, anonymous submissions allowed
  author_username text,
  name            text        NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 80),
  difficulty      text        NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category        text        NOT NULL CHECK (category IN ('opening', 'middlegame', 'finisher', 'survival')),
  description     text        CHECK (description IS NULL OR char_length(description) <= 200),
  board           jsonb       NOT NULL,  -- number[][] 20×10
  queue           jsonb       NOT NULL,  -- number[]
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Make author_id nullable on existing tables (if migrating from the auth version).
ALTER TABLE puzzle_submissions ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE puzzle_submissions DROP CONSTRAINT IF EXISTS puzzle_submissions_author_id_fkey;

ALTER TABLE puzzle_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "puzzle_submissions_select" ON puzzle_submissions;
DROP POLICY IF EXISTS "puzzle_submissions_insert" ON puzzle_submissions;
DROP POLICY IF EXISTS "puzzle_submissions_update" ON puzzle_submissions;
DROP POLICY IF EXISTS "puzzle_submissions_delete" ON puzzle_submissions;

-- Anyone can read all submissions (admin review page is secret-URL protected).
CREATE POLICY "puzzle_submissions_select" ON puzzle_submissions
  FOR SELECT USING (true);

-- Anyone can submit anonymously.
CREATE POLICY "puzzle_submissions_insert" ON puzzle_submissions
  FOR INSERT WITH CHECK (true);

-- Admin review (update status/admin_note) is done via the Supabase dashboard
-- or a future service-role API call. No client-side update policy needed now.
-- CREATE POLICY "puzzle_submissions_update" ON puzzle_submissions FOR UPDATE USING (true);
