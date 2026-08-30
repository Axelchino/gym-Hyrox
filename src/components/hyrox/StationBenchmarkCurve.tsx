import { useThemeTokens } from '../../utils/themeHelpers';
import { STATION_BENCHMARKS_MIXED, type StationBenchmark } from '../../data/hyroxStationBenchmarks';

/** "4:15" or "1:02:30" -> seconds. Returns null for anything unparsable/empty. */
export function parseMMSS(text: string): number | null {
  const parts = text.trim().split(':').map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
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

  const pathD = benchmark.curve
    .map(([x, h], i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(x).toFixed(1)} ${toSvgY(h).toFixed(1)}`)
    .join(' ');
  const areaD = `${pathD} L ${width} ${baseline} L 0 ${baseline} Z`;

  const clamped = seconds === null ? null : Math.max(benchmark.min, Math.min(benchmark.max, seconds));
  const xPct = clamped === null ? null : ((clamped - benchmark.min) / (benchmark.max - benchmark.min)) * 100;
  const markerHeight = xPct === null ? 0 : interpolate(benchmark.curve, xPct);
  const pct = clamped === null ? null : percentileForSeconds(benchmark, clamped);

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
            <line x1={toSvgX(xPct)} y1={toSvgY(markerHeight)} x2={toSvgX(xPct)} y2={baseline} stroke={CURVE_COLOR} strokeWidth={1.5} strokeDasharray="2,3" />
            <circle cx={toSvgX(xPct)} cy={toSvgY(markerHeight)} r={5} fill={CURVE_COLOR} stroke={tokens.surface.elevated} strokeWidth={1.5} />
          </>
        )}
      </svg>
      <div className="text-[11px] mt-0.5" style={{ color: pct !== null ? CURVE_COLOR : tokens.text.secondary, fontWeight: pct !== null ? 800 : 400 }}>
        {pct !== null ? `Top ${pct < 1 ? '<1' : pct.toFixed(0)}% — Mixed Doubles` : 'Enter a time to see where you rank'}
      </div>
    </div>
  );
}
