-- ============================================
-- HYROX GROUPS - DUO TRAINING TRACKER
-- ============================================
-- Adds groups (duo/couple), membership, and per-user progress tracking
-- for the Hyrox training plan feature.
-- Run this in Supabase SQL Editor: Database → SQL Editor → New Query
-- (Run AFTER 001_initial_schema.sql)

-- ============================================
-- 1. GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.hyrox_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. GROUP MEMBERS TABLE (capped at 2 — duo/couple)
-- ============================================
-- UNIQUE(user_id) (not just UNIQUE(group_id, user_id)) is deliberate: each
-- person belongs to at most one Hyrox group at a time, matching the
-- duo/couple product model. Leave the group first to join a different one.
CREATE TABLE IF NOT EXISTS public.hyrox_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.hyrox_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.enforce_hyrox_group_cap()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.hyrox_group_members WHERE group_id = NEW.group_id) >= 2 THEN
    RAISE EXCEPTION 'Hyrox groups are capped at 2 members';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_hyrox_group_cap_trigger ON public.hyrox_group_members;
CREATE TRIGGER enforce_hyrox_group_cap_trigger
  BEFORE INSERT ON public.hyrox_group_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_hyrox_group_cap();

-- ============================================
-- 3. PROGRESS TABLE (one row per user)
-- ============================================
CREATE TABLE IF NOT EXISTS public.hyrox_progress (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  done JSONB NOT NULL DEFAULT '{}',       -- { "2026-07-27": true, ... }
  times JSONB NOT NULL DEFAULT '{}',      -- { "Mon": "17:30", ... }
  benchmarks JSONB NOT NULL DEFAULT '[]', -- [{ event, time, date }, ...]
  stations JSONB NOT NULL DEFAULT '{}',   -- { "SkiErg 1000m": "3:45", ... }
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_hyrox_group_members_group_id ON public.hyrox_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_hyrox_group_members_user_id ON public.hyrox_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_hyrox_groups_invite_code ON public.hyrox_groups(invite_code);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.hyrox_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hyrox_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hyrox_progress ENABLE ROW LEVEL SECURITY;

-- hyrox_groups: visible to members of that group, or the app admin
CREATE POLICY "Members or admin can view groups" ON public.hyrox_groups
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.hyrox_group_members m
      WHERE m.group_id = hyrox_groups.id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update own group" ON public.hyrox_groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Direct INSERT is not exposed to clients — group creation goes through
-- the create_hyrox_group() RPC below so the creator is atomically added
-- as the first member. Still, keep a matching INSERT policy for safety.
CREATE POLICY "Authenticated users can create groups" ON public.hyrox_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- hyrox_group_members: visible to people who share that group, or admin
CREATE POLICY "Groupmates or admin can view membership" ON public.hyrox_group_members
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.hyrox_group_members me
      WHERE me.group_id = hyrox_group_members.group_id AND me.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave a group" ON public.hyrox_group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Direct INSERT is not exposed to clients — joining goes through the
-- join_hyrox_group() RPC below so an invite code is required. Kept as a
-- defense-in-depth policy (self-join only).
CREATE POLICY "Users can add themselves to a group" ON public.hyrox_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- hyrox_progress: own row, groupmate's row (full detail), or admin
CREATE POLICY "Own, groupmate, or admin can view progress" ON public.hyrox_progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.hyrox_group_members me
      JOIN public.hyrox_group_members them ON me.group_id = them.group_id
      WHERE me.user_id = auth.uid() AND them.user_id = hyrox_progress.user_id
    )
  );

CREATE POLICY "Users can insert own progress" ON public.hyrox_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.hyrox_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- public.profiles (from 001_initial_schema.sql) only allows SELECT of your
-- own row. That would silently hide a partner's display name/email in the
-- group member list, so add an ADDITIONAL permissive policy (policies for
-- the same command are OR'd together — this doesn't remove the existing
-- "Users can view own profile" policy) letting groupmates and the admin
-- see each other's name/email.
CREATE POLICY "Groupmates or admin can view profile" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.hyrox_group_members me
      JOIN public.hyrox_group_members them ON me.group_id = them.group_id
      WHERE me.user_id = auth.uid() AND them.user_id = profiles.id
    )
  );

-- ============================================
-- updated_at TRIGGERS (reuses update_updated_at_column() from 001)
-- ============================================
DROP TRIGGER IF EXISTS update_hyrox_groups_updated_at ON public.hyrox_groups;
CREATE TRIGGER update_hyrox_groups_updated_at BEFORE UPDATE ON public.hyrox_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_hyrox_progress_updated_at ON public.hyrox_progress;
CREATE TRIGGER update_hyrox_progress_updated_at BEFORE UPDATE ON public.hyrox_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RPCs: create + join (SECURITY DEFINER so join can look up a group by
-- invite code without a broad SELECT policy on hyrox_groups)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_hyrox_group(p_name TEXT)
RETURNS public.hyrox_groups AS $$
DECLARE
  v_group public.hyrox_groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;

  IF EXISTS (SELECT 1 FROM public.hyrox_group_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already in a Hyrox group — leave it first';
  END IF;

  INSERT INTO public.hyrox_groups (name, created_by)
  VALUES (p_name, auth.uid())
  RETURNING * INTO v_group;

  INSERT INTO public.hyrox_group_members (group_id, user_id)
  VALUES (v_group.id, auth.uid());

  RETURN v_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.join_hyrox_group(p_code TEXT)
RETURNS public.hyrox_groups AS $$
DECLARE
  v_group public.hyrox_groups;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be signed in';
  END IF;

  IF EXISTS (SELECT 1 FROM public.hyrox_group_members WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already in a Hyrox group — leave it first';
  END IF;

  SELECT * INTO v_group FROM public.hyrox_groups WHERE invite_code = upper(p_code);

  IF v_group.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.hyrox_group_members (group_id, user_id)
  VALUES (v_group.id, auth.uid());

  RETURN v_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE! 🎉
-- ============================================
