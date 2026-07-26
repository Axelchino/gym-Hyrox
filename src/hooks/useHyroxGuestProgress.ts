import { useEffect, useState } from 'react';
import { HYROX_PROGRESS_EMPTY } from '../types/hyrox';
import type { HyroxProgress } from '../types/hyrox';

const STORAGE_KEY = 'hyrox-guest-progress-v1';

type GuestProgress = Omit<HyroxProgress, 'userId' | 'updatedAt'>;

function load(): GuestProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...HYROX_PROGRESS_EMPTY };
    return { ...HYROX_PROGRESS_EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...HYROX_PROGRESS_EMPTY };
  }
}

/**
 * Local, unsynced progress for people without an account — matches how
 * hyrox-planner.jsx always worked (a single blob in storage, no auth
 * gate). Signed-in users get the Supabase-backed version instead
 * (useHyroxProgress); this is only the guest fallback so the tracker is
 * still fully interactive without an account.
 */
export function useHyroxGuestProgress() {
  const [data, setData] = useState<GuestProgress>(load);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage unavailable, ignore */ }
  }, [data]);

  const save = (patch: Partial<GuestProgress>) => setData((p) => ({ ...p, ...patch }));

  return { data, save };
}
