import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, LogOut, Download, Printer, Flame } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeTokens } from '../utils/themeHelpers';
import { useHyroxProgress, useSaveHyroxProgress } from '../hooks/useHyroxProgress';
import { useHyroxGuestProgress } from '../hooks/useHyroxGuestProgress';
import { useHyroxGroup, useInvalidateHyroxGroup } from '../hooks/useHyroxGroup';
import { createGroup, joinGroup, leaveGroup, isHyroxAdmin } from '../services/hyroxService';
import { TimeWheelPicker } from '../components/hyrox/TimeWheelPicker';
import { DayRow, TYPE_COLOR, TYPE_LABEL } from '../components/hyrox/DayRow';
import { ProgressRing } from '../components/hyrox/ProgressRing';
import { StationShowcase } from '../components/hyrox/StationShowcase';
import { STATIONS, WEEKDAYS, fmtDate, pretty, makeICS, STATION_FOULS } from '../data/hyroxPlan';
import {
  buildHybridPersonalDays, hybridTargetsForTime, hybridWeeklyRunningKm,
  HYBRID_BASELINE_SECONDS, HYBRID_MIN_SECONDS, HYBRID_MAX_SECONDS, formatMMSS,
  HYBRID_HYPERTROPHY_VOLUME, HYBRID_PHYSIQUE_PRIORITIES, HYBRID_HOME_GYM_SUBS, HYBRID_SUBS_NOTE,
  HYBRID_ADJUSTMENT_SYSTEM, HYBRID_BENCHMARK_EVENTS, HYBRID_FRESH_5K_BENCHMARKS,
} from '../data/hyroxHybridPlan';
import { DEFAULT_RACE_DATE } from '../types/hyrox';

type Tab = 'today' | 'plan' | 'track' | 'group' | 'race' | 'setup';

const QUICK_TARGETS = [3540, 3720, 3900, 4200]; // 59:00, 62:00, 65:00, 70:00

function weeksOutLabel(weeksOut: number): string {
  if (weeksOut <= 1) return 'Race / Taper';
  if (weeksOut <= 5) return 'Peak';
  if (weeksOut <= 12) return 'Build';
  return 'Base';
}

