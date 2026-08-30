-- ============================================
-- HYROX DOUBLES CONTINUOUS TARGET TIME
-- ============================================
-- Replaces the Doubles plan's 3-button Top5/10/20% tier system with a
-- continuous target-finish-time slider, same pattern as the Hybrid
-- plan's target_total_seconds. The old `tier` column is left in place
-- (unused going forward) rather than dropped, so existing rows don't
-- need a destructive migration.
--
-- Default (3761 = 1:02:41) is the plan's real Top 5% anchor, sourced
-- from HyroxDataLab's published Doubles finish-time percentile table
-- (425,000+ real results, Seasons 7-8, all divisions combined).
--
-- Run this in Supabase SQL Editor AFTER 001-006.

ALTER TABLE public.hyrox_progress
  ADD COLUMN IF NOT EXISTS doubles_target_seconds INT NOT NULL DEFAULT 3761;

-- No RLS changes needed — same row, already covered by the policies in
-- 002_hyrox_groups.sql (own row read/write, groupmates/admin can view).
