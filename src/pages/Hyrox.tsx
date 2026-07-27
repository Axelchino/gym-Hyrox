import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, LogOut, Download, Printer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeTokens } from '../utils/themeHelpers';
import { useHyroxProgress, useSaveHyroxProgress } from '../hooks/useHyroxProgress';
import { useHyroxGuestProgress } from '../hooks/useHyroxGuestProgress';
import { useHyroxGroup, useInvalidateHyroxGroup } from '../hooks/useHyroxGroup';
import { createGroup, joinGroup, leaveGroup, isHyroxAdmin } from '../services/hyroxService';
import { TimeWheelPicker } from '../components/hyrox/TimeWheelPicker';
import {
  buildPersonalDays, WEEKS_BY_TIER, TARGETS_BY_TIER, TIER_LABEL, TIER_RECOVERY_FLOOR, WEEKDAYS,
  phaseOf, RULES, SHOP, STATIONS, RACE_DAY, fmtDate, pretty, makeICS, START, WEEK19,
} from '../data/hyroxPlan';
import type {
  HyroxDay, HyroxDayType, HyroxTier, HyroxWeek, PillarRole, RecoveryOption,
} from '../types/hyrox';
import { DEFAULT_PILLAR_DAY_MAP, DEFAULT_RECOVERY_CHOICES } from '../types/hyrox';

const TYPE_COLOR: Record<HyroxDayType, string> = {
  run: '#2B6CB0', strength: '#5A5E68', gym: '#B7791F', sim: '#C05621', rest: '#8A8A9A', race: '#E03131',
};
const TYPE_LABEL: Record<HyroxDayType, string> = {
  run: 'RUN', strength: 'LIFT', gym: 'GYM', sim: 'SIM', rest: 'REST', race: 'RACE',
};
const PILLAR_LABELS: Record<PillarRole, string> = {
  lift: 'Lift day', qualityRun: 'Quality run', gym: 'Hyrox-gym day (Ski/sled/rower)', longOrSim: 'Long run / Sim day',
};
const PILLAR_ORDER: PillarRole[] = ['lift', 'qualityRun', 'gym', 'longOrSim'];
const RECOVERY_LABELS: Record<RecoveryOption, string> = {
  rest: 'Rest', easyWalk: 'Easy walk / mobility', easyRun: 'Easy run', easyLift: 'Easy lift',
};
const RECOVERY_OPTIONS: RecoveryOption[] = ['rest', 'easyWalk', 'easyRun', 'easyLift'];
const TIER_ORDER: HyroxTier[] = ['top5', 'top10', 'top20'];

const TIER_DESCRIPTIONS: Record<HyroxTier, string> = {
  top5: 'Target: 1:02–1:05 team time (roughly the top 5% of finishers). The bold goal — needs disciplined pacing and all 4 core sessions every week. Only 1 mandatory recovery day: put the other 2 toward Easy Run if you can — running pace is what actually separates finishing times, not extra lifting.',
  top10: 'Target: sub-1:07 team time. A strong, very achievable goal for a first Hyrox season. 2 mandatory recovery days — more room to recover between hard sessions than Top 5%.',
  top20: 'Target: sub-1:13 team time. The safest on-ramp, built for people newer to structured running. All 3 recovery days stay Rest/Walk while you build a base — nothing optional to add yet.',
};

// One extra run day is exactly what "Easy Run" is — the highest-leverage
// upgrade on a recovery day, since running pace (not strength) decides
// where you land. Shown once as a shared legend rather than repeated
// per-day, so the Setup screen doesn't read like 12 near-identical dropdowns.
const RECOVERY_DESCRIPTIONS: Record<RecoveryOption, string> = {
  rest: 'Full recovery. Zero training stress — necessary, not optional.',
  easyWalk: 'Active recovery: a walk + light stretching. Still counts as rest.',
  easyRun: 'One more run day. The single highest-leverage upgrade for race pace — pick this over Easy Lift if you can only add one.',
  easyLift: 'Optional light strength/mobility filler. Nice-to-have — strength isn\'t what separates finishing times here.',
};

