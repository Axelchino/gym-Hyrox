import type { HyroxDay, HyroxPhase, HyroxWeek } from '../types/hyrox';

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

// type: run | strength | gym | rest | sim | race  (gym = needs SkiErg/sled/rower)
export const W: Record<number, HyroxWeek> = {};
W[1] = { km: 13, days: {
  Mon: ['strength', 'Lower strength', 'Squat 4×5 @~75% · RDL 3×6 · walking lunge 3×10/leg · plank 3×45s'],
  Tue: ['run', 'Run/walk 30 min', '4 min jog @ 6:30/km ÷ 1 min walk × 6. Easy, conversational.'],
  Wed: ['rest', 'Rest / mobility', '20 min mobility + easy walk'],
  Thu: ['gym', 'Upper + SkiErg intro', 'Bench 4×5 · row 4×5 · pull-ups 3×AMRAP · DB press 3×8 → SkiErg 6×250m easy /60s'],
  Fri: ['run', 'Easy run/walk 30 min', 'Zone 2 — if you can\'t talk, slow down'],
  Sat: ['run', 'Easy 35 min', 'Last 10 min continuous if comfortable'],
  Sun: ['rest', 'Rest', ''] } };
W[2] = { km: 17, days: {
  Mon: ['strength', 'Lower strength', 'As W1, +5% on squat'],
  Tue: ['run', 'Easy 30 min + strides', '4×20s strides at the end — smooth, not sprinting'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Upper + Row intro', 'Upper strength → Row 6×300m easy /60s → SkiErg 4×250m'],
  Fri: ['run', 'Easy 35 min', 'Zone 2'],
  Sat: ['run', 'Easy 45 min continuous', 'First fully continuous longer run'],
  Sun: ['rest', 'Rest', ''] } };
W[3] = { km: 21, days: {
  Mon: ['strength', 'Lower + carries', 'Squat 4×5 · RDL 3×6 · step-ups 3×10 · farmers carry 4×40m @ 2×24kg'],
  Tue: ['run', 'Easy 35 min + strides', '6×20s strides'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Upper + ergs', 'Ski 5×300m + Row 5×300m moderate /60s'],
  Fri: ['run', 'Easy 35 min', ''],
  Sat: ['run', 'Long easy 55 min', ''],
  Sun: ['rest', 'Rest', ''] } };
W[4] = { km: 14, deload: true, days: {
  Mon: ['strength', 'Lower — deload', '70% volume: 3×5 squat + core only'],
  Tue: ['run', 'Easy 30 min + strides', '4×20s strides'],
  Wed: ['rest', 'Rest', ''],
  Thu: ['gym', 'Light ergs', '15 min ski + 15 min row easy · light upper 3×8'],
  Fri: ['rest', 'Rest or 20-min walk', ''],
  Sat: ['run', 'Easy 40 min relaxed', ''],
  Sun: ['rest', 'Rest', ''] } };
W[5] = { km: 25, bench: '5K TT #2 (~26:00) + Ski/Row 1000m TT', days: {
  Mon: ['strength', 'Lower — heavier', 'Squat 4×4 · RDL 3×5 · Bulgarian split squat 3×8'],
  Tue: ['run', '★ 5K TIME TRIAL #2', 'Target ~26:00. Warm up 10 min + strides. Record it.'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', '★ Ski + Row 1000m TT', 'Upper strength → SkiErg 1000m TT, rest, Row 1000m TT. Record both.'],
  Fri: ['run', 'Easy 40 min', ''],
  Sat: ['run', 'Long 60 min easy', ''],
  Sun: ['rest', 'Rest', ''] } };
W[6] = { km: 29, days: {
  Mon: ['strength', 'Lower strength', ''],
  Tue: ['run', 'Threshold 3×6 min', '@ 5:15–5:30/km, 2-min jog recovery. 15-min WU/CD.'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Strength-endurance circuit', '4 rds: Ski 250m · sled push 40m moderate · 15 wall balls · farmers 40m'],
  Fri: ['run', 'Easy 45 min', ''],
  Sat: ['run', 'Long 70 min easy', ''],
  Sun: ['rest', 'Rest', ''] } };
W[7] = { km: 33, days: {
  Mon: ['strength', 'Heavy squat day', 'Squat 5×3 heavy'],
  Tue: ['run', 'VO2 5×800m', '@ 4:45–5:00/km, 90s jog recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Circuit', '4 rds: Row 300m · sled pull 40m · 20 lunges @20kg · 15 wall balls'],
  Fri: ['run', 'Easy 45 min + strides', '6×20s strides'],
  Sat: ['run', 'Long 75 min easy', ''],
  Sun: ['rest', 'Rest', ''] } };
W[8] = { km: 22, deload: true, days: {
  Mon: ['strength', 'Lower — deload', '70% volume'],
  Tue: ['run', 'Easy 40 min + strides', '4 strides'],
  Wed: ['rest', 'Rest', ''],
  Thu: ['gym', 'Light ergs + technique', '20 min easy ski/row, drill form'],
  Fri: ['rest', 'Rest or easy 30 min', ''],
  Sat: ['run', 'Easy 55 min relaxed', ''],
  Sun: ['rest', 'Rest', ''] } };
W[9] = { km: 34, bench: 'Half-sim (front half)', days: {
  Mon: ['strength', 'Lower strength', ''],
  Tue: ['run', 'Threshold 3×8 min', '@ 5:10–5:25/km, 2-min recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Upper + ergs', 'Ski 2×500m + Row 2×500m moderate'],
  Fri: ['run', 'Easy 45 min', ''],
  Sat: ['sim', '★ HALF SIM — front half', '4×(1km run + station): Ski 500m · sled push · sled pull · burpee BJ 40m. Runs ~5:00/km. Time everything incl. transitions.'],
  Sun: ['rest', 'Rest', ''] } };
W[10] = { km: 39, bench: '5K TT #3 (~24:00) + erg TTs', days: {
  Mon: ['strength', 'Lower + power', 'Squat 4×3 · RDL 3×5 · jump squats 3×5'],
  Tue: ['run', '★ 5K TIME TRIAL #3', 'Target ~24:00. Record.'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', '★ Ski + Row 1000m TT', 'Repeat the TTs — compare to Week 5'],
  Fri: ['run', 'Easy 50 min', ''],
  Sat: ['run', 'Long 80 min', 'Last 10 min @ 4:45/km'],
  Sun: ['rest', 'Rest', ''] } };
W[11] = { km: 41, days: {
  Mon: ['strength', 'Lower strength', ''],
  Tue: ['run', 'VO2 6×800m', '@ 4:20–4:40/km, 90s recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Compromised running', '5 rds: 600m run @4:30/km + station (rotate: Ski 250m, sled push 25m, 20 wall balls, farmers 50m, 15 lunges)'],
  Fri: ['run', 'Easy 50 min', ''],
  Sat: ['run', 'Long 85 min easy', ''],
  Sun: ['rest', 'Rest', ''] } };
W[12] = { km: 43, bench: 'Half-sim (back half)', days: {
  Mon: ['strength', 'Lower strength', ''],
  Tue: ['run', 'Threshold 4×6 min', '@ 4:50–5:05/km, 90s recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Easy ergs + upper', '20 min easy · upper maintenance 3×5'],
  Fri: ['run', 'Easy 45 min + strides', ''],
  Sat: ['sim', '★ HALF SIM — back half', '4×(1km @4:40/km + station): Row 500m · farmers 200m · lunges 100m · wall balls 100. With partner if possible.'],
  Sun: ['rest', 'Rest', ''] } };
W[13] = { km: 28, deload: true, days: {
  Mon: ['strength', 'Lower — deload', '70% volume'],
  Tue: ['run', 'Easy 40 min + strides', ''],
  Wed: ['rest', 'Rest', ''],
  Thu: ['gym', 'Light ergs + mobility', ''],
  Fri: ['rest', 'Rest or easy 30 min', ''],
  Sat: ['run', 'Easy 60 min', ''],
  Sun: ['rest', 'Rest', ''] } };
W[14] = { km: 45, bench: '5K TT #4 (~22:30) · peak mileage', days: {
  Mon: ['strength', 'Lower strength', ''],
  Tue: ['run', '★ 5K TIME TRIAL #4', 'Target ~22:30 (or 3km @4:30/km if legs are heavy). Record.'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Compromised running', '6 rds: 600m @4:25/km + rotating station'],
  Fri: ['run', 'Easy 50 min', ''],
  Sat: ['run', 'Long 90 min', '3×10 min @ 4:45/km inside'],
  Sun: ['rest', 'Rest', ''] } };
W[15] = { km: 40, bench: 'Full simulation', days: {
  Mon: ['strength', 'Lower — reduce volume', 'Keep intensity, cut sets'],
  Tue: ['run', 'VO2 5×1000m', '@ 4:15–4:30/km, 2-min recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Easy ergs + light upper', ''],
  Fri: ['run', 'Easy 40 min + strides', ''],
  Sat: ['sim', '★ FULL SIMULATION', 'All 8 stations + 8×1km @4:30/km. Solo w/ scaled reps or full doubles with partner. Record every split + transition.'],
  Sun: ['rest', 'Rest', ''] } };
W[16] = { km: 42, days: {
  Mon: ['strength', 'Lower maintenance', ''],
  Tue: ['run', 'Threshold 4×8 min', '@ 4:40–4:55/km, 90s recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Compromised — race order', '5 rds race-order pairings at race pace'],
  Fri: ['run', 'Easy 45 min', ''],
  Sat: ['run', 'Long 80 min', '+ 4×2 min @ 4:15/km'],
  Sun: ['rest', 'Rest', ''] } };
W[17] = { km: 38, bench: 'Full doubles dress rehearsal', days: {
  Mon: ['strength', 'Lower — light', ''],
  Tue: ['run', 'VO2 6×800m', '@ 4:10–4:25/km, 90s recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Easy ergs + mobility', ''],
  Fri: ['run', 'Easy 35 min + strides', ''],
  Sat: ['sim', '★ FULL DOUBLES DRESS REHEARSAL', 'With partner. Exact splits, transitions, You-Go-I-Go, race kit, race fueling. LAST HARD SESSION. Finalize the split sheet after.'],
  Sun: ['rest', 'Rest', ''] } };
W[18] = { km: 30, deload: true, days: {
  Mon: ['strength', 'Strength — taper', 'Volume −40%, loads moderate-heavy for neural drive'],
  Tue: ['run', 'Threshold 3×6 min', '@ 4:45/km, full recovery'],
  Wed: ['rest', 'Rest / mobility', ''],
  Thu: ['gym', 'Short ergs 15 min', 'Technique only'],
  Fri: ['run', 'Easy 35 min + strides', '6 strides'],
  Sat: ['run', 'Easy 50 min', 'Last longer run'],
  Sun: ['rest', 'Rest', ''] } };
W[19] = { km: 15, race: true, days: {
  Mon: ['run', 'Easy 25 min + strides', '4×20s @ race pace'],
  Tue: ['run', 'Primer session', '15-min WU · 3×2 min @ 4:30/km full recovery · ~5 min light touches at 2–3 stations. No soreness.'],
  Wed: ['rest', 'REST + carb load', 'Walk 15–20 min · carbs 7–8 g/kg · hydrate · kit check + split-sheet review with partner'],
  Thu: ['race', '🏁 RACE DAY — HYROX', 'Carb breakfast ~3h pre. Dynamic WU + strides + short erg pulls. Run 1 feels EASY. Execute the split sheet.'],
  Fri: ['rest', 'Recover', 'Walk, eat, celebrate'],
  Sat: ['rest', 'Recover', ''],
  Sun: ['rest', 'Recover', ''] } };

export const WEEK0: { date: string; type: HyroxDay['type']; title: string; detail: string }[] = [
  { date: '2026-07-23', type: 'run', title: '★ 5K BASELINE TIME TRIAL', detail: 'This is your starting number. Warm up 10 min. Record it in Track.' },
  { date: '2026-07-24', type: 'rest', title: 'Gear + gym signup', detail: 'Sandbag 20kg · wall ball 6kg · 10ft mark · socks · chalk. Join a HYROX-affiliate gym.' },
  { date: '2026-07-25', type: 'run', title: 'Easy run/walk 30 min', detail: '3 min jog / 1 min walk. Conversational.' },
  { date: '2026-07-26', type: 'rest', title: 'Rest', detail: 'Plan your week. Partner runs their 5K TT too — compare numbers.' },
];

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const pretty = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return `${DOW[d.getDay()]} ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

function buildDays(): HyroxDay[] {
  const days: HyroxDay[] = WEEK0.map((d) => ({ ...d, week: 0, dow: DOW[new Date(d.date + 'T12:00:00').getDay()] }));
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let w = 1; w <= 19; w++) {
    order.forEach((dw, i) => {
      const dt = new Date(START);
      dt.setDate(START.getDate() + (w - 1) * 7 + i);
      const iso = fmtDate(dt);
      if (w === 19 && iso > '2026-12-06') return;
      const [type, title, detail] = W[w].days[dw];
      days.push({ date: iso, week: w, dow: dw, type, title, detail });
    });
  }
  return days;
}
export const ALL_DAYS: HyroxDay[] = buildDays();

/* ================= REMEMBER / RACE CONTENT ================= */
export const TARGETS: [string, string][] = [
  ["Men's Doubles Open — top 5%", 'sub 1:02:00'],
  ['Mixed Doubles Open — top 5%', 'sub 1:06:00'],
  ['Run pace (all 8 km, fatigued)', '4:05–4:30 /km'],
  ['RoxZone total (8 transitions)', '< 5:00'],
  ['5K by December', '~21:30–22:00'],
];
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
