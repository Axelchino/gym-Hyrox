import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { migrationService } from '../services/migrationService';
import { getUserProfile } from '../services/supabaseDataService';

interface AuthError {
  message: string;
  status?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    // Check localStorage for persisted guest mode
    const stored = localStorage.getItem('isGuestMode');
    return stored === 'true';
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check active sessions and sets the user
    authService.getSession().then(({ session }) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // If user is logged in, prefetch profile and check for data migration
      if (session?.user) {
        // User is authenticated - disable guest mode
        exitGuestMode();

        // Prefetch profile immediately for instant theme/profile data access
        queryClient.prefetchQuery({
          queryKey: ['userProfile', session.user.id],
          queryFn: getUserProfile,
          staleTime: 5 * 60 * 1000,
        });

        handleDataMigration(session.user.id);
      } else {
        // No authenticated user - automatically enable guest mode
        enterGuestMode();
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { unsubscribe } = authService.onAuthStateChange((user) => {
      setUser(user);

      // When user signs in/up, prefetch profile and migrate their data
      if (user) {
        // User is authenticated - disable guest mode
        exitGuestMode();

        // Prefetch profile immediately for instant theme/profile data access
        queryClient.prefetchQuery({
          queryKey: ['userProfile', user.id],
          queryFn: getUserProfile,
          staleTime: 5 * 60 * 1000,
        });

        handleDataMigration(user.id);
      } else {
        // User logged out - clear profile cache and enable guest mode
        queryClient.removeQueries({ queryKey: ['userProfile'] });
        enterGuestMode();
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle data migration from default-user to authenticated user
  const handleDataMigration = async (userId: string) => {
    try {
      const hasLocalData = await migrationService.hasLocalData();

      if (hasLocalData) {
        console.log('🔄 Detected local data, starting migration...');
        const summary = await migrationService.getMigrationSummary();
        console.log('📊 Migration summary:', summary);

        await migrationService.migrateLocalDataToUser(userId);
        console.log('✅ Data migration successful!');
      } else {
        console.log('✅ No local data to migrate');
      }
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      // Don't block authentication if migration fails
    }
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('isGuestMode', 'true');
    setLoading(false);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    localStorage.removeItem('isGuestMode');
  };

  const signUp = async (email: string, password: string, name?: string) => {
    // Exit guest mode before creating real account
    exitGuestMode();

    const { error, session } = await authService.signUp({ email, password, name });

    // Migration will be triggered automatically by onAuthStateChange

    return { error, session };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await authService.signIn({ email, password });

    // Migration will be triggered automatically by onAuthStateChange

    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await authService.signInWithGoogle();
    // Migration will be triggered automatically by onAuthStateChange after redirect
    return { error };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await authService.resetPassword(email);
    return { error };
  };

  const value = {
    user,
    loading,
    isGuest,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    enterGuestMode,
    exitGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
