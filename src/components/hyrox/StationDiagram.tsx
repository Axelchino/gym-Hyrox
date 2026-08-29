import { useThemeTokens } from '../../utils/themeHelpers';

/**
 * Per-station foul diagrams — original simple line-art placeholders built
 * in the app's own visual language (not real photos — HYROX's own
 * competition photography is copyrighted, and no genuinely free-to-use
 * stock photography exists for these specific movements; confirmed by
 * search before deciding to place these here). Axel plans to generate
 * AI images to replace these later — StationFoulCard accepts any
 * ReactNode as `diagram`, so swapping a photo in later is a one-line
 * change per station, not a layout rework.
 *
 * Each shows the *specific* zone or standard a judge is actually
 * checking, not just a text bullet restating the rule.
 */

const STROKE = 2;
const VB = '0 0 160 140';

function Svg({ children }: { children: React.ReactNode }) {
  return <svg viewBox={VB} width="100%" height={140} style={{ maxWidth: 200 }}>{children}</svg>;
}

export function RoxZoneDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  const accent = '#0891B2';
  return (
    <Svg>
      <path d="M 15 100 Q 50 110 80 80 T 145 40" fill="none" stroke={accent} strokeWidth={STROKE} strokeDasharray="6,4" />
      <circle cx="15" cy="100" r="5" fill={accent} />
      <circle cx="145" cy="40" r="5" fill="none" stroke={accent} strokeWidth={STROKE} />
      {/* mid-stride figure, implying continuous movement, not standing still */}
      <circle cx="80" cy="68" r="7" fill="none" stroke={line} strokeWidth={STROKE} />
      <line x1="80" y1="75" x2="78" y2="92" stroke={line} strokeWidth={STROKE} />
      <line x1="78" y1="92" x2="65" y2="100" stroke={line} strokeWidth={STROKE} />
      <line x1="78" y1="92" x2="92" y2="82" stroke={line} strokeWidth={STROKE} />
      <text x="12" y="120" fontSize="8" fill={accent} fontWeight={700}>keep moving</text>
    </Svg>
  );
}

function MonitorDiagram({ distance }: { distance: string }) {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  const accent = '#2B6CB0';
  return (
    <Svg>
      <rect x="30" y="30" width="100" height="45" rx="4" fill="none" stroke={line} strokeWidth={STROKE} />
      <text x="80" y="58" fontSize="18" fill={accent} fontWeight={800} textAnchor="middle" fontFamily="monospace">{distance}</text>
      <line x1="80" y1="75" x2="80" y2="90" stroke={line} strokeWidth={STROKE} />
      {/* handle + cable */}
      <line x1="80" y1="90" x2="50" y2="115" stroke={line} strokeWidth={STROKE} />
      <rect x="40" y="112" width="16" height="8" rx="2" fill="none" stroke={accent} strokeWidth={STROKE} />
      <text x="15" y="30" fontSize="8" fill={accent} fontWeight={700}>full distance</text>
      <text x="15" y="40" fontSize="8" fill={accent} fontWeight={700}>before release</text>
    </Svg>
  );
}
export function SkiErgDiagram() { return <MonitorDiagram distance="1000m" />; }
export function RowDiagram() { return <MonitorDiagram distance="1000m" />; }

function LaneDiagram({ mid, note, accent }: { mid: React.ReactNode; note: string; accent: string }) {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  return (
    <Svg>
      <line x1="20" y1="70" x2="140" y2="70" stroke={line} strokeWidth={STROKE} />
      <line x1="20" y1="55" x2="20" y2="85" stroke={line} strokeWidth={STROKE} />
      <line x1="140" y1="55" x2="140" y2="85" stroke={line} strokeWidth={STROKE} />
      <path d="M 60 70 L 100 70" fill="none" stroke={accent} strokeWidth={STROKE} markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={accent} />
        </marker>
      </defs>
      {mid}
      <text x="20" y="110" fontSize="8" fill={accent} fontWeight={700}>{note}</text>
    </Svg>
  );
}

export function SledPushDiagram() {
  const tokens = useThemeTokens();
  return (
    <LaneDiagram
      accent="#5A5E68"
      note="full lane, hands on bar"
      mid={<rect x="72" y="58" width="16" height="24" fill="none" stroke={tokens.text.secondary} strokeWidth={STROKE} />}
    />
  );
}

export function SledPullDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  return (
    <LaneDiagram
      accent="#5A5E68"
      note="stay behind the line"
      mid={(
        <>
          <rect x="100" y="58" width="16" height="24" fill="none" stroke={line} strokeWidth={STROKE} />
          <path d="M 100 70 L 60 70" fill="none" stroke={line} strokeWidth={1} strokeDasharray="3,2" />
          <line x1="55" y1="55" x2="55" y2="85" stroke="#E03131" strokeWidth={STROKE} />
        </>
      )}
    />
  );
}

export function FarmersCarryDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  return (
    <LaneDiagram
      accent="#B7791F"
      note="both hands, full distance"
      mid={(
        <>
          <circle cx="75" cy="70" r="8" fill="none" stroke={line} strokeWidth={STROKE} />
          <circle cx="95" cy="70" r="8" fill="none" stroke={line} strokeWidth={STROKE} />
        </>
      )}
    />
  );
}