type Tab = 'today' | 'plan' | 'track' | 'group' | 'race' | 'setup';

function DayRow({
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
          width: 26, height: 26,
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

export default function Hyrox() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<Tab>('today');
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [bmDraft, setBmDraft] = useState({ event: '5K', time: '' });
  const [stationDraft, setStationDraft] = useState<Record<string, string>>({});
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupErr, setGroupErr] = useState('');
  const [pendingTier, setPendingTier] = useState<HyroxTier | null>(null);

  const { data: progress } = useHyroxProgress(user?.id);
  const saveProgressRemote = useSaveHyroxProgress(user?.id);
  const { data: guestProgress, save: saveGuestProgress } = useHyroxGuestProgress();
  const { data: groupInfo, isLoading: groupLoading, refetch: refetchGroup } = useHyroxGroup();
  const invalidateGroup = useInvalidateHyroxGroup();

  // Signed-in: Supabase-backed (syncs across devices, visible to a group
  // partner). Guest: localStorage-backed, same as hyrox-planner.jsx always
  // worked — no account required to actually use the tracker.
  const done = user ? (progress?.done ?? {}) : guestProgress.done;
  const times = user ? (progress?.times ?? guestProgress.times) : guestProgress.times;
  const benchmarks = user ? (progress?.benchmarks ?? []) : guestProgress.benchmarks;
  const stations = user ? (progress?.stations ?? {}) : guestProgress.stations;
  const pillarDayMap = user ? (progress?.pillarDayMap ?? DEFAULT_PILLAR_DAY_MAP) : guestProgress.pillarDayMap;
  const recoveryChoices = user ? (progress?.recoveryChoices ?? DEFAULT_RECOVERY_CHOICES) : guestProgress.recoveryChoices;
  const tier: HyroxTier = user ? (progress?.tier ?? 'top5') : guestProgress.tier;

  const saveProgress = (patch: Partial<Pick<typeof guestProgress, 'done' | 'times' | 'benchmarks' | 'stations' | 'pillarDayMap' | 'recoveryChoices' | 'tier'>>) => {
    if (user) { void saveProgressRemote(patch); } else { saveGuestProgress(patch); }
  };

  const weeks = WEEKS_BY_TIER[tier];
  const targets = TARGETS_BY_TIER[tier];
  const recoveryDays = useMemo(
    () => WEEKDAYS.filter((dw) => !Object.values(pillarDayMap).includes(dw)),
    [pillarDayMap],
  );
  const days = useMemo(
    () => buildPersonalDays(pillarDayMap, recoveryChoices, tier),
    [pillarDayMap, recoveryChoices, tier],
  );

  const partner = groupInfo?.members.find((m) => m.userId !== user?.id);
  const { data: partnerProgress } = useHyroxProgress(partner?.userId, { isPartner: true });

  const todayISO = fmtDate(new Date());
  const today = days.find((d) => d.date === todayISO) || days.find((d) => d.date > todayISO) || days[days.length - 1];
  const daysToRace = Math.max(0, Math.round((new Date(RACE_DAY).getTime() - new Date(todayISO).getTime()) / 86400000));
  const doneCount = Object.values(done).filter(Boolean).length;
  const totalSessions = days.filter((d) => d.type !== 'rest').length;
  const curWeek = today.week;

  const toggleDone = (date: string) => {
    saveProgress({ done: { ...done, [date]: !done[date] } });
  };

  const setTime = (dow: string, v: string) => {
    saveProgress({ times: { ...times, [dow]: v } });
  };

  const download = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const printPlan = () => {
    setPrintMode(true);
    setTimeout(() => { window.print(); setPrintMode(false); }, 100);
  };

  // Picking a day for a pillar swaps it with whichever pillar (or
  // recovery day) currently owns that day — always exactly 4 pillar days
  // and 3 recovery days, never a duplicate or a missing one.
  const setPillarDay = (role: PillarRole, newDay: string) => {
    const current = pillarDayMap[role];
    if (current === newDay) return;
    const otherRole = (Object.keys(pillarDayMap) as PillarRole[]).find((r) => pillarDayMap[r] === newDay);
    const nextPillarMap = { ...pillarDayMap, [role]: newDay };
    const nextRecovery = { ...recoveryChoices };
    if (otherRole) {
      nextPillarMap[otherRole] = current;
    } else {
      delete nextRecovery[newDay];
      nextRecovery[current] = 'rest';
    }
    saveProgress({ pillarDayMap: nextPillarMap, recoveryChoices: nextRecovery });
  };

  const recoveryFloorCount = (choices: typeof recoveryChoices) =>
    recoveryDays.filter((d) => choices[d] === 'rest' || choices[d] === 'easyWalk').length;

  const setRecoveryChoice = (day: string, option: RecoveryOption) => {
    const next = { ...recoveryChoices, [day]: option };
    const floor = TIER_RECOVERY_FLOOR[tier];
    if (recoveryFloorCount(next) < floor) return; // would drop below this tier's mandatory recovery floor
    saveProgress({ recoveryChoices: next });
  };

  const applyTier = (newTier: HyroxTier) => {
    const floor = TIER_RECOVERY_FLOOR[newTier];
    const nextRecovery = { ...recoveryChoices };
    for (const d of recoveryDays) {
      if (recoveryFloorCount(nextRecovery) >= floor) break;
      if (nextRecovery[d] !== 'rest' && nextRecovery[d] !== 'easyWalk') nextRecovery[d] = 'rest';
    }
    saveProgress({ tier: newTier, recoveryChoices: nextRecovery });
    setPendingTier(null);
  };

  const selectTier = (newTier: HyroxTier) => {
    if (newTier === tier) return;
    const isDowngrade = TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(tier);
    if (isDowngrade) setPendingTier(newTier); else applyTier(newTier);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setGroupBusy(true); setGroupErr('');
    try {
      await createGroup(groupName.trim());
      setGroupName('');
      await refetchGroup(); invalidateGroup();
    } catch (e: any) {
      setGroupErr(e.message || 'Could not create group');
    } finally { setGroupBusy(false); }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;
    setGroupBusy(true); setGroupErr('');
    try {
      await joinGroup(joinCode.trim());
      setJoinCode('');
      await refetchGroup(); invalidateGroup();
    } catch (e: any) {
      setGroupErr(e.message || 'Could not join group — check the code');
    } finally { setGroupBusy(false); }
  };

  const handleLeaveGroup = async () => {
    if (!groupInfo) return;
    setGroupBusy(true);
    try {
      await leaveGroup(groupInfo.group.id);
      await refetchGroup(); invalidateGroup();
    } finally { setGroupBusy(false); }
  };

  const partnerDoneCount = partnerProgress ? Object.values(partnerProgress.done).filter(Boolean).length : 0;

  return (
    <div className="hyrox-print-area max-w-3xl mx-auto px-4 pb-16 pt-4">
      <style>{`
        @media print {
          /* Hide the surrounding app chrome (header/nav/banners) entirely —
             only this component's content should end up on the page. */
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          .hyrox-print-area, .hyrox-print-area * { visibility: visible; }
          .hyrox-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #fff !important;
          }
          .no-print { display: none !important; }
          /* Force real black-on-white regardless of the active theme (dark
             mode text is light-colored and would be near-invisible here).
             Excludes .badge-chip so its colored fill survives. */
          .hyrox-print-area div:not(.badge-chip), .hyrox-print-area span:not(.badge-chip),
          .hyrox-print-area td, .hyrox-print-area p {
            color: #131316 !important;
            background: transparent !important;
          }
          .hyrox-print-area * { border-color: #d1d5db !important; }
          .hyrox-print-area .badge-chip { color: #fff !important; }
          .hyrox-print-area .week-block { page-break-inside: avoid; margin-bottom: 14px; }
        }
      `}</style>

      {/* Header card */}
      <div className="no-print flex items-center justify-between rounded-lg p-4 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-xl font-black text-primary">HYROX ROAD</div>
          <div className="text-xs text-secondary font-mono mt-0.5">DOUBLES OPEN · DEC 3 2026 · {TIER_LABEL[tier]}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-primary">{daysToRace}</div>
          <div className="text-[10px] text-secondary font-mono">DAYS TO RACE</div>
        </div>
      </div>

      {isHyroxAdmin(user?.email) && (
        <button onClick={() => navigate('/hyrox/admin')} className="no-print text-xs text-secondary underline mb-3">
          View all groups (admin)
        </button>
      )}

      {isGuest && (
        <div className="no-print rounded-lg p-3 mb-4 text-sm" style={{ background: tokens.chip.background, color: tokens.chip.text, border: `1px solid ${tokens.chip.border}` }}>
          You're tracking locally on this device. Sign in to sync across devices and train with a partner in a group.{' '}
          <button className="font-semibold underline" onClick={() => navigate('/auth')}>Sign in</button>
        </div>
      )}

      {/* Tabs */}
      <div className="no-print flex gap-1 mb-4 flex-wrap">
        {([
          ['today', 'Today'], ['plan', 'Plan'], ['track', 'Track'], ['group', 'Group'], ['race', 'Race'], ['setup', 'Setup'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide"
            style={tab === id
              ? { background: tokens.button.primaryBg, color: tokens.button.primaryText }
              : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {tab === 'today' && !printMode && (
        <div className="no-print">
          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-secondary font-mono">{pretty(today.date)} · WEEK {today.week} · {today.week ? phaseOf(today.week).name : 'PREP'}</span>
              <span className="badge-chip text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: TYPE_COLOR[today.type] }}>{TYPE_LABEL[today.type]}</span>
            </div>
            <div className="text-2xl font-black text-primary my-2">{today.title}</div>
            {today.detail && <div className="text-sm text-secondary">{today.detail}</div>}
            {today.type !== 'rest' && (
              <button
                onClick={() => toggleDone(today.date)}
                className="w-full mt-3 py-3 rounded-md font-bold text-sm"
                style={done[today.date]
                  ? { background: '#FFD500', color: '#131316' }
                  : { background: tokens.button.primaryBg, color: tokens.button.primaryText }}
              >
                {done[today.date] ? '✓ DONE — punched in' : 'MARK IT DONE'}
              </button>
            )}
          </div>

          <div className="flex gap-2.5 mt-3.5">
            {[
              ['Sessions done', `${doneCount}/${totalSessions}`],
              ['This week', curWeek && curWeek <= 18 ? `${weeks[curWeek]?.km ?? '–'} km` : curWeek === 19 ? `${WEEK19.km} km` : 'prep'],
              ['Phase', curWeek ? phaseOf(curWeek).name.split('· ')[1] : 'Prep'],
            ].map(([l, v]) => (
              <div key={l} className="flex-1 rounded-lg p-2.5" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                <div className="text-lg font-black text-primary">{v}</div>
                <div className="text-[10px] text-secondary font-mono">{l.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="text-sm font-black text-primary mb-1">NEXT 7 DAYS</div>
            {days.filter((d) => d.date >= todayISO).slice(0, 7).map((d) => (
              <DayRow key={d.date} d={d} showWeek done={!!done[d.date]} onToggle={toggleDone} />
            ))}
          </div>
        </div>
      )}

      {/* PLAN */}
      {(tab === 'plan' || printMode) && (
        <div>
          <div className="no-print rounded-lg p-3 mb-3.5" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-2">YOUR TRAINING TIMES</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {WEEKDAYS.map((dw) => (
                <label key={dw} className="text-[11px] text-secondary">
                  {dw}
                  <div className="mt-0.5">
                    <TimeWheelPicker value={times[dw]} onChange={(v) => setTime(dw, v)} />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => download(makeICS(days, times), 'hyrox-19-weeks.ics')}
                className="flex-1 min-w-[160px] py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-1.5"
                style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}
              >
                <Download size={16} /> Download → Google Calendar (.ics)
              </button>
              <button onClick={printPlan} className="px-3.5 py-2.5 rounded-md font-bold text-sm flex items-center gap-1.5" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <Printer size={16} /> Print
              </button>
            </div>
            <div className="text-xs text-secondary mt-1.5">In Google Calendar: Settings → Import &amp; export → Import the .ics file.</div>
          </div>

          {[...Array(20).keys()].map((w) => {
            if (w === 0) {
              const open = printMode || openWeek === 0;
              return (
                <div key={w} className="mb-2 week-block">
                  <button className="no-print w-full text-left px-3 py-2.5 rounded-md flex justify-between" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.elevated }} onClick={() => setOpenWeek(open ? null : 0)}>
                    <span className="font-bold text-primary">Week 0 — Prep (Jul 23–26)</span><span className="text-primary">{open ? '−' : '+'}</span>
                  </button>
                  {printMode && <div className="font-black text-sm text-primary my-2">WEEK 0 — PREP</div>}
                  {open && <div className="px-1">{days.filter((d) => d.week === 0).map((d) => <DayRow key={d.date} d={d} done={!!done[d.date]} onToggle={toggleDone} printMode={printMode} />)}</div>}
                </div>
              );
            }
            const wk: Pick<HyroxWeek, 'km' | 'deload' | 'race' | 'bench'> = w === 19 ? { km: WEEK19.km, race: WEEK19.race } : weeks[w];
            const ph = phaseOf(w);
            const open = printMode || openWeek === w;
            const start = new Date(START); start.setDate(START.getDate() + (w - 1) * 7);
            return (
              <div key={w} className="mb-2 week-block">
                <button
                  className="no-print w-full text-left px-3 py-2.5 rounded-md flex justify-between items-center gap-2"
                  style={{ border: `1px solid ${w === curWeek ? 'var(--text-primary)' : 'var(--border-subtle)'}`, borderLeft: `4px solid ${ph.color}`, background: w === curWeek ? tokens.surface.accent : tokens.surface.elevated }}
                  onClick={() => setOpenWeek(open ? null : w)}
                >
                  <span>
                    <span className="font-bold text-primary">Week {w}</span>
                    <span className="text-[11px] text-secondary font-mono ml-2">{start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {ph.name} · {wk.km} km{wk.deload ? ' · DELOAD' : ''}{wk.race ? ' · RACE' : ''}</span>
                    {wk.bench && <span className="block text-[11px] font-bold font-mono" style={{ color: '#B7791F' }}>★ {wk.bench}</span>}
                  </span>
                  <span className="text-primary">{open ? '−' : '+'}</span>
                </button>
                {printMode && <div className="font-black text-sm text-primary my-2">WEEK {w} · {ph.name} · {wk.km} km {wk.deload ? '· DELOAD' : ''}</div>}
                {open && <div className="px-1">{days.filter((d) => d.week === w).map((d) => <DayRow key={d.date} d={d} done={!!done[d.date]} onToggle={toggleDone} printMode={printMode} />)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* SETUP */}
      {tab === 'setup' && !printMode && (
        <div className="no-print space-y-4">
          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">AMBITION TIER</div>
            <div className="text-xs text-secondary mb-3">Changes pacing targets and how much rest is required. Top 5% is the expectation — downgrading needs a confirm.</div>
            <div className="flex gap-2">
              {TIER_ORDER.map((t) => (
                <button
                  key={t}
                  onClick={() => selectTier(t)}
                  className="flex-1 py-2 rounded-md font-bold text-sm"
                  style={tier === t
                    ? { background: tokens.button.primaryBg, color: tokens.button.primaryText }
                    : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="text-sm text-primary mt-3 rounded-md p-3" style={{ background: tokens.surface.accent }}>
              {TIER_DESCRIPTIONS[tier]}
            </div>
            {pendingTier && (
              <div className="mt-3 rounded-md p-3 text-sm" style={{ background: tokens.chip.background, color: tokens.chip.text }}>
                Sure? {TIER_LABEL[tier]} is where the real gains are — {TIER_LABEL[pendingTier]} is a real downgrade, not just a label. 😏
                <div className="mt-1 opacity-80">{TIER_DESCRIPTIONS[pendingTier]}</div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => applyTier(pendingTier)} className="px-3 py-1.5 rounded font-bold text-xs" style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}>
                    Yes, downgrade
                  </button>
                  <button onClick={() => setPendingTier(null)} className="px-3 py-1.5 rounded font-bold text-xs" style={{ border: '1px solid var(--border-subtle)' }}>
                    Never mind
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">CORE SESSIONS</div>
            <div className="text-xs text-secondary mb-3">Exactly one of each per week — pick which real day it lands on. Picking a day swaps it with whatever's currently there.</div>
            {PILLAR_ORDER.map((role) => (
              <label key={role} className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm font-semibold text-primary">{PILLAR_LABELS[role]}</span>
                <select
                  value={pillarDayMap[role]}
                  onChange={(e) => setPillarDay(role, e.target.value)}
                  className="px-2 py-1.5 rounded text-sm"
                  style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }}
                >
                  {WEEKDAYS.map((dw) => <option key={dw} value={dw}>{dw}</option>)}
                </select>
              </label>
            ))}
          </div>

          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">RECOVERY DAYS</div>
            <div className="text-xs text-secondary mb-3">
              Your {recoveryDays.length} flexible days — pick what each one does.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {RECOVERY_OPTIONS.map((opt) => (
                <div key={opt} className="text-xs rounded-md p-2" style={{ background: tokens.surface.accent }}>
                  <span className="font-bold text-primary">{RECOVERY_LABELS[opt]}</span>
                  <div className="text-secondary mt-0.5">{RECOVERY_DESCRIPTIONS[opt]}</div>
                </div>
              ))}
            </div>

            <div
              className="text-xs font-bold mb-3 rounded-md px-2.5 py-1.5 inline-block"
              style={recoveryFloorCount(recoveryChoices) >= TIER_RECOVERY_FLOOR[tier]
                ? { background: 'rgba(34,197,94,0.15)', color: '#16A34A' }
                : { background: tokens.chip.background, color: tokens.chip.text }}
            >
              {recoveryFloorCount(recoveryChoices) >= TIER_RECOVERY_FLOOR[tier]
                ? `✓ Recovery requirement met (${recoveryFloorCount(recoveryChoices)} of ${recoveryDays.length} days)`
                : `${TIER_LABEL[tier]} needs ${TIER_RECOVERY_FLOOR[tier] - recoveryFloorCount(recoveryChoices)} more Rest/Walk day${TIER_RECOVERY_FLOOR[tier] - recoveryFloorCount(recoveryChoices) > 1 ? 's' : ''}`}
            </div>

            {tier !== 'top20' && recoveryFloorCount(recoveryChoices) > TIER_RECOVERY_FLOOR[tier] && (
              <div className="text-xs rounded-md p-2.5 mb-3" style={{ background: 'rgba(234,88,12,0.12)', color: '#C2410C' }}>
                You're resting {recoveryFloorCount(recoveryChoices) - TIER_RECOVERY_FLOOR[tier]} more day{recoveryFloorCount(recoveryChoices) - TIER_RECOVERY_FLOOR[tier] > 1 ? 's' : ''} than {TIER_LABEL[tier]} requires. That's the safe floor, not the target — if you actually want {TIER_LABEL[tier]}, switch a Rest day to Easy Run: running pace is what closes the gap, not extra recovery.
              </div>
            )}

            {recoveryDays.map((dw) => {
              const current = recoveryChoices[dw] ?? 'rest';
              return (
                <div key={dw} className="py-2.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="text-sm font-semibold text-primary mb-1.5">{dw}</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {RECOVERY_OPTIONS.map((opt) => {
                      const isCurrent = opt === current;
                      const disabled = !isCurrent
                        && (opt === 'easyRun' || opt === 'easyLift')
                        && recoveryFloorCount({ ...recoveryChoices, [dw]: opt }) < TIER_RECOVERY_FLOOR[tier];
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => setRecoveryChoice(dw, opt)}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={isCurrent
                            ? { background: tokens.button.primaryBg, color: tokens.button.primaryText }
                            : { background: 'transparent', color: tokens.text.secondary, border: '1px solid var(--border-subtle)', opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
                        >
                          {RECOVERY_LABELS[opt]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TRACK */}
      {tab === 'track' && !printMode && (
        <div className="no-print">
          <div className="text-base font-black text-primary mb-2">BENCHMARKS</div>
          <div className="rounded-lg p-3 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="flex gap-2 flex-wrap">
              <select value={bmDraft.event} onChange={(e) => setBmDraft({ ...bmDraft, event: e.target.value })} className="px-2 py-2 rounded text-sm" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }}>
                {['5K', 'SkiErg 1000m', 'Row 1000m', 'Half sim', 'Full sim'].map((o) => <option key={o}>{o}</option>)}
              </select>
              <input type="text" placeholder="Time e.g. 26:41" value={bmDraft.time} onChange={(e) => setBmDraft({ ...bmDraft, time: e.target.value })}
                className="flex-1 min-w-[100px] px-2 py-2 rounded text-sm" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }} />
              <button
                onClick={() => { if (!bmDraft.time) return; saveProgress({ benchmarks: [...benchmarks, { ...bmDraft, date: todayISO }] }); setBmDraft({ event: '5K', time: '' }); }}
                className="px-4 py-2 rounded font-bold text-sm" style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}
              >
                Log
              </button>
            </div>
            {benchmarks.length === 0 ? (
              <div className="text-sm text-secondary mt-2.5">No benchmarks yet. First one: 5K time trial.</div>
            ) : (
              <table className="w-full mt-2.5 text-sm" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {benchmarks.map((b, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td className="py-1.5 text-secondary font-mono">{pretty(b.date)}</td>
                      <td className="font-semibold text-primary">{b.event}</td>
                      <td className="font-bold font-mono text-primary">{b.time}</td>
                      <td className="text-right">
                        <button onClick={() => saveProgress({ benchmarks: benchmarks.filter((_, j) => j !== i) })} className="text-secondary">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-base font-black text-primary mb-2">STATION BESTS <span className="text-xs text-secondary font-normal">(your half, from sims)</span></div>
          <div className="rounded-lg p-3" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {STATIONS.map((s) => (
              <div key={s} className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm font-semibold text-primary">{s}</span>
                <input
                  type="text" placeholder="—:—"
                  value={stationDraft[s] ?? stations[s] ?? ''}
                  onChange={(e) => setStationDraft({ ...stationDraft, [s]: e.target.value })}
                  onBlur={(e) => saveProgress({ stations: { ...stations, [s]: e.target.value } })}
                  className="w-20 text-right px-1.5 py-1 rounded text-sm font-mono" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROUP */}
      {tab === 'group' && !printMode && (
        <div className="no-print">
          {isGuest ? (
            <div className="text-sm text-secondary">Sign in to create or join a Hyrox group with your partner.</div>
          ) : groupLoading ? (
            <div className="text-sm text-secondary">Loading…</div>
          ) : !groupInfo ? (
            <div className="space-y-4">
              <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm font-black text-primary mb-2 flex items-center gap-1.5"><Users size={16} /> START A GROUP</div>
                <div className="flex gap-2">
                  <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Axel & Sam" className="flex-1 px-2 py-2 rounded text-sm" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }} />
                  <button onClick={handleCreateGroup} disabled={groupBusy} className="px-4 py-2 rounded font-bold text-sm" style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}>Create</button>
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm font-black text-primary mb-2">JOIN WITH A CODE</div>
                <div className="flex gap-2">
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="6-character code" className="flex-1 px-2 py-2 rounded text-sm font-mono uppercase" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }} />
                  <button onClick={handleJoinGroup} disabled={groupBusy} className="px-4 py-2 rounded font-bold text-sm" style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText }}>Join</button>
                </div>
              </div>
              {groupErr && <div className="text-sm" style={{ color: TYPE_COLOR.race }}>{groupErr}</div>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-black text-primary">{groupInfo.group.name}</div>
                    <div className="text-xs text-secondary mt-0.5">{groupInfo.members.length}/2 members</div>
                  </div>
                  <button onClick={handleLeaveGroup} disabled={groupBusy} className="flex items-center gap-1 text-xs text-secondary"><LogOut size={14} /> Leave</button>
                </div>
                {groupInfo.members.length < 2 && (
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-secondary">Invite code:</span>
                    <span className="font-mono font-bold text-lg tracking-widest text-primary">{groupInfo.group.inviteCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(groupInfo.group.inviteCode)} className="text-secondary"><Copy size={14} /></button>
                  </div>
                )}
              </div>

              {partner ? (
                <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                  <div className="text-sm font-black text-primary mb-2">{partner.name || partner.email || 'Your partner'}'S PROGRESS</div>
                  {partnerProgress ? (
                    <>
                      <div className="flex gap-2.5 mb-3">
                        <div className="flex-1 rounded-lg p-2.5" style={{ background: tokens.surface.primary, border: '1px solid var(--border-subtle)' }}>
                          <div className="text-lg font-black text-primary">{partnerDoneCount}/{totalSessions}</div>
                          <div className="text-[10px] text-secondary font-mono">SESSIONS DONE</div>
                        </div>
                      </div>
                      {partnerProgress.benchmarks.length > 0 && (
                        <>
                          <div className="text-xs font-bold text-secondary mb-1">BENCHMARKS</div>
                          <table className="w-full text-sm mb-3" style={{ borderCollapse: 'collapse' }}>
                            <tbody>
                              {partnerProgress.benchmarks.map((b, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                  <td className="py-1 text-secondary font-mono">{pretty(b.date)}</td>
                                  <td className="font-semibold text-primary">{b.event}</td>
                                  <td className="font-bold font-mono text-primary text-right">{b.time}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </>
                      )}
                      <div className="text-xs font-bold text-secondary mb-1">RECENT DAYS</div>
                      {days.filter((d) => d.date <= todayISO).slice(-5).map((d) => (
                        <DayRow key={d.date} d={d} showWeek done={!!partnerProgress.done[d.date]} />
                      ))}
                    </>
                  ) : <div className="text-sm text-secondary">Loading partner's progress…</div>}
                </div>
              ) : (
                <div className="rounded-lg p-4 text-sm text-secondary" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                  Share the invite code above with your partner — once they join, their progress shows up here.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RACE / REMEMBER */}
      {tab === 'race' && !printMode && (
        <div className="no-print">
          <div className="text-base font-black text-primary mb-2">TARGETS <span className="text-xs text-secondary font-normal">({TIER_LABEL[tier]})</span></div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.accent }}>
            {targets.map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm text-secondary">{l}</span>
                <span className="font-bold font-mono" style={{ color: '#B7791F' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="text-base font-black text-primary mb-2">NEVER FORGET</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {RULES.map((r, i) => (
              <div key={i} className="flex gap-2.5 py-1.5" style={{ borderBottom: i < RULES.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ color: TYPE_COLOR.race, fontWeight: 900 }}>!</span>
                <span className="text-sm text-primary">{r}</span>
              </div>
            ))}
          </div>
          <div className="text-base font-black text-primary mb-2">STILL TO BUY</div>
          <div className="rounded-lg p-3.5" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {SHOP.map((s) => {
              const key = 'shop:' + s;
              return (
                <label key={s} className="flex gap-2.5 items-center py-1.5 cursor-pointer">
                  <input type="checkbox" checked={!!done[key]} onChange={() => toggleDone(key)} style={{ width: 16, height: 16 }} />
                  <span className="text-sm text-primary" style={{ textDecoration: done[key] ? 'line-through' : 'none', opacity: done[key] ? 0.6 : 1 }}>{s}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
