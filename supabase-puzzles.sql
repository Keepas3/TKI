-- ============================================================
-- TKI: Puzzle Submissions
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

-- Admin review: only admins (profiles.is_admin = true) can update status/admin_note.
CREATE POLICY "puzzle_submissions_update" ON puzzle_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- daily_schedule: maps a calendar date to the puzzle shown as
-- "Today's Puzzle". puzzle_id can be a built-in slug from
-- puzzleData.ts OR a UUID from puzzle_submissions (approved).
-- Falls back to date-based rotation when no row exists for today.
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_schedule (
  date       date PRIMARY KEY,
  puzzle_id  text NOT NULL
);

ALTER TABLE daily_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_schedule_select" ON daily_schedule;
DROP POLICY IF EXISTS "daily_schedule_insert" ON daily_schedule;
DROP POLICY IF EXISTS "daily_schedule_update" ON daily_schedule;
DROP POLICY IF EXISTS "daily_schedule_delete" ON daily_schedule;

-- Anyone can read (needed for the client-side daily puzzle fetch).
CREATE POLICY "daily_schedule_select" ON daily_schedule FOR SELECT USING (true);
-- Only admins can write to the daily schedule.
CREATE POLICY "daily_schedule_insert" ON daily_schedule
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "daily_schedule_update" ON daily_schedule
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "daily_schedule_delete" ON daily_schedule
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================
-- game_scores: sprint (and formerly blitz) leaderboard.
-- Only sprint entries are written now — blitz no longer has a score.
-- Migration: if the old tetris_scores table exists, rename it.
-- ============================================================

-- game_scores removed: no leaderboard feature is active.
-- Drop both possible table names in case either exists from a prior run.
DROP TABLE IF EXISTS game_scores;
DROP TABLE IF EXISTS tetris_scores;

-- ============================================================
-- puzzle_votes: one row per (puzzle, voter). voter_fingerprint
-- is either a Supabase auth user id (future) or a random UUID
-- stored in the visitor's localStorage. Primary key prevents
-- double-votes from the same browser/account.
-- ============================================================

CREATE TABLE IF NOT EXISTS puzzle_votes (
  puzzle_id         text        NOT NULL,
  voter_fingerprint text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (puzzle_id, voter_fingerprint)
);

ALTER TABLE puzzle_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "puzzle_votes_select" ON puzzle_votes;
DROP POLICY IF EXISTS "puzzle_votes_insert" ON puzzle_votes;
DROP POLICY IF EXISTS "puzzle_votes_delete" ON puzzle_votes;
CREATE POLICY "puzzle_votes_select" ON puzzle_votes FOR SELECT USING (true);
CREATE POLICY "puzzle_votes_insert" ON puzzle_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "puzzle_votes_delete" ON puzzle_votes FOR DELETE USING (true);

-- Add 'featured' to the status enum on puzzle_submissions.
-- A featured puzzle appears in Community and may be highlighted on the hub.
ALTER TABLE puzzle_submissions DROP CONSTRAINT IF EXISTS puzzle_submissions_status_check;
ALTER TABLE puzzle_submissions ADD CONSTRAINT puzzle_submissions_status_check
  CHECK (status IN ('pending', 'approved', 'featured', 'rejected'));

-- ============================================================
-- puzzle_solves: one row per (user, puzzle) — tracks which
-- puzzles a signed-in user has solved and when.
-- UNIQUE constraint prevents duplicate entries for the same puzzle.
-- ============================================================

CREATE TABLE IF NOT EXISTS puzzle_solves (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  puzzle_id  text        NOT NULL,
  solved_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, puzzle_id)
);

ALTER TABLE puzzle_solves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "puzzle_solves_select" ON puzzle_solves;
DROP POLICY IF EXISTS "puzzle_solves_insert" ON puzzle_solves;

-- Users can only read and write their own solve records.
CREATE POLICY "puzzle_solves_select" ON puzzle_solves
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "puzzle_solves_insert" ON puzzle_solves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON puzzle_solves TO authenticated;
