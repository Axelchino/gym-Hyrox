import { useThemeTokens } from '../../utils/themeHelpers';
import { STATION_BENCHMARKS_MIXED, type StationBenchmark } from '../../data/hyroxStationBenchmarks';

/**
 * "4:15" or "1:02:30" -> seconds. Returns null for anything that isn't
 * cleanly 2 or 3 colon-separated non-negative numbers — no guessing at
 * bare numbers ("260"), decimals, or other separators, since a lone
 * number is genuinely ambiguous (4 as in 4 seconds, or 4 minutes?) and
 * silently guessing wrong is worse than asking for the mm:ss format.
 */
export function parseMMSS(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}(:\d{1,2}){1,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(':').map(Number);
  // Every component but the leading one is a "sub-unit" (minutes-within-
  // hours, or seconds-within-minutes) and must be < 60 to be a real
  // time — "4:99" isn't a time even though the arithmetic "works". The
  // leading component (hours, or minutes when there's no hours part)
  // has no such cap: "75:30" is a legitimate 75-minute time.
  if (parts.slice(1).some((p) => p >= 60)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Catmull-Rom -> cubic Bezier through the real points, so the curve reads
 * as a smooth line instead of a visible polyline between samples — the
 * points themselves aren't changed, only how the gaps between them render. */
function smoothPathD(points: [number, number][]): string {
  if (points.length < 2) return '';
  const d: string[] = [`M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
  }
  return d.join(' ');
}

function interpolate(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return points[points.length - 1][1];
}

/** Real percentile at this time, interpolated between the two nearest sampled points — not a formula. */
export function percentileForSeconds(benchmark: StationBenchmark, seconds: number): number {
  return interpolate(benchmark.percentileSamples, seconds);
}

const CURVE_COLOR = '#6366F1';

export function StationBenchmarkCurve({ station, seconds }: { station: string; seconds: number | null }) {
  const tokens = useThemeTokens();
  const benchmark = STATION_BENCHMARKS_MIXED[station];
  if (!benchmark) return null;

  const width = 300;
  const height = 60;
  const padTop = 4;
  const baseline = height - 4;
  const toSvgX = (xPct: number) => (xPct / 100) * width;
  const toSvgY = (h: number) => baseline - (h / 100) * (baseline - padTop);

  const svgPoints: [number, number][] = benchmark.curve.map(([x, h]) => [toSvgX(x), toSvgY(h)]);
  const pathD = smoothPathD(svgPoints);
  const areaD = `${pathD} L ${width} ${baseline} L 0 ${baseline} Z`;

  // hyresult's own real data only covers benchmark.min..max. A time
  // outside that range still gets a marker pinned at the edge (so the
  // input isn't just silently ignored), but we don't pretend a precise
  // percentile exists past what the real data actually covers.
  const outOfRange = seconds !== null && (seconds < benchmark.min || seconds > benchmark.max);
  const clamped = seconds === null ? null : Math.max(benchmark.min, Math.min(benchmark.max, seconds));
  const xPct = clamped === null ? null : ((clamped - benchmark.min) / (benchmark.max - benchmark.min)) * 100;
  const markerHeight = xPct === null ? 0 : interpolate(benchmark.curve, xPct);
  const pct = clamped === null || outOfRange ? null : percentileForSeconds(benchmark, clamped);

  const gradId = `station-bench-${station.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="py-2">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CURVE_COLOR} stopOpacity="0.4" />
            <stop offset="100%" stopColor={CURVE_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={CURVE_COLOR} strokeWidth={1.5} strokeOpacity={0.85} />
        <line x1={0} y1={baseline} x2={width} y2={baseline} stroke="var(--border-subtle)" strokeWidth={1} />
        {xPct !== null && (
          <>
            <line x1={toSvgX(xPct)} y1={toSvgY(markerHeight)} x2={toSvgX(xPct)} y2={baseline} stroke={CURVE_COLOR} strokeWidth={1.5} strokeDasharray="2,3" strokeOpacity={outOfRange ? 0.5 : 1} />
            <circle
              cx={toSvgX(xPct)} cy={toSvgY(markerHeight)} r={5}
              fill={outOfRange ? 'none' : CURVE_COLOR}
              stroke={CURVE_COLOR}
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>
      <div className="text-[11px] mt-0.5" style={{ color: pct !== null ? CURVE_COLOR : tokens.text.secondary, fontWeight: pct !== null ? 800 : 400 }}>
        {pct !== null
          ? `Top ${pct < 1 ? '<1' : pct.toFixed(0)}% — Mixed Doubles`
          : outOfRange && seconds !== null
            ? seconds < benchmark.min
              ? "Faster than hyresult's real data covers — genuinely elite"
              : "Slower than hyresult's real data covers — off the chart"
            : 'Enter a time to see where you rank'}
      </div>
    </div>
  );
}
