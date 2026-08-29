-- ============================================
-- HYROX HYBRID PLAN + PER-USER RACE DATE
-- ============================================
-- Adds:
--   - plan_id: which Hyrox plan this person is following ('doubles' —
--     the existing Top5/10/20% program — or 'hybrid' — the Sub-60 +
--     physique program). Additive, default keeps every existing row
--     unchanged.
--   - race_date: people in the same group can have different real race
--     dates (different heats of the same event weekend), so this moves
--     from a single hardcoded constant to a per-user column.
--   - target_total_seconds: the Hybrid plan's continuous target race
--     time (e.g. 59:00 = 3540 seconds) used to scale its running paces
--     and station targets, in place of the Doubles plan's 3 fixed tiers.
-- Run this in Supabase SQL Editor AFTER 001, 002, 003, 004.

ALTER TABLE public.hyrox_progress
  ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'doubles' CHECK (plan_id IN ('doubles', 'hybrid')),
  ADD COLUMN IF NOT EXISTS race_date DATE NOT NULL DEFAULT '2026-12-03',
  ADD COLUMN IF NOT EXISTS target_total_seconds INT NOT NULL DEFAULT 3540;

-- No RLS changes needed — same row, already covered by the policies in
-- 002_hyrox_groups.sql (own row read/write, groupmates/admin can view).
