import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { Dumbbell, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeTokens } from '../utils/themeHelpers';
import { useHyroxProgress, useSaveHyroxProgress } from '../hooks/useHyroxProgress';
import { useHyroxGuestProgress } from '../hooks/useHyroxGuestProgress';
import type { HyroxPlanId } from '../types/hyrox';

const PLAN_ROUTE: Record<HyroxPlanId, string> = { doubles: '/hyrox/doubles', hybrid: '/hyrox/hybrid' };

/**
 * `/hyrox` — a lightweight redirector, not a page you normally see. If a
 * plan is already set, it sends you straight there; the actual picker UI
 * only shows on an explicit `?choose=1` (each plan page links back here
 * via "Switch plan"), so switching is always available without every
 * repeat visit having to click through a landing page first.
 */
export default function HyroxPlanPicker() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const tokens = useThemeTokens();

  const { data: progress } = useHyroxProgress(user?.id);
  const saveProgressRemote = useSaveHyroxProgress(user?.id);
  const { data: guestProgress, save: saveGuestProgress } = useHyroxGuestProgress();

  const planId: HyroxPlanId = user ? (progress?.planId ?? 'doubles') : guestProgress.planId;
  const forceChoice = searchParams.get('choose') === '1';

  if (!forceChoice) {
    return <Navigate to={PLAN_ROUTE[planId]} replace />;
  }

  const choosePlan = (id: HyroxPlanId) => {
    if (user) { void saveProgressRemote({ planId: id }); } else { saveGuestProgress({ planId: id }); }
    navigate(PLAN_ROUTE[id]);
  };

  const cards: { id: HyroxPlanId; icon: typeof Dumbbell; title: string; subtitle: string; blurb: string; color: string }[] = [
    {
      id: 'doubles', icon: Dumbbell, color: '#2B6CB0',
      title: 'Doubles — Top 5/10/20%',
      subtitle: '19-week percentile-tier program',
      blurb: 'A structured doubles build with a Setup screen for rearranging your training days and picking an ambition tier (Top 5/10/20%) that scales pacing and rest.',
    },
    {
      id: 'hybrid', icon: Flame, color: '#E03131',
      title: 'Hybrid — Sub-60 + Lifting',
      subtitle: 'HYROX conditioning + real lifting days',
      blurb: 'A hybrid regime: HYROX-specific running and stations interleaved with genuine upper-body bodybuilding days. Pick your own target race time instead of a fixed tier.',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-6">
      <div className="text-xl font-black text-primary mb-1">CHOOSE YOUR HYROX PLAN</div>
      <div className="text-sm text-secondary mb-5">
        {isGuest ? "You're browsing as a guest — this choice is saved on this device." : 'You can switch plans anytime from inside either one.'}
      </div>
      <div className="space-y-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => choosePlan(c.id)}
            className="w-full text-left rounded-lg p-4 flex gap-3.5 items-start"
            style={{
              background: tokens.surface.elevated,
              border: `1px solid ${planId === c.id ? c.color : 'var(--border-subtle)'}`,
              borderLeftWidth: 4,
            }}
          >
            <div className="rounded-full p-2 shrink-0" style={{ background: `${c.color}22` }}>
              <c.icon size={22} color={c.color} />
            </div>
            <div>
              <div className="font-black text-primary">{c.title}</div>
              <div className="text-xs font-mono text-secondary mb-1.5">{c.subtitle}</div>
              <div className="text-sm text-secondary">{c.blurb}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
