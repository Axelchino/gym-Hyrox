import './stationShowcase.css';
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

/**
 * Full-bleed editorial replacement for the old compact StationFoulCard
 * grid — one large photo per station, alternating sides down the page,
 * per Axel's own layout spec. Breaks out to the viewport edge with the
 * `calc(50% - 50vw)` technique regardless of the parent's max-w-3xl
 * column, so photos actually reach the screen edge instead of being
 * boxed into the same 768px column as the rest of the tab.
 */
export function StationShowcase({ stations }: { stations: [string, string[]][] }) {
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
                  <li key={fi}>{f}</li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </section>
  );
}
