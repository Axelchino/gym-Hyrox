-- ============================================
-- HYROX PLAN START DATE
-- ============================================
-- Both plans previously built their calendar from a single fixed
-- historical date (Jul 27, 2026). Anyone opening the app after that date
-- would land mid-plan (e.g. "Week 5") with a pile of earlier days shown
-- as an unchecked backlog they never actually had a chance to do.
--
-- plan_start_date is captured once, automatically, client-side, the
-- first time a person's progress row loads with this column empty — then
-- left fixed. Both plans now build their calendar anchored to this date
-- instead of a shared constant, so Day 1 always looks like Day 1.
--
-- Run this in Supabase SQL Editor AFTER 001-005.

ALTER TABLE public.hyrox_progress
  ADD COLUMN IF NOT EXISTS plan_start_date DATE;

-- No RLS changes needed — same row, already covered by the policies in
-- 002_hyrox_groups.sql (own row read/write, groupmates/admin can view).
