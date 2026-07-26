import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getMyGroup } from '../services/hyroxService';
import type { HyroxGroup, HyroxGroupMember } from '../types/hyrox';

type MyGroupResult = { group: HyroxGroup; members: HyroxGroupMember[] } | null;
type HyroxGroupQueryResult = Pick<UseQueryResult<MyGroupResult, Error | null>, 'data' | 'isLoading' | 'isError' | 'error' | 'refetch'>;

/**
 * The current user's Hyrox group + members (null if not in one yet).
 * Hyrox groups require a real account — guest mode gets a static "not in a
 * group" result instead of hitting Supabase, matching useUserProfile.ts's
 * guest-mode branch pattern. An explicit return type (rather than letting
 * TS infer it from both branches) keeps `.data` properly typed at call
 * sites instead of collapsing to `any`.
 */
export function useHyroxGroup(): HyroxGroupQueryResult {
  const { user, isGuest } = useAuth();

  // useQuery must always be called (rules-of-hooks) — guest mode disables
  // it via `enabled` and overrides the result below, it never skips the
  // call itself.
  const query = useQuery({
    queryKey: ['hyroxGroup', user?.id],
    queryFn: getMyGroup,
    enabled: !!user && !isGuest,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isGuest) {
    return {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: query.refetch,
    };
  }

  return query;
}

export function useInvalidateHyroxGroup() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['hyroxGroup'] });
}
