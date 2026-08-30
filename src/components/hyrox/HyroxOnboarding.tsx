import { useState } from 'react';
import { useThemeTokens } from '../../utils/themeHelpers';
import { fmtDate } from '../../data/hyroxPlan';

/**
 * First-touch setup, shown once (gated on planStartDate being empty)
 * instead of silently defaulting race date / start date / ambition to
 * today + a hardcoded constant. Those fields stayed editable in Setup
 * either way — this just makes the choice visible and deliberate the
 * first time, rather than invisible.
 */
export function HyroxOnboarding({
  raceDateDefault, onComplete, children,
}: {
  raceDateDefault: string;
  onComplete: (raceDate: string, startDate: string) => void;
  children: React.ReactNode;
}) {
  const tokens = useThemeTokens();
  const [raceDate, setRaceDate] = useState(raceDateDefault);
  const [startDate, setStartDate] = useState(fmtDate(new Date()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-lg shadow-xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        style={{ background: tokens.surface.elevated }}
      >
        <div className="text-xl font-black text-primary mb-1">Let's set up your race</div>
        <div className="text-sm text-secondary mb-5">Takes 10 seconds — change any of this later in Setup.</div>

        <div className="mb-4">
          <div className="text-sm font-black text-primary mb-1">YOUR RACE DATE</div>
          <input
            type="date"
            value={raceDate}
            onChange={(e) => e.target.value && setRaceDate(e.target.value)}
            className="px-2 py-1.5 rounded text-sm"
            style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary }}
          />
        </div>

        <div className="mb-4">
          <div className="text-sm font-black text-primary mb-1">YOUR START DATE</div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
            className="px-2 py-1.5 rounded text-sm"
            style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary }}
          />
        </div>

        {children}

        <button
          onClick={() => onComplete(raceDate, startDate)}
          className="w-full mt-5 py-3 rounded-md font-bold text-sm"
          style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}
        >
          Start training
        </button>
      </div>
    </div>
  );
}
