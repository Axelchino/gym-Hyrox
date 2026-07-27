-- ============================================
-- HYROX SETTINGS — personal weekly schedule + ambition tier
-- ============================================
-- Adds per-user schedule customization and difficulty tier to the
-- existing hyrox_progress table (from 002_hyrox_groups.sql).
-- Run this in Supabase SQL Editor AFTER 001 and 002.

ALTER TABLE public.hyrox_progress
  ADD COLUMN IF NOT EXISTS pillar_day_map JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recovery_choices JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'top5' CHECK (tier IN ('top5', 'top10', 'top20'));

-- No RLS changes needed — same row, already covered by the policies in
-- 002_hyrox_groups.sql (own row read/write, groupmates/admin can view).