export default function HyroxHybrid() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const tokens = useThemeTokens();
  const [tab, setTab] = useState<Tab>('today');
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [printMode, setPrintMode] = useState(false);
  const [bmDraft, setBmDraft] = useState({ event: HYBRID_BENCHMARK_EVENTS[0], time: '' });
  const [stationDraft, setStationDraft] = useState<Record<string, string>>({});
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupErr, setGroupErr] = useState('');

  const { data: progress } = useHyroxProgress(user?.id);
  const saveProgressRemote = useSaveHyroxProgress(user?.id);
  const { data: guestProgress, save: saveGuestProgress } = useHyroxGuestProgress();
  const { data: groupInfo, isLoading: groupLoading, refetch: refetchGroup } = useHyroxGroup();
  const invalidateGroup = useInvalidateHyroxGroup();

  const done = user ? (progress?.done ?? {}) : guestProgress.done;
  const times = user ? (progress?.times ?? guestProgress.times) : guestProgress.times;
  const benchmarks = user ? (progress?.benchmarks ?? []) : guestProgress.benchmarks;
  const stations = user ? (progress?.stations ?? {}) : guestProgress.stations;
  const raceDate = user ? (progress?.raceDate ?? DEFAULT_RACE_DATE) : guestProgress.raceDate;
  const targetTotalSeconds = user ? (progress?.targetTotalSeconds ?? HYBRID_BASELINE_SECONDS) : guestProgress.targetTotalSeconds;
  const planStartDate = user ? (progress?.planStartDate ?? '') : guestProgress.planStartDate;

  const saveProgress = (patch: Partial<Pick<typeof guestProgress, 'done' | 'times' | 'benchmarks' | 'stations' | 'raceDate' | 'targetTotalSeconds' | 'planStartDate'>>) => {
    if (user) { void saveProgressRemote(patch); } else { saveGuestProgress(patch); }
  };

  // Captured once, the first time this loads with no start date set, then
  // left fixed — so opening the app always looks like Day 1 instead of
  // landing mid-plan with an invented backlog of days never had a chance
  // to do.
  useEffect(() => {
    if (!planStartDate && (user ? progress !== undefined : true)) {
      saveProgress({ planStartDate: fmtDate(new Date()) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planStartDate, user, progress]);

  const days = useMemo(
    () => buildHybridPersonalDays(raceDate, targetTotalSeconds, planStartDate),
    [raceDate, targetTotalSeconds, planStartDate],
  );
  const targets = useMemo(() => hybridTargetsForTime(targetTotalSeconds), [targetTotalSeconds]);

  const partner = groupInfo?.members.find((m) => m.userId !== user?.id);
  const { data: partnerProgress } = useHyroxProgress(partner?.userId, { isPartner: true });

  const todayISO = fmtDate(new Date());
  const today = days.find((d) => d.date === todayISO) || days.find((d) => d.date > todayISO) || days[days.length - 1];
  const daysToRace = Math.max(0, Math.round((new Date(raceDate).getTime() - new Date(todayISO).getTime()) / 86400000));
  const planStartISO = days[0]?.date ?? todayISO;
  const totalPlanDays = Math.max(1, Math.round((new Date(raceDate).getTime() - new Date(planStartISO).getTime()) / 86400000));
  const planElapsedFraction = 1 - daysToRace / totalPlanDays;
  const doneCount = Object.values(done).filter(Boolean).length;
  const totalSessions = days.filter((d) => d.type !== 'rest').length;
  const curWeek = today.week;
  const curWeeksOut = Math.max(0, Math.ceil((new Date(raceDate).getTime() - new Date(today.date).getTime()) / (7 * 86400000)));

  useEffect(() => {
    setOpenWeek((prev) => (prev === null ? curWeek : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catchUpDays = days.filter((d) => d.date < todayISO && d.type !== 'rest' && !done[d.date]).slice(-8);
  const weekNumbers = useMemo(() => Array.from(new Set(days.map((d) => d.week))).sort((a, b) => a - b), [days]);

  const toggleDone = (date: string) => {
    saveProgress({ done: { ...done, [date]: !done[date] } });
  };
  const setTime = (dow: string, v: string) => {
    saveProgress({ times: { ...times, [dow]: v } });
  };
  const setTargetTime = (seconds: number) => {
    const clamped = Math.max(HYBRID_MIN_SECONDS, Math.min(HYBRID_MAX_SECONDS, seconds));
    saveProgress({ targetTotalSeconds: clamped });
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
          html, body { background: #fff !important; }
          body * { visibility: hidden; }
          .hyrox-print-area, .hyrox-print-area * { visibility: visible; }
          .hyrox-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; }
          .no-print { display: none !important; }
          .hyrox-print-area div:not(.badge-chip), .hyrox-print-area span:not(.badge-chip),
          .hyrox-print-area td, .hyrox-print-area p { color: #131316 !important; background: transparent !important; }
          .hyrox-print-area * { border-color: #d1d5db !important; }
          .hyrox-print-area .badge-chip { color: #fff !important; }
          .hyrox-print-area .week-block { page-break-inside: avoid; margin-bottom: 14px; }
        }
      `}</style>

      {/* Header card */}
      <div className="no-print flex items-center justify-between rounded-lg p-4 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-xl font-black text-primary flex items-center gap-1.5"><Flame size={20} color="#E03131" /> HYBRID ROAD</div>
          <div className="text-xs text-secondary font-mono mt-0.5">
            TARGET {targets.totalLabel} · {new Date(raceDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </div>
        </div>
        <ProgressRing value={planElapsedFraction} color="#E03131" center={String(daysToRace)} sublabel="DAYS TO RACE" />
      </div>

      <div className="no-print flex gap-3 mb-3">
        <button onClick={() => navigate('/hyrox?choose=1')} className="text-xs text-secondary underline">Switch plan</button>
        {isHyroxAdmin(user?.email) && (
          <button onClick={() => navigate('/hyrox/admin')} className="text-xs text-secondary underline">View all groups (admin)</button>
        )}
      </div>

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
              ? { background: '#E03131', color: '#fff' }
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
              <span className="text-xs text-secondary font-mono">{pretty(today.date)} · WEEK {today.week} · {weeksOutLabel(curWeeksOut)}</span>
              <span className="badge-chip text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: TYPE_COLOR[today.type] }}>{TYPE_LABEL[today.type]}</span>
            </div>
            <div className="text-2xl font-black text-primary my-2">{today.title}</div>
            {today.detail && <div className="text-sm text-secondary">{today.detail}</div>}
            {today.type !== 'rest' && (
              <button
                onClick={() => toggleDone(today.date)}
                className="w-full mt-3 py-3 rounded-md font-bold text-sm"
                style={done[today.date] ? { background: '#FFD500', color: '#131316' } : { background: '#E03131', color: '#fff' }}
              >
                {done[today.date] ? '✓ DONE — punched in' : 'MARK IT DONE'}
              </button>
            )}
          </div>

          <div className="flex gap-2.5 mt-3.5 items-stretch">
            <div className="rounded-lg p-2.5 flex items-center justify-center" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
              <ProgressRing value={totalSessions ? doneCount / totalSessions : 0} size={52} strokeWidth={5} color="#FFD500" center={String(doneCount)} sublabel={`OF ${totalSessions} DONE`} />
            </div>
            {[
              ['This week', hybridWeeklyRunningKm(curWeeksOut)],
              ['Block', weeksOutLabel(curWeeksOut)],
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
                  <div className="mt-0.5"><TimeWheelPicker value={times[dw]} onChange={(v) => setTime(dw, v)} /></div>
                </label>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => download(makeICS(days, times), 'hyrox-hybrid-plan.ics')}
                className="flex-1 min-w-[160px] py-2.5 rounded-md font-bold text-sm flex items-center justify-center gap-1.5"
                style={{ background: '#E03131', color: '#fff' }}
              >
                <Download size={16} /> Download → Google Calendar (.ics)
              </button>
              <button onClick={printPlan} className="px-3.5 py-2.5 rounded-md font-bold text-sm flex items-center gap-1.5" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                <Printer size={16} /> Print
              </button>
            </div>
            <div className="text-xs text-secondary mt-1.5">In Google Calendar: Settings → Import &amp; export → Import the .ics file.</div>
          </div>

          {catchUpDays.length > 0 && (
            <div className="no-print rounded-lg p-3 mb-3.5" style={{ background: tokens.surface.elevated, border: '1px solid #E03131' }}>
              <div className="text-sm font-black text-primary mb-1">CATCH UP</div>
              <div className="text-xs text-secondary mb-2">Sessions from the last little while still unchecked. Check off what you actually did.</div>
              {catchUpDays.map((d) => <DayRow key={d.date} d={d} showWeek done={!!done[d.date]} onToggle={toggleDone} />)}
            </div>
          )}

          {weekNumbers.map((w) => {
            const weekDays = days.filter((d) => d.week === w);
            const open = printMode || openWeek === w;
            const firstDate = weekDays[0]?.date;
            const weeksOut = firstDate ? Math.max(0, Math.ceil((new Date(raceDate).getTime() - new Date(firstDate).getTime()) / (7 * 86400000))) : 0;
            return (
              <div key={w} className="mb-2 week-block">
                <button
                  className="no-print w-full text-left px-3 py-2.5 rounded-md flex justify-between items-center gap-2"
                  style={{ border: `1px solid ${w === curWeek ? 'var(--text-primary)' : 'var(--border-subtle)'}`, borderLeft: '4px solid #E03131', background: w === curWeek ? tokens.surface.accent : tokens.surface.elevated }}
                  onClick={() => setOpenWeek(open ? null : w)}
                >
                  <span>
                    <span className="font-bold text-primary">Week {w}</span>
                    <span className="text-[11px] text-secondary font-mono ml-2">{firstDate ? new Date(firstDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} · {weeksOutLabel(weeksOut)}</span>
                  </span>
                  <span className="text-primary">{open ? '−' : '+'}</span>
                </button>
                {printMode && <div className="font-black text-sm text-primary my-2">WEEK {w} · {weeksOutLabel(weeksOut)}</div>}
                {open && <div className="px-1">{weekDays.map((d) => <DayRow key={d.date} d={d} done={!!done[d.date]} onToggle={toggleDone} printMode={printMode} />)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* SETUP */}
      {tab === 'setup' && !printMode && (
        <div className="no-print space-y-4">
          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">YOUR RACE DATE</div>
            <div className="text-xs text-secondary mb-3">Different heat than your training partner? Set your own actual race day.</div>
            <input
              type="date" value={raceDate}
              onChange={(e) => e.target.value && saveProgress({ raceDate: e.target.value })}
              className="px-2 py-1.5 rounded text-sm"
              style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary }}
            />
          </div>

          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">YOUR START DATE</div>
            <div className="text-xs text-secondary mb-3">Set automatically to the day you first opened this. Change it if that's wrong — Week 1 and the whole calendar shift to match.</div>
            <input
              type="date" value={planStartDate}
              onChange={(e) => e.target.value && saveProgress({ planStartDate: e.target.value })}
              className="px-2 py-1.5 rounded text-sm"
              style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary }}
            />
          </div>

          <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            <div className="text-sm font-black text-primary mb-1">TARGET RACE TIME</div>
            <div className="text-xs text-secondary mb-3">
              Not a fixed tier — a calculated budget. Every running pace and station target below scales against this number, the same math the source plan uses for its own sub-60 baseline.
            </div>
            <div className="text-3xl font-black text-primary mb-2" style={{ color: '#E03131' }}>{targets.totalLabel}</div>
            <input
              type="range" min={HYBRID_MIN_SECONDS} max={HYBRID_MAX_SECONDS} step={15}
              value={targetTotalSeconds}
              onChange={(e) => setTargetTime(parseInt(e.target.value, 10))}
              className="w-full mb-3"
            />
            <div className="flex gap-2 flex-wrap">
              {QUICK_TARGETS.map((secs) => (
                <button
                  key={secs}
                  onClick={() => setTargetTime(secs)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={targetTotalSeconds === secs
                    ? { background: '#E03131', color: '#fff' }
                    : { background: 'transparent', color: tokens.text.secondary, border: '1px solid var(--border-subtle)' }}
                >
                  {formatMMSS(secs)}
                </button>
              ))}
            </div>
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
                {HYBRID_BENCHMARK_EVENTS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <input type="text" placeholder="Time e.g. 21:40" value={bmDraft.time} onChange={(e) => setBmDraft({ ...bmDraft, time: e.target.value })}
                className="flex-1 min-w-[100px] px-2 py-2 rounded text-sm" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }} />
              <button
                onClick={() => { if (!bmDraft.time) return; saveProgress({ benchmarks: [...benchmarks, { ...bmDraft, date: todayISO }] }); setBmDraft({ event: HYBRID_BENCHMARK_EVENTS[0], time: '' }); }}
                className="px-4 py-2 rounded font-bold text-sm" style={{ background: '#E03131', color: '#fff' }}
              >
                Log
              </button>
            </div>
            {benchmarks.length === 0 ? (
              <div className="text-sm text-secondary mt-2.5">No benchmarks yet. Run a fresh 5K baseline first — not after lifting, not after a HYROX session.</div>
            ) : (
              <table className="w-full mt-2.5 text-sm" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {benchmarks.map((b, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td className="py-1.5 text-secondary font-mono">{pretty(b.date)}</td>
                      <td className="font-semibold text-primary">{b.event}</td>
                      <td className="font-bold font-mono text-primary">{b.time}</td>
                      <td className="text-right"><button onClick={() => saveProgress({ benchmarks: benchmarks.filter((_, j) => j !== i) })} className="text-secondary">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-base font-black text-primary mb-2">FRESH 5K → SUB-60 READINESS</div>
          <div className="rounded-lg p-3 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {HYBRID_FRESH_5K_BENCHMARKS.map(([time, meaning]) => (
              <div key={time} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="font-bold font-mono text-primary">{time}</span>
                <span className="text-sm text-secondary text-right">{meaning}</span>
              </div>
            ))}
          </div>

          <div className="text-base font-black text-primary mb-2">STATION BESTS</div>
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
                  <button onClick={handleCreateGroup} disabled={groupBusy} className="px-4 py-2 rounded font-bold text-sm" style={{ background: '#E03131', color: '#fff' }}>Create</button>
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
                <div className="text-sm font-black text-primary mb-2">JOIN WITH A CODE</div>
                <div className="flex gap-2">
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="6-character code" className="flex-1 px-2 py-2 rounded text-sm font-mono uppercase" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }} />
                  <button onClick={handleJoinGroup} disabled={groupBusy} className="px-4 py-2 rounded font-bold text-sm" style={{ background: '#E03131', color: '#fff' }}>Join</button>
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
                        <div className="rounded-lg p-2.5 flex items-center justify-center" style={{ background: tokens.surface.primary, border: '1px solid var(--border-subtle)' }}>
                          <ProgressRing value={totalSessions ? partnerDoneCount / totalSessions : 0} size={52} strokeWidth={5} color="#FFD500" center={String(partnerDoneCount)} sublabel={`OF ${totalSessions} DONE`} />
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

      {/* RACE */}
      {tab === 'race' && !printMode && (
        <div className="no-print">
          <div className="text-base font-black text-primary mb-2">RACE BUDGET <span className="text-xs text-secondary font-normal">(target {targets.totalLabel})</span></div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.accent }}>
            {[
              ['Running (8 × 1km)', targets.runningTotalLabel, targets.perKmLabel],
              ['Stations total', targets.stationTotalLabel, ''],
              ['RoxZone (8 transitions)', targets.roxzoneLabel, ''],
            ].map(([l, v, sub]) => (
              <div key={l} className="flex justify-between items-baseline py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm text-secondary">{l}</span>
                <span>
                  <span className="font-bold font-mono" style={{ color: '#E03131' }}>{v}</span>
                  {sub && <span className="text-xs text-secondary font-mono ml-1.5">({sub})</span>}
                </span>
              </div>
            ))}
          </div>

          <div className="text-base font-black text-primary mb-2">STATION TARGETS</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {targets.stations.map((s) => (
              <div key={s.name} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm text-secondary">{s.name}</span>
                <span className="font-bold font-mono" style={{ color: '#E03131' }}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="text-base font-black text-primary mb-2">HYPERTROPHY VOLUME (weekly)</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {HYBRID_HYPERTROPHY_VOLUME.map(([muscle, sets]) => (
              <div key={muscle} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-sm text-secondary">{muscle}</span>
                <span className="font-bold font-mono text-primary">{sets}</span>
              </div>
            ))}
            <div className="text-xs text-secondary mt-2">Priority order: {HYBRID_PHYSIQUE_PRIORITIES.join(' → ')}.</div>
          </div>

          <div className="text-base font-black text-primary mb-2">HOME-GYM SUBSTITUTIONS</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {HYBRID_HOME_GYM_SUBS.map(([station, sub]) => (
              <div key={station} className="py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="text-sm font-semibold text-primary">{station}</div>
                <div className="text-xs text-secondary">{sub}</div>
              </div>
            ))}
            <div className="text-xs text-secondary mt-2 italic">{HYBRID_SUBS_NOTE}</div>
          </div>

          <div className="text-base font-black text-primary mb-2">ADJUSTMENT SYSTEM</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
            {HYBRID_ADJUSTMENT_SYSTEM.map((lvl) => (
              <div key={lvl.level} className="py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="text-sm font-black mb-0.5" style={{ color: lvl.color }}>{lvl.level}</div>
                <div className="text-xs text-secondary mb-0.5">{lvl.when}</div>
                <div className="text-xs font-semibold text-primary">{lvl.action}</div>
              </div>
            ))}
          </div>

          <div className="text-base font-black text-primary mb-2">FOULS TO WATCH FOR, BY STATION</div>
          <div className="text-xs text-secondary mb-2">
            Common Hyrox judging standards — worth a final check against the official rulebook before race day, since penalty specifics can change season to season.
          </div>
          <StationShowcase stations={STATION_FOULS} />
        </div>
      )}
    </div>
  );
}
