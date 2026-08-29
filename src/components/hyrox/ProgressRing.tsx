import { useThemeTokens } from '../../utils/themeHelpers';

// A filling ring instead of a flat number in a box — "sessions done" and
// "days to race" are both fundamentally progress-through-something, so
// they should look like progress, not just read as a static stat. Shared
// across every Hyrox plan page.
export function ProgressRing({
  value, size = 60, strokeWidth = 6, color, center, sublabel,
}: { value: number; size?: number; strokeWidth?: number; color: string; center: string; sublabel: string }) {
  const tokens = useThemeTokens();
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const dashOffset = circumference * (1 - clamped);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" style={{ fontSize: size * 0.24, fontWeight: 900, fill: tokens.text.primary }}>
          {center}
        </text>
      </svg>
      <div className="text-[10px] text-secondary font-mono mt-1 text-center whitespace-nowrap">{sublabel}</div>
    </div>
  );
}