export function BurpeeBroadJumpDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  const accent = '#C05621';
  const feet = (cx: number, cy: number) => (
    <>
      <ellipse cx={cx - 6} cy={cy} rx="5" ry="9" fill="none" stroke={accent} strokeWidth={STROKE} />
      <ellipse cx={cx + 6} cy={cy} rx="5" ry="9" fill="none" stroke={accent} strokeWidth={STROKE} />
    </>
  );
  return (
    <Svg>
      {feet(35, 105)}
      <path d="M 35 95 Q 75 40 115 95" fill="none" stroke={line} strokeWidth={STROKE} strokeDasharray="4,3" />
      {feet(115, 105)}
      <text x="15" y="125" fontSize="8" fill={accent} fontWeight={700}>two feet — takeoff &amp; land</text>
    </Svg>
  );
}

export function SandbagLungesDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  const accent = '#C05621';
  return (
    <Svg>
      <line x1="10" y1="120" x2="150" y2="120" stroke={line} strokeWidth={STROKE} />
      {/* lunging figure, back knee touching floor */}
      <circle cx="80" cy="40" r="8" fill="none" stroke={line} strokeWidth={STROKE} />
      <rect x="70" y="50" width="20" height="18" rx="3" fill="none" stroke={line} strokeWidth={STROKE} />{/* sandbag on back */}
      <line x1="80" y1="68" x2="65" y2="90" stroke={line} strokeWidth={STROKE} />
      <line x1="65" y1="90" x2="60" y2="118" stroke={line} strokeWidth={STROKE} />{/* front shin */}
      <line x1="80" y1="68" x2="95" y2="95" stroke={line} strokeWidth={STROKE} />
      <line x1="95" y1="95" x2="100" y2="119" stroke={line} strokeWidth={STROKE} />{/* back thigh to knee */}
      <circle cx="100" cy="119" r="3.5" fill={accent} />{/* back knee touch point */}
      <text x="12" y="132" fontSize="8" fill={accent} fontWeight={700}>back knee touches floor</text>
    </Svg>
  );
}

export function WallBallsDiagram() {
  const tokens = useThemeTokens();
  const line = tokens.text.secondary;
  const accent = '#B7791F';

  return (
    <Svg>
      {/* Wall */}
      <rect x="95" y="10" width="14" height="120" fill="none" stroke={line} strokeWidth={STROKE} />
      {/* Target zone band on the wall, 10ft mark */}
      <rect x="95" y="18" width="14" height="16" fill={accent} fillOpacity={0.25} stroke={accent} strokeWidth={STROKE} />
      <line x1="109" y1="26" x2="130" y2="26" stroke={accent} strokeWidth={1} strokeDasharray="3,2" />
      <text x="133" y="29" fontSize="9" fill={accent} fontWeight={700}>10ft</text>

      {/* Ball trajectory */}
      <path d="M 55 95 Q 60 40 95 26" fill="none" stroke={line} strokeWidth={STROKE} strokeDasharray="4,3" />
      <circle cx="95" cy="26" r="5" fill="none" stroke={accent} strokeWidth={STROKE} />

      {/* Squat depth indicator: standing vs squatted hip position relative to knee line */}
      <line x1="10" y1="95" x2="45" y2="95" stroke={line} strokeWidth={1} strokeDasharray="2,2" />
      <text x="8" y="90" fontSize="8" fill={line}>knee</text>

      {/* squatted stick figure at catch position */}
      <circle cx="55" cy="60" r="7" fill="none" stroke={line} strokeWidth={STROKE} />
      <line x1="55" y1="67" x2="55" y2="88" stroke={line} strokeWidth={STROKE} />
      <line x1="55" y1="88" x2="42" y2="108" stroke={line} strokeWidth={STROKE} />
      <line x1="42" y1="108" x2="48" y2="128" stroke={line} strokeWidth={STROKE} />
      <line x1="55" y1="88" x2="66" y2="108" stroke={line} strokeWidth={STROKE} />
      <line x1="66" y1="108" x2="60" y2="128" stroke={line} strokeWidth={STROKE} />
      <circle cx="55" cy="88" r="3" fill={accent} />
      <text x="20" y="122" fontSize="8" fill={accent} fontWeight={700}>hip below knee ✓</text>
    </Svg>
  );
}

// Maps each STATION_FOULS entry (by its label text in hyroxPlan.ts) to its
// diagram, so the Race tab can look this up by station name without a
// giant switch statement at the call site.
export const STATION_DIAGRAMS: Record<string, () => React.ReactElement> = {
  'RoxZone / Transitions': RoxZoneDiagram,
  'SkiErg 1000m': SkiErgDiagram,
  'Sled Push 50m': SledPushDiagram,
  'Sled Pull 50m': SledPullDiagram,
  'Burpee Broad Jump 80m': BurpeeBroadJumpDiagram,
  'Row 1000m': RowDiagram,
  'Farmers Carry 200m': FarmersCarryDiagram,
  'Sandbag Lunges 100m': SandbagLungesDiagram,
  'Wall Balls 100 reps': WallBallsDiagram,
};

export function StationFoulCard({
  station, fouls,
}: { station: string; fouls: string[] }) {
  const tokens = useThemeTokens();
  const Diagram = STATION_DIAGRAMS[station];
  return (
    <div className="py-3 flex gap-3 items-start flex-wrap sm:flex-nowrap" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {Diagram && (
        <div className="shrink-0 flex items-center justify-center rounded-md p-2" style={{ background: tokens.surface.accent, width: 140 }}>
          <Diagram />
        </div>
      )}
      <div className="flex-1 min-w-[180px]">
        <div className="text-sm font-bold text-primary mb-1">{station}</div>
        {fouls.map((f, fi) => (
          <div key={fi} className="flex gap-2 py-0.5">
            <span style={{ color: '#E03131', fontWeight: 900 }}>!</span>
            <span className="text-xs text-secondary">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
