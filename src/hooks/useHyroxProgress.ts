import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getProgress, upsertMyProgress } from '../services/hyroxService';
import type { HyroxProgress } from '../types/hyrox';
import { HYROX_PROGRESS_EMPTY } from '../types/hyrox';

type HyroxProgressQueryResult = Pick<UseQueryResult<HyroxProgress, Error | null>, 'data' | 'isLoading' | 'isError' | 'error' | 'refetch'>;

const guestProgress = (userId: string): HyroxProgress => ({
  userId,
  ...HYROX_PROGRESS_EMPTY,
  updatedAt: new Date().toISOString(),
});

/**
 * A user's Hyrox progress (own or a partner's — RLS decides what's
 * actually visible). Partner reads use a short staleTime + polling since
 * there's no realtime subscription in this codebase yet (see plan notes);
 * that's enough for a training log, not meant to feel like live typing.
 * An explicit return type keeps `.data` properly typed at call sites
 * instead of collapsing to `any` (see useHyroxGroup.ts for the same fix).
 */
export function useHyroxProgress(userId: string | null | undefined, options: { isPartner?: boolean } = {}): HyroxProgressQueryResult {
  const { isGuest } = useAuth();

  // useQuery must always be called (rules-of-hooks) — guest/no-userId
  // disables it via `enabled` and overrides the result below, it never
  // skips the call itself.
  const query = useQuery({
    queryKey: ['hyroxProgress', userId],
    queryFn: () => getProgress(userId as string),
    enabled: !isGuest && !!userId,
    staleTime: options.isPartner ? 30 * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: options.isPartner ? 30 * 1000 : false,
  });

  if (isGuest || !userId) {
    return {
      data: userId ? guestProgress(userId) : undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: query.refetch,
    };
  }

  return query;
}

export function useSaveHyroxProgress(userId: string | null | undefined) {
  const queryClient = useQueryClient();

  return async (patch: Partial<Pick<HyroxProgress, 'done' | 'times' | 'benchmarks' | 'stations' | 'pillarDayMap' | 'recoveryChoices' | 'tier' | 'raceDate' | 'planId' | 'targetTotalSeconds'>>) => {
    await upsertMyProgress(patch);
    if (userId) queryClient.invalidateQueries({ queryKey: ['hyroxProgress', userId] });
  };
}
