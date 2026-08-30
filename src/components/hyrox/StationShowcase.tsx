import './stationShowcase.css';
import type { StationFoul } from '../../data/hyroxPlan';
import roxzoneImg from '../../assets/hyrox/roxzone.jpg';
import skiergImg from '../../assets/hyrox/skierg.jpg';
import sledPushImg from '../../assets/hyrox/sled-push.jpg';
import sledPullImg from '../../assets/hyrox/sled-pull.jpg';
import burpeeImg from '../../assets/hyrox/burpee-broad-jump.jpg';
import rowImg from '../../assets/hyrox/row.jpg';
import farmersCarryImg from '../../assets/hyrox/farmers-carry.jpg';
import sandbagLungesImg from '../../assets/hyrox/sandbag-lunges.jpg';
import wallBallsImg from '../../assets/hyrox/wall-balls.jpg';

// Keyed exactly like STATION_DIAGRAMS in StationDiagram.tsx — same
// STATION_FOULS label strings from hyroxPlan.ts.
const STATION_PHOTOS: Record<string, string> = {
  'RoxZone / Transitions': roxzoneImg,
  'SkiErg 1000m': skiergImg,
  'Sled Push 50m': sledPushImg,
  'Sled Pull 50m': sledPullImg,
  'Burpee Broad Jump 80m': burpeeImg,
  'Row 1000m': rowImg,
  'Farmers Carry 200m': farmersCarryImg,
  'Sandbag Lunges 100m': sandbagLungesImg,
  'Wall Balls 100 reps': wallBallsImg,
};

// Severity tag -> visual weight. DQ/NO REP/REPEAT OR DQ end your race or
// the rep outright (critical); WARNING is a caution, not yet a penalty;
// everything else is a fixed time add-on. Matches hyrox_penalties_rules.md.
function severityTier(severity: string): 'critical' | 'warning' | 'time' {
  if (severity.includes('DQ') || severity.includes('NO REP') || severity.includes('REPEAT')) return 'critical';
  if (severity.includes('WARNING')) return 'warning';
  return 'time';
}

/**
 * Full-bleed editorial replacement for the old compact StationFoulCard
 * grid — one large photo per station, alternating sides down the page,
 * per Axel's own layout spec. Breaks out to the viewport edge with the
 * `calc(50% - 50vw)` technique regardless of the parent's max-w-3xl
 * column, so photos actually reach the screen edge instead of being
 * boxed into the same 768px column as the rest of the tab.
 *
 * Severities (+15 SEC, WARNING, DQ, etc.) come straight from
 * hyrox_penalties_rules.md — rendered as their own tag, not folded into
 * the sentence, so the actual consequence reads at a glance.
 */
export function StationShowcase({ stations }: { stations: [string, StationFoul[]][] }) {
  const total = stations.length;
  return (
    <section className="station-showcase no-print">
      {stations.map(([station, fouls], i) => {
        const photo = STATION_PHOTOS[station];
        const index = String(i + 1).padStart(2, '0');
        return (
          <article className="station-row" data-side={i % 2 === 1 ? 'left' : 'right'} key={station}>
            {photo && (
              <div className="station-row__media">
                <img src={photo} alt={station} loading="lazy" />
              </div>
            )}
            <div className="station-row__text">
              <div className="station-row__eyebrow">
                <span className="station-row__index">{index}</span>
                <span>/ {String(total).padStart(2, '0')} — RACE ORDER</span>
              </div>
              <h3 className="station-row__title">{station}</h3>
              <ul className="station-row__fouls">
                {fouls.map((f, fi) => (
                  <li key={fi}>
                    <span className={`station-row__severity station-row__severity--${severityTier(f.severity)}`}>
                      {f.severity}
                    </span>
                    <span className="station-row__foul-text">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </section>
  );
}
