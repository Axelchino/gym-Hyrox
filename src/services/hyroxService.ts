/**
 * Hyrox Service
 *
 * Supabase calls for the Hyrox groups feature: groups, membership, and
 * per-user progress tracking. Follows the same conventions as
 * supabaseDataService.ts (getCurrentUserId() first, .eq()-scoped queries,
 * snake_case -> camelCase mapping, console.error + rethrow).
 */

import { supabase } from './supabase';
import { getCurrentUserId } from './supabaseDataService';
import type { HyroxAdminGroupSummary, HyroxBenchmark, HyroxGroup, HyroxGroupMember, HyroxProgress } from '../types/hyrox';
import { HYROX_PROGRESS_EMPTY, DEFAULT_PILLAR_DAY_MAP, DEFAULT_RECOVERY_CHOICES } from '../types/hyrox';
import { ALL_DAYS } from '../data/hyroxPlan';

const ADMIN_EMAIL = 'axelcv150@gmail.com';

function mapGroup(row: any): HyroxGroup {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProgress(row: any): HyroxProgress {
  return {
    userId: row.user_id,
    done: row.done ?? {},
    times: { ...HYROX_PROGRESS_EMPTY.times, ...(row.times ?? {}) },
    benchmarks: (row.benchmarks ?? []) as HyroxBenchmark[],
    stations: row.stations ?? {},
    pillarDayMap: { ...DEFAULT_PILLAR_DAY_MAP, ...(row.pillar_day_map ?? {}) },
    recoveryChoices: { ...DEFAULT_RECOVERY_CHOICES, ...(row.recovery_choices ?? {}) },
    tier: row.tier ?? 'top5',
    updatedAt: row.updated_at,
  };
}

/** The current user's group and its members (null if not in a group). Groups are capped at 2 members. */
export async function getMyGroup(): Promise<{ group: HyroxGroup; members: HyroxGroupMember[] } | null> {
  const userId = await getCurrentUserId();

  const { data: memberRow, error: memberError } = await supabase
    .from('hyrox_group_members')
    .select('group_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) {
    console.error('Error fetching group membership:', memberError);
    throw memberError;
  }
  if (!memberRow) return null;

  const { data: groupRow, error: groupError } = await supabase
    .from('hyrox_groups')
    .select('*')
    .eq('id', memberRow.group_id)
    .single();

  if (groupError) {
    console.error('Error fetching group:', groupError);
    throw groupError;
  }

  const members = await getGroupMembers(memberRow.group_id);
  return { group: mapGroup(groupRow), members };
}

/** All members of a group, with display name/email joined from profiles. */
export async function getGroupMembers(groupId: string): Promise<HyroxGroupMember[]> {
  const { data, error } = await supabase
    .from('hyrox_group_members')
    .select('id, group_id, user_id, joined_at, profiles ( name, email )')
    .eq('group_id', groupId);

  if (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
    name: row.profiles?.name,
    email: row.profiles?.email,
  }));
}

export async function createGroup(name: string): Promise<HyroxGroup> {
  const { data, error } = await supabase.rpc('create_hyrox_group', { p_name: name });

  if (error) {
    console.error('Error creating group:', error);
    throw error;
  }
  return mapGroup(data);
}

export async function joinGroup(code: string): Promise<HyroxGroup> {
  const { data, error } = await supabase.rpc('join_hyrox_group', { p_code: code });

  if (error) {
    console.error('Error joining group:', error);
    throw error;
  }
  return mapGroup(data);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('hyrox_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
}

/** A user's progress row. Returns an empty-shaped default if none exists yet. */
export async function getProgress(userId: string): Promise<HyroxProgress> {
  const { data, error } = await supabase
    .from('hyrox_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching progress:', error);
    throw error;
  }

  if (!data) {
    return { userId, ...HYROX_PROGRESS_EMPTY, updatedAt: new Date().toISOString() };
  }
  return mapProgress(data);
}

/** Upsert the current user's own progress. Partial patches are merged client-side by the caller. */
type ProgressPatch = Partial<Pick<HyroxProgress, 'done' | 'times' | 'benchmarks' | 'stations' | 'pillarDayMap' | 'recoveryChoices' | 'tier'>>;

export async function upsertMyProgress(patch: ProgressPatch): Promise<void> {
  const userId = await getCurrentUserId();

  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.done !== undefined) row.done = patch.done;
  if (patch.times !== undefined) row.times = patch.times;
  if (patch.benchmarks !== undefined) row.benchmarks = patch.benchmarks;
  if (patch.stations !== undefined) row.stations = patch.stations;
  if (patch.pillarDayMap !== undefined) row.pillar_day_map = patch.pillarDayMap;
  if (patch.recoveryChoices !== undefined) row.recovery_choices = patch.recoveryChoices;
  if (patch.tier !== undefined) row.tier = patch.tier;

  const { error } = await supabase
    .from('hyrox_progress')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving progress:', error);
    throw error;
  }
}

/**
 * Admin-only: every group with a name/week/%-done summary per member.
 * Relies on the admin RLS bypass in the hyrox_* policies — the caller must
 * be signed in as the admin account or Supabase will just return nothing.
 */
export async function getAdminGroupsOverview(): Promise<HyroxAdminGroupSummary[]> {
  const totalTrackedDays = ALL_DAYS.filter((d) => d.type !== 'rest').length;

  const { data: groups, error: groupsError } = await supabase.from('hyrox_groups').select('*');
  if (groupsError) {
    console.error('Error fetching groups (admin):', groupsError);
    throw groupsError;
  }

  const summaries: HyroxAdminGroupSummary[] = [];
  for (const groupRow of groups || []) {
    const members = await getGroupMembers(groupRow.id);
    const memberSummaries = await Promise.all(
      members.map(async (m) => {
        const progress = await getProgress(m.userId);
        const doneCount = Object.values(progress.done).filter(Boolean).length;
        const lastDoneDate = Object.keys(progress.done)
          .filter((k) => progress.done[k])
          .sort()
          .pop();
        const currentWeek = lastDoneDate ? (ALL_DAYS.find((d) => d.date === lastDoneDate)?.week ?? 0) : 0;
        return {
          name: m.name || m.email || 'Member',
          currentWeek,
          percentDone: totalTrackedDays ? Math.round((doneCount / totalTrackedDays) * 100) : 0,
        };
      })
    );
    summaries.push({ groupId: groupRow.id, groupName: groupRow.name, members: memberSummaries });
  }
  return summaries;
}

export const isHyroxAdmin = (email: string | null | undefined): boolean => email === ADMIN_EMAIL;
