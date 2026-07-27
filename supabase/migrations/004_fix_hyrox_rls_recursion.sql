-- ============================================
-- FIX: infinite recursion in Hyrox group RLS policies
-- ============================================
-- 002_hyrox_groups.sql wrote policies on hyrox_group_members that query
-- hyrox_group_members from within their own USING clause (a self-join).
-- Postgres re-evaluates that table's RLS policy for the inner query too,
-- which recurses into itself forever — surfaces as:
--   "infinite recursion detected in policy for relation hyrox_group_members"
--
-- Fix: move the membership checks into SECURITY DEFINER functions. Created
-- via the SQL Editor they're owned by a role that bypasses RLS, so the
-- function's internal query doesn't re-trigger the policy — breaking the
-- cycle. Run this AFTER 001, 002, 003.

CREATE OR REPLACE FUNCTION public.is_in_my_hyrox_group(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hyrox_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_hyrox_group_with(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hyrox_group_members me
    JOIN public.hyrox_group_members them ON me.group_id = them.group_id
    WHERE me.user_id = auth.uid() AND them.user_id = p_user_id
  );
$$;

-- hyrox_groups
DROP POLICY IF EXISTS "Members or admin can view groups" ON public.hyrox_groups;
CREATE POLICY "Members or admin can view groups" ON public.hyrox_groups
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR public.is_in_my_hyrox_group(id)
  );

-- hyrox_group_members (this was the recursive one)
DROP POLICY IF EXISTS "Groupmates or admin can view membership" ON public.hyrox_group_members;
CREATE POLICY "Groupmates or admin can view membership" ON public.hyrox_group_members
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR public.is_in_my_hyrox_group(group_id)
  );

-- hyrox_progress
DROP POLICY IF EXISTS "Own, groupmate, or admin can view progress" ON public.hyrox_progress;
CREATE POLICY "Own, groupmate, or admin can view progress" ON public.hyrox_progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR public.shares_hyrox_group_with(user_id)
  );

-- profiles (additive policy added in 002 for groupmate name/email visibility)
DROP POLICY IF EXISTS "Groupmates or admin can view profile" ON public.profiles;
CREATE POLICY "Groupmates or admin can view profile" ON public.profiles
  FOR SELECT USING (
    (auth.jwt() ->> 'email') = 'axelcv150@gmail.com'
    OR public.shares_hyrox_group_with(id)
  );
