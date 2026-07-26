import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Copy, LogOut, Download, Printer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useThemeTokens } from '../utils/themeHelpers';
import { useHyroxProgress, useSaveHyroxProgress } from '../hooks/useHyroxProgress';
import { useHyroxGuestProgress } from '../hooks/useHyroxGuestProgress';
import { useHyroxGroup, useInvalidateHyroxGroup } from '../hooks/useHyroxGroup';
import { createGroup, joinGroup, leaveGroup, isHyroxAdmin } from '../services/hyroxService';
import {
  ALL_DAYS, W, phaseOf, TARGETS, RULES, SHOP, STATIONS, RACE_DAY, fmtDate, pretty, makeICS, START,
} from '../data/hyroxPlan';
import type { HyroxDay, HyroxDayType } from '../types/hyrox';

const TYPE_COLOR: Record<HyroxDayType, string> = {
  run: '#2B6CB0', strength: '#5A5E68', gym: '#B7791F', sim: '#C05621', rest: '#8A8A9A', race: '#E03131',
};
const TYPE_LABEL: Record<HyroxDayType, string> = {
  run: 'RUN', strength: 'LIFT', gym: 'GYM', sim: 'SIM', rest: 'REST', race: 'RACE',
};

type Tab = 'today' | 'plan' | 'track' | 'group' | 'race';

function DayRow({
  d, showWeek, done, onToggle,
}: { d: HyroxDay; showWeek?: boolean; done: boolean; onToggle?: (date: string) => void }) {
  return (
    <div className="flex gap-3 py-2.5 items-start" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => d.type !== 'rest' && onToggle?.(d.date)}
        aria-label="mark done"
        disabled={!onToggle || d.type === 'rest'}
        className="rounded flex items-center justify-center text-xs font-black shrink-0"
        style={{
          width: 26, height: 26,
          border: `2px solid ${d.type === 'rest' ? 'var(--border-medium)' : 'var(--text-primary)'}`,
          background: done ? '#FFD500' : 'transparent',
          color: '#131316',
          cursor: onToggle && d.type !== 'rest' ? 'pointer' : 'default',
        }}
      >
        {done ? '✓' : ''}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 items-baseline flex-wrap">
          <span className="text-[11px] text-secondary font-mono">{pretty(d.date)}{showWeek ? ` · W${d.week}` : ''}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
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

  const saveProgress = (patch: Partial<Pick<typeof guestProgress, 'done' | 'times' | 'benchmarks' | 'stations'>>) => {
    if (user) { void saveProgressRemote(patch); } else { saveGuestProgress(patch); }
  };

  const partner = groupInfo?.members.find((m) => m.userId !== user?.id);
  const { data: partnerProgress } = useHyroxProgress(partner?.userId, { isPartner: true });

  const todayISO = fmtDate(new Date());
  const today = ALL_DAYS.find((d) => d.date === todayISO) || ALL_DAYS.find((d) => d.date > todayISO) || ALL_DAYS[ALL_DAYS.length - 1];
  const daysToRace = Math.max(0, Math.round((new Date(RACE_DAY).getTime() - new Date(todayISO).getTime()) / 86400000));
  const doneCount = Object.values(done).filter(Boolean).length;
  const totalSessions = ALL_DAYS.filter((d) => d.type !== 'rest').length;
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
    <div className="max-w-3xl mx-auto px-4 pb-16 pt-4">
      <style>{`@media print { .no-print { display: none !important; } body, div { background: #fff !important; } }`}</style>

      {/* Header card */}
      <div className="no-print flex items-center justify-between rounded-lg p-4 mb-4" style={{ background: tokens.surface.elevated, border: '1px solid var(--border-subtle)' }}>
        <div>
          <div className="text-xl font-black text-primary">HYROX ROAD</div>
          <div className="text-xs text-secondary font-mono mt-0.5">DOUBLES OPEN · DEC 3 2026</div>
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
          ['today', 'Today'], ['plan', 'Plan'], ['track', 'Track'], ['group', 'Group'], ['race', 'Race'],
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
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: TYPE_COLOR[today.type] }}>{TYPE_LABEL[today.type]}</span>
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
              ['This week', curWeek ? `${W[curWeek]?.km ?? '–'} km` : 'prep'],
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
            {ALL_DAYS.filter((d) => d.date >= todayISO).slice(0, 7).map((d) => (
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
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-3">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dw) => (
                <label key={dw} className="text-[11px] text-secondary">
                  {dw}
                  <input
                    type="time" value={times[dw]}
                    onChange={(e) => setTime(dw, e.target.value)}
                    className="w-full mt-0.5 px-1.5 py-1 rounded text-xs"
                    style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: 'var(--text-primary)' }}
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => download(makeICS(ALL_DAYS, times), 'hyrox-19-weeks.ics')}
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
                <div key={w} className="mb-2">
                  <button className="no-print w-full text-left px-3 py-2.5 rounded-md flex justify-between" style={{ border: '1px solid var(--border-subtle)', background: tokens.surface.elevated }} onClick={() => setOpenWeek(open ? null : 0)}>
                    <span className="font-bold text-primary">Week 0 — Prep (Jul 23–26)</span><span className="text-primary">{open ? '−' : '+'}</span>
                  </button>
                  {printMode && <div className="font-black text-sm text-primary my-2">WEEK 0 — PREP</div>}
                  {open && <div className="px-1">{ALL_DAYS.filter((d) => d.week === 0).map((d) => <DayRow key={d.date} d={d} done={!!done[d.date]} onToggle={toggleDone} />)}</div>}
                </div>
              );
            }
            const wk = W[w]; const ph = phaseOf(w);
            const open = printMode || openWeek === w;
            const start = new Date(START); start.setDate(START.getDate() + (w - 1) * 7);
            return (
              <div key={w} className="mb-2">
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
                {open && <div className="px-1">{ALL_DAYS.filter((d) => d.week === w).map((d) => <DayRow key={d.date} d={d} done={!!done[d.date]} onToggle={toggleDone} />)}</div>}
              </div>
            );
          })}
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
                className="px-4 py-2 rounded font-bold text-sm" style={{ background: tokens.button.primaryBg, color: tokens.button.primaryText, opacity: user ? 1 : 0.5 }}
              >
                Log
              </button>
            </div>
            {benchmarks.length === 0 ? (
              <div className="text-sm text-secondary mt-2.5">No benchmarks yet. First one: 5K time trial. Targets: W0 baseline → W5 ~26:00 → W10 ~24:00 → W14 ~22:30.</div>
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
                  onBlur={(e) => { if (user) saveProgress({ stations: { ...stations, [s]: e.target.value } }); }}
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
                      {ALL_DAYS.filter((d) => d.date <= todayISO).slice(-5).map((d) => (
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
          <div className="text-base font-black text-primary mb-2">TARGETS</div>
          <div className="rounded-lg p-3.5 mb-4" style={{ background: tokens.surface.accent }}>
            {TARGETS.map(([l, v]) => (
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
