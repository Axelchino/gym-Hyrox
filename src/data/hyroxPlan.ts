import type {
  DaySlot, HyroxDay, HyroxPhase, HyroxTier, HyroxWeek, PillarDayMap, RecoveryChoices, RecoveryOption,
} from '../types/hyrox';
import { DEFAULT_PILLAR_DAY_MAP, DEFAULT_RECOVERY_CHOICES } from '../types/hyrox';

/* ================= PLAN DATA ================= */
// Weeks are Monday-start. Week 1 = Mon Jul 27 2026. Race = Thu Dec 3 2026 (Week 19).
export const START = new Date(2026, 6, 27); // Mon Jul 27 2026
export const RACE_DAY = '2026-12-03';

export const PHASES: Record<number, HyroxPhase> = {
  1: { name: 'P1 · Reboot', weeks: [1, 2, 3, 4], color: '#70737C' },
  2: { name: 'P2 · Build', weeks: [5, 6, 7, 8, 9], color: '#2B6CB0' },
  3: { name: 'P3 · Specific', weeks: [10, 11, 12, 13, 14], color: '#B7791F' },
  4: { name: 'P4 · Peak', weeks: [15, 16, 17, 18], color: '#C05621' },
  5: { name: 'P5 · Race', weeks: [19], color: '#E03131' },
};
export const phaseOf = (w: number): HyroxPhase =>
  Object.values(PHASES).find((p) => p.weeks.includes(w)) ?? PHASES[1];

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const pretty = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return `${DOW[d.getDay()]} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

/* ================= WEEKS 1-18: PILLAR SESSIONS =================
 * Every training week (1-18) follows the same shape: Monday is always the
 * lift day, Tuesday the quality run, Thursday the Hyrox-gym-equipment day,
 * Saturday the long run/simulation day. These 4 "pillars" are exactly one
 * per week and content-complete already — this is the untouched Top 5%
 * program, moved verbatim from the old Mon/Tue/Thu/Sat keys into a
 * role-keyed shape so a person's real weekday choice is a separate,
 * personal setting (see PillarDayMap) rather than baked into the data. */
export const W: Record<number, HyroxWeek> = {};
W[1] = { km: 13, pillars: {
  lift: ['strength', 'Lower strength', 'Squat 4×5 @~75% · RDL 3×6 · walking lunge 3×10/leg · plank 3×45s'],
  qualityRun: ['run', 'Run/walk 30 min', '4 min jog @ 6:30/km ÷ 1 min walk × 6. Easy, conversational.'],
  gym: ['gym', 'Upper + SkiErg intro', 'Bench 4×5 · row 4×5 · pull-ups 3×AMRAP · DB press 3×8 → SkiErg 6×250m easy /60s'],
  longOrSim: ['run', 'Easy 35 min', 'Last 10 min continuous if comfortable'],
} };
W[2] = { km: 17, pillars: {
  lift: ['strength', 'Lower strength', 'As W1, +5% on squat'],
  qualityRun: ['run', 'Easy 30 min + strides', '4×20s strides at the end — smooth, not sprinting'],
  gym: ['gym', 'Upper + Row intro', 'Upper strength → Row 6×300m easy /60s → SkiErg 4×250m'],
  longOrSim: ['run', 'Easy 45 min continuous', 'First fully continuous longer run'],
} };
W[3] = { km: 21, pillars: {
  lift: ['strength', 'Lower + carries', 'Squat 4×5 · RDL 3×6 · step-ups 3×10 · farmers carry 4×40m @ 2×24kg'],
  qualityRun: ['run', 'Easy 35 min + strides', '6×20s strides'],
  gym: ['gym', 'Upper + ergs', 'Ski 5×300m + Row 5×300m moderate /60s'],
  longOrSim: ['run', 'Long easy 55 min', ''],
} };
W[4] = { km: 14, deload: true, pillars: {
  lift: ['strength', 'Lower — deload', '70% volume: 3×5 squat + core only'],
  qualityRun: ['run', 'Easy 30 min + strides', '4×20s strides'],
  gym: ['gym', 'Light ergs', '15 min ski + 15 min row easy · light upper 3×8'],
  longOrSim: ['run', 'Easy 40 min relaxed', ''],
} };
W[5] = { km: 25, bench: '5K TT #2 (~26:00) + Ski/Row 1000m TT', pillars: {
  lift: ['strength', 'Lower — heavier', 'Squat 4×4 · RDL 3×5 · Bulgarian split squat 3×8'],
  qualityRun: ['run', '★ 5K TIME TRIAL #2', 'Target ~26:00. Warm up 10 min + strides. Record it.'],
  gym: ['gym', '★ Ski + Row 1000m TT', 'Upper strength → SkiErg 1000m TT, rest, Row 1000m TT. Record both.'],
  longOrSim: ['run', 'Long 60 min easy', ''],
} };
W[6] = { km: 29, pillars: {
  lift: ['strength', 'Lower strength', ''],
  qualityRun: ['run', 'Threshold 3×6 min', '@ 5:15–5:30/km, 2-min jog recovery. 15-min WU/CD.'],
  gym: ['gym', 'Strength-endurance circuit', '4 rds: Ski 250m · sled push 40m moderate · 15 wall balls · farmers 40m'],
  longOrSim: ['run', 'Long 70 min easy', ''],
} };
W[7] = { km: 33, pillars: {
  lift: ['strength', 'Heavy squat day', 'Squat 5×3 heavy'],
  qualityRun: ['run', 'VO2 5×800m', '@ 4:45–5:00/km, 90s jog recovery'],
  gym: ['gym', 'Circuit', '4 rds: Row 300m · sled pull 40m · 20 lunges @20kg · 15 wall balls'],
  longOrSim: ['run', 'Long 75 min easy', ''],
} };
W[8] = { km: 22, deload: true, pillars: {
  lift: ['strength', 'Lower — deload', '70% volume'],
  qualityRun: ['run', 'Easy 40 min + strides', '4 strides'],
  gym: ['gym', 'Light ergs + technique', '20 min easy ski/row, drill form'],
  longOrSim: ['run', 'Easy 55 min relaxed', ''],
} };
W[9] = { km: 34, bench: 'Half-sim (front half)', pillars: {
  lift: ['strength', 'Lower strength', ''],
  qualityRun: ['run', 'Threshold 3×8 min', '@ 5:10–5:25/km, 2-min recovery'],
  gym: ['gym', 'Upper + ergs', 'Ski 2×500m + Row 2×500m moderate'],
  longOrSim: ['sim', '★ HALF SIM — front half', '4×(1km run + station): Ski 500m · sled push · sled pull · burpee BJ 40m. Runs ~5:00/km. Time everything incl. transitions.'],
} };
W[10] = { km: 39, bench: '5K TT #3 (~24:00) + erg TTs', pillars: {
  lift: ['strength', 'Lower + power', 'Squat 4×3 · RDL 3×5 · jump squats 3×5'],
  qualityRun: ['run', '★ 5K TIME TRIAL #3', 'Target ~24:00. Record.'],
  gym: ['gym', '★ Ski + Row 1000m TT', 'Repeat the TTs — compare to Week 5'],
  longOrSim: ['run', 'Long 80 min', 'Last 10 min @ 4:45/km'],
} };
W[11] = { km: 41, pillars: {
  lift: ['strength', 'Lower strength', ''],
  qualityRun: ['run', 'VO2 6×800m', '@ 4:20–4:40/km, 90s recovery'],
  gym: ['gym', 'Compromised running', '5 rds: 600m run @4:30/km + station (rotate: Ski 250m, sled push 25m, 20 wall balls, farmers 50m, 15 lunges)'],
  longOrSim: ['run', 'Long 85 min easy', ''],
} };
W[12] = { km: 43, bench: 'Half-sim (back half)', pillars: {
  lift: ['strength', 'Lower strength', ''],
  qualityRun: ['run', 'Threshold 4×6 min', '@ 4:50–5:05/km, 90s recovery'],
  gym: ['gym', 'Easy ergs + upper', '20 min easy · upper maintenance 3×5'],
  longOrSim: ['sim', '★ HALF SIM — back half', '4×(1km @4:40/km + station): Row 500m · farmers 200m · lunges 100m · wall balls 100. With partner if possible.'],
} };
W[13] = { km: 28, deload: true, pillars: {
  lift: ['strength', 'Lower — deload', '70% volume'],
  qualityRun: ['run', 'Easy 40 min + strides', ''],
  gym: ['gym', 'Light ergs + mobility', ''],
  longOrSim: ['run', 'Easy 60 min', ''],
} };
W[14] = { km: 45, bench: '5K TT #4 (~22:30) · peak mileage', pillars: {
  lift: ['strength', 'Lower strength', ''],
  qualityRun: ['run', '★ 5K TIME TRIAL #4', 'Target ~22:30 (or 3km @4:30/km if legs are heavy). Record.'],
  gym: ['gym', 'Compromised running', '6 rds: 600m @4:25/km + rotating station'],
  longOrSim: ['run', 'Long 90 min', '3×10 min @ 4:45/km inside'],
} };
W[15] = { km: 40, bench: 'Full simulation', pillars: {
  lift: ['strength', 'Lower — reduce volume', 'Keep intensity, cut sets'],
  qualityRun: ['run', 'VO2 5×1000m', '@ 4:15–4:30/km, 2-min recovery'],
  gym: ['gym', 'Easy ergs + light upper', ''],
  longOrSim: ['sim', '★ FULL SIMULATION', 'All 8 stations + 8×1km @4:30/km. Solo w/ scaled reps or full doubles with partner. Record every split + transition.'],
} };
W[16] = { km: 42, pillars: {
  lift: ['strength', 'Lower maintenance', ''],
  qualityRun: ['run', 'Threshold 4×8 min', '@ 4:40–4:55/km, 90s recovery'],
  gym: ['gym', 'Compromised — race order', '5 rds race-order pairings at race pace'],
  longOrSim: ['run', 'Long 80 min', '+ 4×2 min @ 4:15/km'],
} };
W[17] = { km: 38, bench: 'Full doubles dress rehearsal', pillars: {
  lift: ['strength', 'Lower — light', ''],
  qualityRun: ['run', 'VO2 6×800m', '@ 4:10–4:25/km, 90s recovery'],
  gym: ['gym', 'Easy ergs + mobility', ''],
  longOrSim: ['sim', '★ FULL DOUBLES DRESS REHEARSAL', 'With partner. Exact splits, transitions, You-Go-I-Go, race kit, race fueling. LAST HARD SESSION. Finalize the split sheet after.'],
} };
W[18] = { km: 30, deload: true, pillars: {
  lift: ['strength', 'Strength — taper', 'Volume −40%, loads moderate-heavy for neural drive'],
  qualityRun: ['run', 'Threshold 3×6 min', '@ 4:45/km, full recovery'],
  gym: ['gym', 'Short ergs 15 min', 'Technique only'],
  longOrSim: ['run', 'Easy 50 min', 'Last longer run'],
} };

/* ================= RECOVERY-ZONE TRACKS (weeks 1-18) =================
 * The 3 non-pillar days each week. REST and EASY_WALK are the plan's
 * original Sunday/Wednesday content respectively (it already distinguished
 * "dead rest" from "mobility + walk" — this just makes that an explicit,
 * user-selectable option instead of a fixed weekday). EASY_RUN is the
 * original Friday content (3 deload weeks — 4, 8, 13 — had Friday drop to
 * rest in the original; replaced here with a genuinely light easy run so
 * the option is always a real run). EASY_LIFT is new: it never existed in
 * the original plan, authored here as light, phase-appropriate optional
 * filler for anyone upgrading a recovery day instead of resting. */
export const REST_TRACK: Record<number, DaySlot> = {};
export const EASY_WALK_TRACK: Record<number, DaySlot> = {};
export const EASY_RUN_TRACK: Record<number, DaySlot> = {};
export const EASY_LIFT_TRACK: Record<number, DaySlot> = {};

for (let w = 1; w <= 18; w++) REST_TRACK[w] = ['rest', 'Rest', ''];

EASY_WALK_TRACK[1] = ['rest', 'Easy walk / mobility', '20 min mobility + easy walk'];
for (let w = 2; w <= 18; w++) EASY_WALK_TRACK[w] = ['rest', 'Easy walk / mobility', '15–20 min walk + light stretching'];

EASY_RUN_TRACK[1] = ['run', 'Easy run/walk 30 min', "Zone 2 — if you can't talk, slow down"];
EASY_RUN_TRACK[2] = ['run', 'Easy 35 min', 'Zone 2'];
EASY_RUN_TRACK[3] = ['run', 'Easy 35 min', ''];
EASY_RUN_TRACK[4] = ['run', 'Easy 20 min relaxed', 'Deload — keep it light'];
EASY_RUN_TRACK[5] = ['run', 'Easy 40 min', ''];
EASY_RUN_TRACK[6] = ['run', 'Easy 45 min', ''];
EASY_RUN_TRACK[7] = ['run', 'Easy 45 min + strides', '6×20s strides'];
EASY_RUN_TRACK[8] = ['run', 'Easy 25 min relaxed', 'Deload — keep it light'];
EASY_RUN_TRACK[9] = ['run', 'Easy 45 min', ''];
EASY_RUN_TRACK[10] = ['run', 'Easy 50 min', ''];
EASY_RUN_TRACK[11] = ['run', 'Easy 50 min', ''];
EASY_RUN_TRACK[12] = ['run', 'Easy 45 min + strides', ''];
EASY_RUN_TRACK[13] = ['run', 'Easy 30 min relaxed', 'Deload — keep it light'];
EASY_RUN_TRACK[14] = ['run', 'Easy 50 min', ''];
EASY_RUN_TRACK[15] = ['run', 'Easy 40 min + strides', ''];
EASY_RUN_TRACK[16] = ['run', 'Easy 45 min', ''];
EASY_RUN_TRACK[17] = ['run', 'Easy 35 min + strides', ''];
EASY_RUN_TRACK[18] = ['run', 'Easy 35 min + strides', '6 strides'];

EASY_LIFT_TRACK[1] = ['strength', 'Optional light full body', '20 min: goblet squat 2×12 · push-up 2×10 · band pull-apart 2×15 · plank 2×30s'];
EASY_LIFT_TRACK[2] = ['strength', 'Optional light full body', '20 min: goblet squat 2×12 · DB row 2×12 · glute bridge 2×15 · plank 2×30s'];
EASY_LIFT_TRACK[3] = ['strength', 'Optional light full body', '20 min: split squat 2×10/leg · push-up 2×10 · band pull-apart 2×15 · side plank 2×20s/side'];
EASY_LIFT_TRACK[4] = ['strength', 'Optional light mobility', '15 min easy mobility only — deload week'];
EASY_LIFT_TRACK[5] = ['strength', 'Optional light full body', '25 min: goblet squat 3×12 · DB row 3×10 · glute bridge 3×12 · plank 3×30s'];
EASY_LIFT_TRACK[6] = ['strength', 'Optional light full body', '25 min: DB RDL 3×10 · push-up 3×10 · band pull-apart 3×15 · plank 3×30s'];
EASY_LIFT_TRACK[7] = ['strength', 'Optional light full body', '25 min: split squat 3×10/leg · DB row 3×10 · side plank 2×30s/side'];
EASY_LIFT_TRACK[8] = ['strength', 'Optional light mobility', '15 min easy mobility only — deload week'];
EASY_LIFT_TRACK[9] = ['strength', 'Optional light full body', '25 min: goblet squat 3×12 · DB row 3×10 · farmers carry 2×30m light'];
EASY_LIFT_TRACK[10] = ['strength', 'Optional light full body + core', '25 min: DB RDL 3×10 · push-up 3×10 · side plank 2×30s/side'];
EASY_LIFT_TRACK[11] = ['strength', 'Optional light full body + core', '25 min: split squat 3×10/leg · band pull-apart 3×15 · farmers carry 2×30m light'];
EASY_LIFT_TRACK[12] = ['strength', 'Optional light full body + core', '25 min: goblet squat 3×12 · DB row 3×10 · plank 3×40s'];
EASY_LIFT_TRACK[13] = ['strength', 'Optional light mobility', '15 min easy mobility only — deload week'];
EASY_LIFT_TRACK[14] = ['strength', 'Optional light full body + core', '20 min: DB RDL 2×10 · push-up 2×10 · side plank 2×30s/side'];
EASY_LIFT_TRACK[15] = ['strength', 'Optional technique-only', '15–20 min: bodyweight squat 2×10 · band work · mobility flow — nothing taxing'];
EASY_LIFT_TRACK[16] = ['strength', 'Optional technique-only', '15–20 min: bodyweight squat 2×10 · band work · mobility flow'];
EASY_LIFT_TRACK[17] = ['strength', 'Optional technique-only', '15 min light mobility only — race is close'];
EASY_LIFT_TRACK[18] = ['strength', 'Optional technique-only', '15 min light mobility only — taper'];

const RECOVERY_TRACKS: Record<RecoveryOption, Record<number, DaySlot>> = {
  rest: REST_TRACK,
  easyWalk: EASY_WALK_TRACK,
  easyRun: EASY_RUN_TRACK,
  easyLift: EASY_LIFT_TRACK,
};

/* ================= WEEK 0 (prep) & WEEK 19 (race/taper) =================
 * Fixed, not part of the pillar/recovery remapping or tier scaling — Week
 * 0 is a 4-day intro, and Week 19's race day is pinned to the real event
 * date, so neither one is a "typical" week a person would rearrange. */
export const WEEK0: { date: string; type: HyroxDay['type']; title: string; detail: string }[] = [
  { date: '2026-07-23', type: 'run', title: '★ 5K BASELINE TIME TRIAL', detail: 'This is your starting number. Warm up 10 min. Record it in Track.' },
  { date: '2026-07-24', type: 'rest', title: 'Gear + gym signup', detail: 'Sandbag 20kg · wall ball 6kg · 10ft mark · socks · chalk. Join a HYROX-affiliate gym.' },
  { date: '2026-07-25', type: 'run', title: 'Easy run/walk 30 min', detail: '3 min jog / 1 min walk. Conversational.' },
  { date: '2026-07-26', type: 'rest', title: 'Rest', detail: 'Plan your week. Partner runs their 5K TT too — compare numbers.' },
];

export const WEEK19: { km: number; race: true; days: Record<string, DaySlot> } = {
  km: 15, race: true, days: {
    Mon: ['run', 'Easy 25 min + strides', '4×20s @ race pace'],
    Tue: ['run', 'Primer session', '15-min WU · 3×2 min @ 4:30/km full recovery · ~5 min light touches at 2–3 stations. No soreness.'],
    Wed: ['rest', 'REST + carb load', 'Walk 15–20 min · carbs 7–8 g/kg · hydrate · kit check + split-sheet review with partner'],
    Thu: ['race', '🏁 RACE DAY — HYROX', 'Carb breakfast ~3h pre. Dynamic WU + strides + short erg pulls. Run 1 feels EASY. Execute the split sheet.'],
    Fri: ['rest', 'Recover', 'Walk, eat, celebrate'],
    Sat: ['rest', 'Recover', ''],
    Sun: ['rest', 'Recover', ''],
  },
};

/* ================= TIER SCALING ================= */
// Estimates extrapolated from the doubles benchmark table (sub-1:07 =
// top 10%, 1:02-1:05 = top 5%) — not lab-validated, easy to retune by
// changing these two numbers.
const TIER_FACTOR: Record<HyroxTier, number> = { top5: 1, top10: 1.07, top20: 1.13 };
export const TIER_LABEL: Record<HyroxTier, string> = { top5: 'Top 5%', top10: 'Top 10%', top20: 'Top 20%' };
// How many of the 3 recovery-zone days must stay 'rest' or 'easyWalk' at each tier.
export const TIER_RECOVERY_FLOOR: Record<HyroxTier, number> = { top5: 1, top10: 2, top20: 3 };

function scalePaceToken(mm: string, ss: string, factor: number): string {
  const totalSec = Math.round((parseInt(mm, 10) * 60 + parseInt(ss, 10)) * factor);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PACE_REGEX = /(\d{1,2}):(\d{2})(\s?[–-]\s?(\d{1,2}):(\d{2}))?(\s?\/km)/g;

export function scalePaces(text: string, factor: number): string {
  if (factor === 1) return text;
  return text.replace(PACE_REGEX, (_match, m1, s1, _range, m2, s2, suffix) => {
    const first = scalePaceToken(m1, s1, factor);
    if (m2 !== undefined) return `${first}–${scalePaceToken(m2, s2, factor)}${suffix}`;
    return `${first}${suffix}`;
  });
}

function scaleSlot([type, title, detail]: DaySlot, factor: number): DaySlot {
  return [type, scalePaces(title, factor), scalePaces(detail, factor)];
}

// Hand-curated overrides for the numbers the pace-regex can't reach —
// total-time targets written as prose ("Target ~26:00"), not "/km" tokens.
const FIVE_K_OVERRIDES: Record<HyroxTier, Record<number, { bench: string; title: string; detail: string }>> = {
  top5: {
    5: { bench: '5K TT #2 (~26:00) + Ski/Row 1000m TT', title: '★ 5K TIME TRIAL #2', detail: 'Target ~26:00. Warm up 10 min + strides. Record it.' },
    10: { bench: '5K TT #3 (~24:00) + erg TTs', title: '★ 5K TIME TRIAL #3', detail: 'Target ~24:00. Record.' },
    14: { bench: '5K TT #4 (~22:30) · peak mileage', title: '★ 5K TIME TRIAL #4', detail: 'Target ~22:30 (or 3km @4:30/km if legs are heavy). Record.' },
  },
  top10: {
    5: { bench: '5K TT #2 (~28:00) + Ski/Row 1000m TT', title: '★ 5K TIME TRIAL #2', detail: 'Target ~28:00. Warm up 10 min + strides. Record it.' },
    10: { bench: '5K TT #3 (~25:40) + erg TTs', title: '★ 5K TIME TRIAL #3', detail: 'Target ~25:40. Record.' },
    14: { bench: '5K TT #4 (~24:00) · peak mileage', title: '★ 5K TIME TRIAL #4', detail: 'Target ~24:00 (or 3km @4:50/km if legs are heavy). Record.' },
  },
  top20: {
    5: { bench: '5K TT #2 (~29:20) + Ski/Row 1000m TT', title: '★ 5K TIME TRIAL #2', detail: 'Target ~29:20. Warm up 10 min + strides. Record it.' },
    10: { bench: '5K TT #3 (~27:10) + erg TTs', title: '★ 5K TIME TRIAL #3', detail: 'Target ~27:10. Record.' },
    14: { bench: '5K TT #4 (~25:30) · peak mileage', title: '★ 5K TIME TRIAL #4', detail: 'Target ~25:30 (or 3km @5:05/km if legs are heavy). Record.' },
  },
};

function scaleWeek(week: HyroxWeek, weekNum: number, tier: HyroxTier): HyroxWeek {
  const factor = TIER_FACTOR[tier];
  const pillars = {
    lift: week.pillars.lift, // strength stays identical across tiers — running pace drives percentile, not lifting
    qualityRun: scaleSlot(week.pillars.qualityRun, factor),
    gym: week.pillars.gym,
    longOrSim: scaleSlot(week.pillars.longOrSim, factor),
  };
  const fiveK = FIVE_K_OVERRIDES[tier][weekNum];
  if (fiveK) {
    pillars.qualityRun = ['run', fiveK.title, fiveK.detail];
    return { ...week, bench: fiveK.bench, pillars };
  }
  return { ...week, pillars };
}

export const WEEKS_BY_TIER: Record<HyroxTier, Record<number, HyroxWeek>> = {
  top5: W,
  top10: {},
  top20: {},
};
for (let w = 1; w <= 18; w++) {
  WEEKS_BY_TIER.top10[w] = scaleWeek(W[w], w, 'top10');
  WEEKS_BY_TIER.top20[w] = scaleWeek(W[w], w, 'top20');
}

/* ================= PERSONALIZED SCHEDULE ================= */
function reversePillarMap(map: PillarDayMap): Record<string, keyof PillarDayMap> {
  const rev: Record<string, keyof PillarDayMap> = {};
  (Object.keys(map) as (keyof PillarDayMap)[]).forEach((role) => { rev[map[role]] = role; });
  return rev;
}

export function buildPersonalDays(
  pillarDayMap: PillarDayMap = DEFAULT_PILLAR_DAY_MAP,
  recoveryChoices: RecoveryChoices = DEFAULT_RECOVERY_CHOICES,
  tier: HyroxTier = 'top5',
): HyroxDay[] {
  const weeks = WEEKS_BY_TIER[tier];
  const dayToPillar = reversePillarMap(pillarDayMap);
  const days: HyroxDay[] = WEEK0.map((d) => ({ ...d, week: 0, dow: DOW[new Date(d.date + 'T12:00:00').getDay()] }));

  for (let w = 1; w <= 19; w++) {
    WEEKDAYS.forEach((dw, i) => {
      const dt = new Date(START);
      dt.setDate(START.getDate() + (w - 1) * 7 + i);
      const iso = fmtDate(dt);
      if (w === 19 && iso > '2026-12-06') return;

      let slot: DaySlot;
      if (w === 19) {
        slot = WEEK19.days[dw];
      } else {
        const pillarRole = dayToPillar[dw];
        if (pillarRole) {
          slot = weeks[w].pillars[pillarRole];
        } else {
          const option = recoveryChoices[dw] ?? 'rest';
          slot = RECOVERY_TRACKS[option][w];
        }
      }
      const [type, title, detail] = slot;
      days.push({ date: iso, week: w, dow: dw, type, title, detail });
    });
  }
  return days;
}

// Default-layout export, used by anything that just needs "the" plan
// (e.g. printing the base template) rather than a specific person's.
export const ALL_DAYS: HyroxDay[] = buildPersonalDays();

/* ================= REMEMBER / RACE CONTENT ================= */
export const TARGETS_BY_TIER: Record<HyroxTier, [string, string][]> = {
  top5: [
    ["Men's Doubles Open — top 5%", 'sub 1:02:00'],
    ['Mixed Doubles Open — top 5%', 'sub 1:06:00'],
    ['Run pace (all 8 km, fatigued)', '4:05–4:30 /km'],
    ['RoxZone total (8 transitions)', '< 5:00'],
    ['5K by December', '~21:30–22:00'],
  ],
  top10: [
    ["Men's Doubles Open — top 10%", 'sub 1:07:00'],
    ['Mixed Doubles Open — top 10%', 'sub 1:11:00'],
    ['Run pace (all 8 km, fatigued)', '4:20–4:50 /km'],
    ['RoxZone total (8 transitions)', '< 5:30'],
    ['5K by December', '~23:00–23:30'],
  ],
  top20: [
    ["Men's Doubles Open — top 20%", 'sub 1:13:00'],
    ['Mixed Doubles Open — top 20%', 'sub 1:17:00'],
    ['Run pace (all 8 km, fatigued)', '4:35–5:05 /km'],
    ['RoxZone total (8 transitions)', '< 6:00'],
    ['5K by December', '~24:15–24:50'],
  ],
};
// Top 10%/20% numbers are extrapolated from the plan's own dataset (only
// top-5%/top-10%/top-50% benchmarks were given directly) — reasonable
// estimates, not lab-validated splits.
export const TARGETS: [string, string][] = TARGETS_BY_TIER.top5;

export const RULES: string[] = [
  'Both partners run every km together — max 10 SECONDS apart (2026/27 rule). Warning, then 15s penalties.',
  'One athlete on the equipment at a time; enter and exit stations together.',
  'Better runner takes MORE station work — equalize fatigue so both hold run pace.',
  'Switch before failure, not at failure — especially grip (farmers, sled pull).',
  'Run 1 should feel EASY. Going 30s too fast costs minutes on runs 5–8.',
  'Lunges: back knee touches floor every rep. Burpees: two-foot takeoff AND landing. Wall balls: hips below knees, hit the target — no warnings there, straight penalties.',
  'Transitions are a station: move through the RoxZone, never rest in it.',
];
export const SHOP: string[] = [
  '20kg sandbag (~$50–80)', '6kg / 14lb wall ball + 10ft wall mark', 'GPS watch (if none)',
  'Technical socks ×4', 'Liquid chalk', 'Anti-chafe balm', 'Energy gels — test 2–3 brands in training',
  'Gym membership (SkiErg / sled / rower)', '2nd pair of race shoes ~Week 12',
];
export const STATIONS: string[] = ['SkiErg 1000m', 'Sled Push 152kg', 'Sled Pull 103kg', 'Burpee Broad Jump 80m', 'Row 1000m', 'Farmers Carry 200m', 'Sandbag Lunges 100m', 'Wall Balls 100'];

/* ================= ICS ================= */
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
export function makeICS(days: HyroxDay[], times: Record<string, string>): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HYROX Planner//EN', 'CALSCALE:GREGORIAN'];
  days.forEach((d) => {
    if (d.type === 'rest' && !d.title.includes('carb')) return;
    const t = (times[d.dow] || '17:30').replace(':', '');
    const dur = d.type === 'sim' ? 150 : d.type === 'race' ? 240 : 75;
    const [hh, mm] = [parseInt(t.slice(0, 2)), parseInt(t.slice(2))];
    const endM = hh * 60 + mm + dur;
    const end = `${String(Math.floor(endM / 60) % 24).padStart(2, '0')}${String(endM % 60).padStart(2, '0')}`;
    const ds = d.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:hyrox-${d.date}@planner`, `DTSTART:${ds}T${t}00`, `DTEND:${ds}T${end}00`,
      `SUMMARY:${esc((d.type === 'race' ? '' : `HYROX W${d.week}: `) + d.title)}`,
      `DESCRIPTION:${esc(d.detail || '')}`, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
