import { pretty } from '../../data/hyroxPlan';
import type { HyroxDay, HyroxDayType } from '../../types/hyrox';

export const TYPE_COLOR: Record<HyroxDayType, string> = {
  run: '#2B6CB0', strength: '#5A5E68', gym: '#B7791F', sim: '#C05621', rest: '#8A8A9A', race: '#E03131',
};
export const TYPE_LABEL: Record<HyroxDayType, string> = {
  run: 'RUN', strength: 'LIFT', gym: 'GYM', sim: 'SIM', rest: 'REST', race: 'RACE',
};

// Shared across every Hyrox plan page — one row representing a single
// training day, with a checkbox to mark it done.
export function DayRow({
  d, showWeek, done, onToggle, printMode,
}: { d: HyroxDay; showWeek?: boolean; done: boolean; onToggle?: (date: string) => void; printMode?: boolean }) {
  // In print, every day gets a real checkbox to physically tick off with a
  // pen — rest days aren't excluded there the way the on-screen toggle
  // excludes them (nothing to "mark done" digitally for a rest day, but on
  // paper you still want to check it off as you go through the week).
  const checkable = printMode || (!!onToggle && d.type !== 'rest');
  return (
    <div className="flex gap-3 py-2.5 items-start" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => checkable && !printMode && onToggle?.(d.date)}
        aria-label="mark done"
        disabled={!checkable || printMode}
        className="rounded flex items-center justify-center text-xs font-black shrink-0"
        style={{
          width: 34, height: 34,
          border: `2px solid ${printMode ? '#131316' : checkable ? 'var(--text-primary)' : 'var(--border-medium)'}`,
          background: done ? '#FFD500' : 'transparent',
          color: '#131316',
          cursor: checkable && !printMode ? 'pointer' : 'default',
        }}
      >
        {done ? '✓' : ''}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-baseline flex-wrap">
          <span className="text-[11px] text-secondary font-mono">{pretty(d.date)}{showWeek ? ` · W${d.week}` : ''}</span>
          <span
            className="badge-chip text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
            style={{ background: TYPE_COLOR[d.type] }}
          >
            {TYPE_LABEL[d.type]}
          </span>
        </div>
        <div className="font-bold text-sm text-primary" style={{ textDecoration: done ? 'line-through' : 'none' }}>{d.title}</div>
        {d.detail ? <div className="text-xs text-secondary mt-0.5">{d.detail}</div> : null}
      </div>
    </div>
  );
}
