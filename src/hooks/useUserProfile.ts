import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserProfile } from '../services/supabaseDataService';
import type { UserProfile } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { getGuestProfile } from '../data/guestMockData';

/**
 * React Query hook for user profile with optimized caching
 * - Aggressive caching for instant loads
 * - Background revalidation keeps data fresh
 * - Can be prefetched for zero-delay access
 */
export function useUserProfile(userId: string | null) {
  const { isGuest } = useAuth();

  // Always call useQuery (rules-of-hooks — the hook itself can't be
  // conditional), and just disable it in guest mode. The guest-mode
  // override happens on the *result*, not by skipping the hook call.
  const query = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: getUserProfile,
    enabled: !!userId && !isGuest, // Only fetch when logged in
    staleTime: 5 * 60 * 1000, // 5 minutes - consider data fresh
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Don't refetch on component mount if cached
  });

  if (isGuest) {
    return {
      data: getGuestProfile(),
      isLoading: false,
      isError: false,
      error: null,
      refetch: query.refetch,
    } as any;
  }

  return query;
}

/**
 * Prefetch user profile - call this when auth state changes to "logged in"
 * This triggers the fetch in parallel with other login operations
 */
export function usePrefetchUserProfile() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['userProfile', userId],
      queryFn: getUserProfile,
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Get cached profile without triggering a fetch
 * Returns undefined if not in cache
 */
export function useUserProfileCache(userId: string | null): UserProfile | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['userProfile', userId]);
}
