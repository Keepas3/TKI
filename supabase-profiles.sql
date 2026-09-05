-- ============================================================
-- Profiles: user identity synced from auth.users metadata.
-- Shared by tetris-arena and tetris-content (same Supabase project).
-- Re-running is safe.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username   text CHECK (username IS NULL OR (char_length(username) >= 2 AND char_length(username) <= 30)),
  avatar_id  text,
  banner_id  text,
  is_admin   boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Add is_admin if the table already existed without it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

-- Anyone can read public profile fields (username, avatar, banner).
-- is_admin is in this table but application code should never select('*') —
-- only select the columns callers actually need.
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);

-- Users can only insert their own row.
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update only their own row.
-- The trigger below ensures is_admin cannot be self-escalated.
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- No client-side deletes — cascade from auth.users handles cleanup.

-- ── is_admin escalation guard ────────────────────────────────
-- Silently reverts any attempt to change is_admin by a non-admin.
-- SECURITY DEFINER so the subquery runs as the function owner,
-- not as the calling user (bypassing RLS on the lookup).
CREATE OR REPLACE FUNCTION prevent_is_admin_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.is_admin <> OLD.is_admin THEN
    -- Allow the change only if the caller is already an admin.
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    ) THEN
      NEW.is_admin := OLD.is_admin;  -- revert silently
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_is_admin_guard ON profiles;
CREATE TRIGGER profiles_is_admin_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_admin_escalation();

-- ── Grants ───────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles TO anon;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- ── Account self-deletion ────────────────────────────────────
-- Called by the client via supabase.rpc('delete_account').
-- SECURITY DEFINER lets it delete from auth.users (normally
-- restricted) on behalf of the authenticated caller only.
-- The ON DELETE CASCADE on profiles ensures the profile row
-- is cleaned up automatically.
CREATE OR REPLACE FUNCTION delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION delete_account() TO authenticated;

NOTIFY pgrst, 'reload schema';
