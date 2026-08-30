import type { DaySlot, HyroxDay, HyroxDayType } from '../types/hyrox';
import { scalePaces, WEEKDAYS, START, fmtDate, DOW, mondayOf } from './hyroxPlan';

/* =====================================================================
 * HYBRID PLAN — HYROX conditioning interleaved with real bodybuilding
 * days (Upper A / Upper B), built around a calculable race-time budget
 * rather than percentile tiers. Ported from
 * /Users/kittypi/Axel/Hyrox/hyrox_sub60_training_plan.md.
 *
 * Unlike the Doubles plan, this is NOT pillar-swappable — the source
 * document's structure has real physiological sequencing (Wednesday's
 * Upper B explicitly follows Tuesday's threshold+legs with "no serious
 * running"; Friday's speed work precedes Saturday's compromised-running
 * day) that a free day-swap system would break. Monday–Sunday roles are
 * fixed; the dial that IS personal is the target race time.
 * ===================================================================== */

/* ================= TARGET-TIME SCALING ================= */
// The doc's own baseline: 59:00 total = 32:30 running + 22:30 stations +
// 4:00 RoxZone + ~1:00 buffer. Every other target scales proportionally
// against this baseline, the same mechanism as the Doubles plan's tier
// scaling (scalePaces), just against a continuous target instead of 3
// fixed points.
export const HYBRID_BASELINE_SECONDS = 3540; // 59:00
export const HYBRID_MIN_SECONDS = 3300; // 55:00 — aggressive
export const HYBRID_MAX_SECONDS = 4500; // 75:00 — conservative

