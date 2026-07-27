import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, User, Plus, Dumbbell, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeTokens, getAccentColors, getSelectedColors } from '../../utils/themeHelpers';
import { OfflineIndicator } from '../OfflineIndicator';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const tokens = useThemeTokens();
  const accentColors = getAccentColors(theme);
  const selectedColors = getSelectedColors(theme);

  // Clear all browser cache and reload
  async function clearCacheAndReload() {
    // Preserve essential app state (use correct key names!)
    const isGuestMode = localStorage.getItem('isGuestMode');
    const authUser = localStorage.getItem('auth-user');
    // Only preserve theme for logged-in users (guests should always use OS theme)
    const theme = user ? localStorage.getItem('gym-tracker-theme') : null;

    // Create promises for async cleanup operations
    const cleanupPromises: Promise<void>[] = [];

    // Clear browser cache API
    if ('caches' in window) {
      cleanupPromises.push(
        caches.keys().then((names) => {
          return Promise.all(names.map((name) => caches.delete(name)));
        }).then(() => {})
      );
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      cleanupPromises.push(
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          return Promise.all(registrations.map((r) => r.unregister()));
        }).then(() => {})
      );
    }

    // Wait for all async cleanup to complete
    await Promise.all(cleanupPromises);

    // Clear localStorage (except essential items) - use correct keys!
    // For guests, don't preserve theme (they should use OS preference)
    const keysToPreserve = user
      ? ['isGuestMode', 'gym-tracker-theme', 'auth-user']
      : ['isGuestMode', 'auth-user'];
    Object.keys(localStorage).forEach(key => {
      if (!keysToPreserve.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    // Hard reload with cache bypass
    window.location.reload();
  }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/analytics', label: 'Progress' },
    { to: '/program', label: 'Program' },
    { to: '/hyrox', label: 'Hyrox' },
    { to: '/exercises', label: 'Exercises' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="mx-auto px-3 sm:px-6 py-2 sm:py-3" style={{ maxWidth: '1536px' }}>
        <div className="flex items-center justify-between">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1 sm:gap-2 group flex-shrink-0">
              <Dumbbell className="text-secondary opacity-60 group-hover:opacity-100 transition-opacity" size={20} strokeWidth={1.5} />
              <span className="text-base sm:text-lg font-semibold text-primary tracking-tight">GymTracker Pro</span>
            </Link>

            {/* Navigation — horizontally scrollable so every link stays reachable
                on narrow phones instead of overflowing off-screen (portrait width
                isn't enough to fit logo + all 5 links + the right-side actions). */}
            <nav className="hyrox-nav-scroll flex items-center gap-1 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
              <style>{`.hyrox-nav-scroll::-webkit-scrollbar { display: none; }`}</style>
              {navLinks.map(({ to, label }) => {
                const isActive = location.pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className="relative px-2 sm:px-3 lg:px-4 py-2 lg:py-3 text-[10px] sm:text-xs lg:text-sm font-medium text-primary hover:text-secondary transition-colors whitespace-nowrap"
                    style={{
                      borderBottom: isActive ? `2px solid ${tokens.navigation.activeIndicator}` : '2px solid transparent',
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search + Actions */}
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {/* Search - Hidden on mobile */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-50" size={16} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search exercises..."
                style={{ width: '320px' }}
                className="pl-10 pr-4 py-2 bg-card text-primary text-sm border border-card rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple/50 focus:border-transparent transition-all placeholder:text-muted"
              />
            </div>
            {/* Offline Indicator - Hidden on small mobile */}
            <div className="hidden sm:block">
              <OfflineIndicator />
            </div>

            {/* Clear Cache Button - Hidden on mobile */}
            <button
              onClick={clearCacheAndReload}
              className="hidden sm:block p-2 rounded-md hover:bg-surface-accent transition-colors"
              title="Clear Cache & Reload"
            >
              <RotateCcw className="text-secondary opacity-60 hover:opacity-100 transition-opacity" size={18} strokeWidth={1.5} />
            </button>

            {/* Show different buttons for authenticated vs guest users */}
            {user ? (
              <>
                {/* Profile Button - authenticated only */}
                <button
                  onClick={() => navigate('/profile')}
                  className="p-1.5 sm:p-2 rounded-md hover:bg-surface-accent transition-colors"
                  title="Profile"
                >
                  <User className="text-secondary opacity-60 hover:opacity-100 transition-opacity" size={18} strokeWidth={1.5} />
                </button>

                {/* Start Workout - authenticated */}
                <button
                  onClick={() => navigate('/workout')}
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:outline-none"
                  style={{
                    backgroundColor: tokens.button.primaryBg,
                    color: tokens.button.primaryText,
                    border: tokens.button.primaryBorder === 'none' ? 'none' : `1px solid ${tokens.button.primaryBorder}`,
                    borderRadius: '10px',
                    height: '36px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.button.primaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.button.primaryBg;
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.button.primaryActive;
                    e.currentTarget.style.transform = 'translateY(1px)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = tokens.button.primaryHover;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${tokens.interactive.focusRing}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = tokens.button.primaryBg;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Start Workout
                </button>
              </>
            ) : (
              <>
                {/* Try Workout - guest mode - secondary button style */}
                <button
                  onClick={() => navigate('/workout')}
                  className="flex items-center gap-1 text-xs sm:text-sm font-medium transition-all focus:outline-none focus-visible:outline-none"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    height: '36px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-accent)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.transform = 'translateY(1px)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-accent)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${tokens.interactive.focusRing}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Plus size={16} strokeWidth={2} />
                  Try Workout
                </button>

                {/* Sign In button - guest mode - lighter blue style */}
                <button
                  onClick={() => navigate('/auth')}
                  className="flex items-center gap-1 text-xs sm:text-sm font-semibold transition-all focus:outline-none focus-visible:outline-none"
                  style={{
                    backgroundColor: theme === 'dark' ? '#0092E6' : theme === 'amoled' ? selectedColors.background : accentColors.background,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    height: '36px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#00A2FF' : accentColors.backgroundHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#0092E6' : theme === 'amoled' ? selectedColors.background : accentColors.background;
                    if (document.activeElement !== e.currentTarget) {
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#007FCC' : accentColors.background;
                    e.currentTarget.style.transform = 'translateY(1px)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#00A2FF' : accentColors.backgroundHover;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${tokens.interactive.focusRing}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = theme === 'dark' ? '#0092E6' : theme === 'amoled' ? selectedColors.background : accentColors.background;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
