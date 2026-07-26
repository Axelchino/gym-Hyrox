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

  if (isGuest) {
    return {
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: (() => Promise.resolve({ data: null })) as HyroxGroupQueryResult['refetch'],
    };
  }

  return useQuery({
    queryKey: ['hyroxGroup', user?.id],
    queryFn: getMyGroup,
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useInvalidateHyroxGroup() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['hyroxGroup'] });
}