export function formatMMSS(totalSeconds: number): string {
  const s = Math.round(totalSeconds % 60);
  if (totalSeconds >= 3600) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(totalSeconds / 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function scaleSeconds(baseSeconds: number, targetTotalSeconds: number): number {
  return Math.round(baseSeconds * (targetTotalSeconds / HYBRID_BASELINE_SECONDS));
}

interface StationBase { name: string; baseSeconds: number; }
const HYBRID_STATION_BASE: StationBase[] = [
  { name: 'SkiErg 1,000m', baseSeconds: 235 },
  { name: 'Sled Push', baseSeconds: 105 },
  { name: 'Sled Pull', baseSeconds: 180 },
  { name: 'Burpee Broad Jump', baseSeconds: 130 },
  { name: 'Row 1,000m', baseSeconds: 240 },
  { name: 'Farmer Carry', baseSeconds: 80 },
  { name: 'Sandbag Lunges', baseSeconds: 155 },
  { name: 'Wall Balls', baseSeconds: 210 },
];
const HYBRID_RUNNING_BASE_SECONDS = 1950; // 32:30 across 8km
const HYBRID_ROXZONE_BASE_SECONDS = 240; // 4:00

export function hybridTargetsForTime(targetTotalSeconds: number) {
  const runningTotal = scaleSeconds(HYBRID_RUNNING_BASE_SECONDS, targetTotalSeconds);
  const perKm = Math.round(runningTotal / 8);
  const stations = HYBRID_STATION_BASE.map((s) => ({ name: s.name, seconds: scaleSeconds(s.baseSeconds, targetTotalSeconds) }));
  const stationTotal = stations.reduce((sum, s) => sum + s.seconds, 0);
  const roxzone = scaleSeconds(HYBRID_ROXZONE_BASE_SECONDS, targetTotalSeconds);
  return {
    totalLabel: formatMMSS(targetTotalSeconds),
    runningTotalLabel: formatMMSS(runningTotal),
    perKmLabel: `${formatMMSS(perKm)}/km`,
    stations: stations.map((s) => ({ name: s.name, label: formatMMSS(s.seconds) })),
    stationTotalLabel: formatMMSS(stationTotal),
    roxzoneLabel: formatMMSS(roxzone),
  };
}

const paceFactor = (targetTotalSeconds: number) => targetTotalSeconds / HYBRID_BASELINE_SECONDS;

/* ================= FIXED WEEKLY TEMPLATE ================= */
// Badge-type convention for days that blend two activities (same
// precedent as the Doubles plan's "Upper + SkiErg intro" being typed
// 'gym'): the type reflects the day's headline stimulus; full content —
// including the secondary activity — lives in the detail text.
//  Mon: 'strength' (Upper A is a full dedicated lift block)
//  Tue: 'run' (threshold running is the day's defining stimulus)
//  Wed: 'strength' (Upper B, no running)
//  Thu: 'run' (pure aerobic engine)
//  Fri: 'run' (speed work is the point; physique pump is a short finisher)
//  Sat: 'sim' (compromised running + stations, same convention as Doubles)
//  Sun: 'rest'

const UPPER_A: [string, string] = ['Easy Run + Upper A', '35–50 min easy run, conversational, then: Incline bench 4×6–8 · Cable fly 3×10–15 · Lat pulldown 3×8–12 · Cable lateral raise 4×12–20 · Rear-delt fly 3×15–20 · Triceps pressdown 3×10–15'];
const UPPER_B: [string, string] = ['Upper B', 'No serious running. Incline press variation 3×8–12 · Cable row 4×8–12 · Lat pulldown 3×10–12 · Lateral raise 4×15–20 · Rear-delt fly 4×15–20 · Biceps 3×8–12 · Triceps 3×10–15'];
const AEROBIC_ENGINE: [string, string] = ['Aerobic Engine', '50–70 min easy running. No stations afterward — aerobic efficiency, HR control, recovery capacity.'];

interface ThresholdBand { minWeeksOut: number; title: string; detail: string; }
const THRESHOLD_BANDS: ThresholdBand[] = [
  { minWeeksOut: 8, title: 'Threshold + Legs', detail: '3×8 min threshold, 2 min easy recovery between efforts. Legs: Bulgarian split squat 3×6–8/leg · RDL 3×6–8 · weighted step-ups 3×10/leg · calves 3×10–15. Keep most work 1–2 RIR — running quality matters more than soreness.' },
  { minWeeksOut: 4, title: 'Threshold + Legs', detail: 'Progressing toward 4×2km around threshold/race effort, 2 min easy recovery. Legs: Bulgarian split squat 3×6–8/leg · RDL 3×6–8 · weighted step-ups 3×10/leg · calves 3×10–15. Keep most work 1–2 RIR.' },
  { minWeeksOut: -99, title: 'Threshold + Legs', detail: '4×2km around threshold/race effort, 2 min easy recovery. Legs: Bulgarian split squat 3×6–8/leg · RDL 3×6–8 · weighted step-ups 3×10/leg · calves 3×10–15. Keep most work 1–2 RIR.' },
];

interface SpeedBand { minWeeksOut: number; title: string; detail: string; }
const SPEED_BANDS: SpeedBand[] = [
  { minWeeksOut: 12, title: 'Speed Work — Phase 1', detail: '6×400m, controlled. + short physique pump: 2–3 sets each of lateral raises, rear delts, chest, lats, biceps, triceps. No leg work.' },
  { minWeeksOut: 8, title: 'Speed Work — Phase 2', detail: '5×800m. + short physique pump: 2–3 sets each of lateral raises, rear delts, chest, lats, biceps, triceps. No leg work.' },
  { minWeeksOut: 4, title: 'Speed Work — Phase 3', detail: '5–6×1km, 60–90s easy recovery. + short physique pump: 2–3 sets each of lateral raises, rear delts, chest, lats, biceps, triceps. No leg work.' },
  { minWeeksOut: -99, title: 'HYROX Running Speed', detail: '6×1km @ 3:55–4:00/km, 60–90s easy recovery — final reps still controlled. + short physique pump: 2–3 sets each of lateral raises, rear delts, chest, lats, biceps, triceps. No leg work.' },
];

interface SaturdayBand { minWeeksOut: number; title: string; detail: string; }
const SATURDAY_BANDS: SaturdayBand[] = [
  { minWeeksOut: 12, title: 'HYROX Specific — Base Block', detail: '2–4 km of compromised running. Example: 1km run → step-up sled simulation → 1km run → burpee broad jumps → 1km run → farmer carry → 1km run → lunges.' },
  { minWeeksOut: 6, title: 'HYROX Specific — Build Block', detail: '4–6 rounds of: 1km run + 1 HYROX station. Get access to real sled/SkiErg/rower/wall balls every 1–2 weeks if possible.' },
  { minWeeksOut: -99, title: 'HYROX Specific — Peak Block', detail: '5–8 rounds of: 1km at target race effort + HYROX station. Goal: finish the station and settle back near race pace immediately — not to destroy yourself.' },
];

function pickBand<T extends { minWeeksOut: number }>(bands: T[], weeksOut: number): T {
  return bands.find((b) => weeksOut >= b.minWeeksOut) ?? bands[bands.length - 1];
}

/** Running volume progression (km/week) — doc's own bands, by weeks out from race. */
export function hybridWeeklyRunningKm(weeksOut: number): string {
  if (weeksOut <= 1) return '~50% of peak (race week)';
  if (weeksOut <= 5) return '30–40 km (peak)';
  if (weeksOut <= 9) return '27–34 km';
  if (weeksOut <= 13) return '22–28 km';
  return '18–24 km';
}

const RACE_TAPER_TEMPLATE: Record<number, DaySlot> = {
  [-3]: ['run', 'Easy taper run', '25–30 min easy, a few strides. Volume dropping.'],
  [-2]: ['run', 'Short primer', '15–20 min easy + a few short pickups at race effort. No soreness.'],
  [-1]: ['rest', 'Rest + carbs', 'Walk only. Carb-load, hydrate, kit check, sleep priority.'],
  0: ['race', '🏁 RACE DAY — HYROX', 'Carb breakfast ~3h pre. Dynamic warm-up + strides. Execute the race budget — settle back to target pace after every station.'],
  1: ['rest', 'Recover', 'Walk, eat, celebrate.'],
  2: ['rest', 'Recover', ''],
  3: ['rest', 'Recover', ''],
};

/**
 * Builds one week's Mon–Sun content for a given "weeks out from race"
 * position and target time. weeksOut counts down to 0 at race week;
 * once inside the final ~3 days on either side of race day, the fixed
 * taper/race-day template takes over regardless of weekday role.
 */
function buildHybridWeek(weeksOut: number, targetTotalSeconds: number): Record<string, DaySlot> {
  const factor = paceFactor(targetTotalSeconds);
  const threshold = pickBand(THRESHOLD_BANDS, weeksOut);
  const speed = pickBand(SPEED_BANDS, weeksOut);
  const saturday = pickBand(SATURDAY_BANDS, weeksOut);

  return {
    Mon: ['strength', UPPER_A[0], UPPER_A[1]],
    Tue: ['run', threshold.title, scalePaces(threshold.detail, factor)],
    Wed: ['strength', UPPER_B[0], UPPER_B[1]],
    Thu: ['run', AEROBIC_ENGINE[0], AEROBIC_ENGINE[1]],
    Fri: ['run', speed.title, scalePaces(speed.detail, factor)],
    Sat: ['sim', saturday.title, scalePaces(saturday.detail, factor)],
    Sun: ['rest', 'Full Rest', 'Walk, eat, sleep, mobility if desired. No workout.'],
  };
}

/* ================= PERSONALIZED SCHEDULE ================= */
// Unlike the Doubles plan, this never needed a fixed pre-authored week
// table — every week's content is already computed live from "weeks out
// from race," so anchoring to whenever the person actually started
// (planStartDate) instead of a shared historical date needs no
// compression logic at all: it just naturally generates however many
// weeks actually exist between start and race day.
export function buildHybridPersonalDays(raceDate: string, targetTotalSeconds: number = HYBRID_BASELINE_SECONDS, planStartDate: string = ''): HyroxDay[] {
  const raceMs = new Date(raceDate + 'T12:00:00').getTime();
  const endMs = raceMs + 3 * 86400000; // a few recovery days past race day
  const days: HyroxDay[] = [];

  const cursor = planStartDate ? mondayOf(planStartDate) : new Date(START);
  let week = 1;
  while (cursor.getTime() <= endMs) {
    const weekStartMs = cursor.getTime();
    const weeksOut = Math.ceil((raceMs - weekStartMs) / (7 * 86400000));
    const weekContent = buildHybridWeek(weeksOut, targetTotalSeconds);

    for (let i = 0; i < 7; i++) {
      const dt = new Date(cursor);
      dt.setDate(cursor.getDate() + i);
      if (dt.getTime() > endMs) break;
      const iso = fmtDate(dt);
      if (planStartDate && iso < planStartDate) continue; // never show days before they actually started
      const dw = WEEKDAYS[i];
      const offsetFromRace = Math.round((dt.getTime() - raceMs) / 86400000);

      let slot: DaySlot;
      if (offsetFromRace >= -3 && offsetFromRace <= 3) {
        slot = RACE_TAPER_TEMPLATE[Math.max(-3, Math.min(3, offsetFromRace))];
      } else {
        slot = weekContent[dw];
      }
      const [type, title, detail] = slot;
      days.push({ date: iso, week, dow: dw, type: type as HyroxDayType, title, detail });
    }
    cursor.setDate(cursor.getDate() + 7);
    week++;
  }
  return days;
}

export const DEFAULT_HYBRID_DAYS: HyroxDay[] = buildHybridPersonalDays('2026-12-03');

/* ================= STATIC REFERENCE CONTENT ================= */
export const HYBRID_HYPERTROPHY_VOLUME: [string, string][] = [
  ['Chest', '10–14 hard sets/week'],
  ['Lats / Back', '12–16 hard sets/week'],
  ['Side + Rear Delts', '14–20 hard sets/week'],
  ['Biceps', '6–9 hard sets/week'],
  ['Triceps', '6–9 hard sets/week'],
];
export const HYBRID_PHYSIQUE_PRIORITIES: string[] = ['Upper chest', 'Side delts', 'Rear delts', 'Lats', 'Arms'];

export const HYBRID_HOME_GYM_SUBS: [string, string][] = [
  ['SkiErg', 'Straight-arm cable pulldowns / high-rep cable work'],
  ['Sled Push', 'Heavy weighted step-ups'],
  ['Sled Pull', 'Heavy cable pulling'],
  ['Burpee Broad Jump', 'Actual burpee broad jumps (no substitute needed)'],
  ['Row', 'Squat + cable-row combination'],
  ['Farmer Carry', 'Heavy dumbbells/implements per hand'],
  ['Sandbag Lunges', 'Loaded lunges'],
  ['Wall Balls', 'Light plate squat-to-press'],
];
export const HYBRID_SUBS_NOTE = 'These substitutions build fitness, but actual HYROX equipment should be practiced regularly before race day.';

export const HYBRID_ADJUSTMENT_SYSTEM: { level: string; color: string; when: string; action: string }[] = [
  { level: 'Green', color: '#16A34A', when: 'Performance improving, recovery good.', action: 'Continue progression as planned.' },
  { level: 'Yellow', color: '#B7791F', when: 'Running pace worsens 2+ workouts in a row, strength falls, legs stay heavy, sleep quality declines.', action: 'Reduce lifting volume ~20% for one week while maintaining intensity.' },
  { level: 'Red', color: '#E03131', when: 'Persistent joint/tendon pain, or performance drops significantly.', action: 'Stop progressing volume. Deload.' },
];

export const HYBRID_BENCHMARK_EVENTS: string[] = ['5K', 'SkiErg 1000m', 'Row 1000m', 'Compromised 4×1km'];

export const HYBRID_FRESH_5K_BENCHMARKS: [string, string][] = [
  ['>22:00', 'Running is currently the largest bottleneck'],
  ['21:00–22:00', 'Developing'],
  ['20:00–21:00', 'Sub-60 running becomes plausible with strong stations'],
  ['<20:00', 'Excellent cushion'],
];

export { DOW };
