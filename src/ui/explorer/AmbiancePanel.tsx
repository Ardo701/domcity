import type { Ambiance, Weather } from "@/city/ambiance";
import type { Kind } from "@/format/taxonomy";
import { useMessages } from "@/i18n/client";
import { CITY } from "@/i18n/messages/city";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

function Row({ kind, name, value, detail, muted }: { kind: Kind; name: string; value: string; detail?: string; muted?: boolean }) {
  return (
    <li className={styles.ambianceRow} data-muted={muted || undefined}>
      <KindSwatch kind={kind} size={24} />
      <div>
        <p className={styles.ambianceName}>
          {name}
          <span>{value}</span>
        </p>
        {detail && <p className={styles.ambianceDetail}>{detail}</p>}
      </div>
    </li>
  );
}

/**
 * The ambiance report: what the page does without showing it, and what the city made of it
 * (weather, factories, cameras, graffiti, ruins), plus the site's true colors as an option.
 * A single city: the details. Several (the megalopolis): the totals.
 */
export function AmbiancePanel({
  ambiances,
  realColors,
  onRealColors,
  onClose,
}: {
  ambiances: Ambiance[];
  realColors: boolean;
  onRealColors: (on: boolean) => void;
  onClose: () => void;
}) {
  const m = useMessages(CITY).ambiance;
  const single = ambiances.length === 1 ? ambiances[0] : null;
  const known = <K extends keyof Ambiance>(key: K) => ambiances.filter((a) => a[key] !== undefined);
  const sum = (pick: (a: Ambiance) => number) => ambiances.reduce((total, a) => total + pick(a), 0);
  const painted = ambiances.some((a) => a.colors);
  const fromBookmarklet = ambiances.some((a) => a.measured === "dom");

  // Weather
  let weather: { value: string; detail: string };
  if (single) {
    const weight = [
      single.bytes !== undefined ? m.loaded(single.bytes) : null,
      m.elements(single.elements, single.measured !== "dom"),
    ].filter(Boolean);
    weather = { value: m.weathers[single.weather], detail: m.weatherDetail(weight.join(" · ")) };
  } else {
    const counts = new Map<Weather, number>();
    for (const a of ambiances) counts.set(a.weather, (counts.get(a.weather) ?? 0) + 1);
    const order: Weather[] = ["storm", "overcast", "cloudy", "fair", "clear"];
    weather = {
      value: m.cities(ambiances.length),
      detail: order
        .filter((w) => counts.has(w))
        .map((w) => m.weatherCount(m.weathers[w], counts.get(w)!))
        .join(" · "),
    };
  }

  // Factories
  const withScripts = known("scripts");
  const scripts = sum((a) => a.scripts ?? 0);
  const factories = sum((a) => a.factories);

  // Cameras
  const withThirdParty = ambiances.filter((a) => a.thirdParty);
  const trackers = [...new Set(ambiances.flatMap((a) => a.trackers))];
  const cameras = sum((a) => a.cameras);

  // Graffiti
  const withComments = known("comments");
  const comments = sum((a) => a.comments ?? 0);
  const graffiti = sum((a) => a.graffiti);

  const ruins = sum((a) => a.ruins);

  return (
    <section className={styles.legend} aria-label={m.title}>
      <div className={styles.legendHead}>
        <h2>{m.title}</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label={m.close}>
          ×
        </button>
      </div>
      <p className={styles.ambianceLead}>{m.lead(single !== null)}</p>
      <ul className={styles.ambianceList}>
        <Row kind="weather" name={m.weather} value={weather.value} detail={weather.detail} />
        {withScripts.length > 0 ? (
          <Row
            kind="factory"
            name={m.factories}
            value={factories > 0 ? m.factoryCount(factories) : m.none(true)}
            detail={m.factoriesDetail(scripts)}
          />
        ) : (
          <Row kind="factory" name={m.factories} value={m.notCaptured} detail={m.factoriesMissing} muted />
        )}
        {withThirdParty.length > 0 ? (
          <Row
            kind="camera"
            name={m.cameras}
            value={cameras > 0 ? m.cameraCount(cameras) : m.none(true)}
            detail={
              trackers.length > 0
                ? m.trackersDetail(trackers.length, `${trackers.slice(0, 8).join(", ")}${trackers.length > 8 ? "…" : ""}`)
                : m.noTrackers
            }
          />
        ) : (
          <Row kind="camera" name={m.cameras} value={m.notCaptured} detail={m.camerasMissing} muted />
        )}
        {withComments.length > 0 ? (
          <Row
            kind="graffiti"
            name={m.graffiti}
            value={graffiti > 0 ? m.tagCount(graffiti) : m.none(false)}
            detail={m.graffitiDetail(comments)}
          />
        ) : (
          <Row kind="graffiti" name={m.graffiti} value={m.notCaptured} detail={m.graffitiMissing} muted />
        )}
        {fromBookmarklet ? (
          <Row
            kind="ruin"
            name={m.ruins}
            value={ruins > 0 ? m.ruinCount(ruins) : m.none(true)}
            detail={ruins > 0 ? m.ruinsDetail(ruins) : m.noRuins}
          />
        ) : (
          <Row kind="ruin" name={m.ruins} value={m.notCaptured} detail={m.ruinsMissing} muted />
        )}
      </ul>
      {painted ? (
        <button
          type="button"
          className={styles.ambianceToggle}
          aria-pressed={realColors}
          onClick={() => onRealColors(!realColors)}
        >
          <span>{m.colors}</span>
          <span className="mono-caps">{realColors ? m.on : m.off}</span>
        </button>
      ) : (
        <p className={`${styles.legendNote} mono-caps`}>{m.colorsMissing}</p>
      )}
      {!fromBookmarklet && (
        <p className={`${styles.legendNote} mono-caps`}>{m.useBookmarklet(single !== null)}</p>
      )}
    </section>
  );
}
