import { WEATHER_NAMES, type Ambiance, type Weather } from "@/city/ambiance";
import { formatCount } from "@/city/describe";
import type { Kind } from "@/format/taxonomy";
import { KindSwatch } from "@/ui/KindSwatch";
import styles from "./explorer.module.css";

const plural = (n: number, word: string, many = `${word}s`) => `${formatCount(n)} ${n > 1 ? many : word}`;

const megabytes = (bytes: number) =>
  `${(bytes / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: bytes < 10_000_000 ? 1 : 0 })} Mo`;

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
  const single = ambiances.length === 1 ? ambiances[0] : null;
  const known = <K extends keyof Ambiance>(key: K) => ambiances.filter((a) => a[key] !== undefined);
  const sum = (pick: (a: Ambiance) => number) => ambiances.reduce((total, a) => total + pick(a), 0);
  const painted = ambiances.some((a) => a.colors);
  const fromBookmarklet = ambiances.some((a) => a.measured === "dom");

  // Weather
  let weather: { value: string; detail: string };
  if (single) {
    const weight = [
      single.bytes !== undefined ? `${megabytes(single.bytes)} chargés` : null,
      single.measured === "dom" ? plural(single.elements, "élément") : `${plural(single.elements, "élément")} relevés`,
    ].filter(Boolean);
    weather = { value: WEATHER_NAMES[single.weather], detail: `${weight.join(" · ")}. Plus la page pèse, plus le ciel se couvre.` };
  } else {
    const counts = new Map<Weather, number>();
    for (const a of ambiances) counts.set(a.weather, (counts.get(a.weather) ?? 0) + 1);
    const order: Weather[] = ["storm", "overcast", "cloudy", "fair", "clear"];
    weather = {
      value: `${plural(ambiances.length, "ville")}`,
      detail: order
        .filter((w) => counts.has(w))
        .map((w) => `${WEATHER_NAMES[w]} : ${formatCount(counts.get(w)!)}`)
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
    <section className={styles.legend} aria-label="Ambiance">
      <div className={styles.legendHead}>
        <h2>Ambiance</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer l'ambiance">
          ×
        </button>
      </div>
      <p className={styles.ambianceLead}>
        {single ? "Ce que la page fait" : "Ce que les pages font"} sans le montrer, rendu visible dans la ville.
      </p>
      <ul className={styles.ambianceList}>
        <Row kind="weather" name="Météo" value={weather.value} detail={weather.detail} />
        {withScripts.length > 0 ? (
          <Row
            kind="factory"
            name="Usines"
            value={factories > 0 ? plural(factories, "usine") : "aucune"}
            detail={`${plural(scripts, "script")} dans la page : une usine pour six, dans la ceinture verte.`}
          />
        ) : (
          <Row kind="factory" name="Usines" value="non relevé" detail="Scripts non relevés (seul le favori les compte)." muted />
        )}
        {withThirdParty.length > 0 ? (
          <Row
            kind="camera"
            name="Caméras"
            value={cameras > 0 ? plural(cameras, "caméra") : "aucune"}
            detail={
              trackers.length > 0
                ? `${plural(trackers.length, "traqueur")} publicitaire${trackers.length > 1 ? "s" : ""} : ${trackers.slice(0, 8).join(", ")}${trackers.length > 8 ? "…" : ""}.`
                : "Aucun traqueur connu parmi les sites tiers de la page."
            }
          />
        ) : (
          <Row kind="camera" name="Caméras" value="non relevé" detail="Sites tiers non relevés (seul le favori les voit)." muted />
        )}
        {withComments.length > 0 ? (
          <Row
            kind="graffiti"
            name="Graffitis"
            value={graffiti > 0 ? plural(graffiti, "tag") : "aucun"}
            detail={`${plural(comments, "commentaire")} HTML laissé${comments > 1 ? "s" : ""} dans la page, bombé${comments > 1 ? "s" : ""} au pied des immeubles.`}
          />
        ) : (
          <Row kind="graffiti" name="Graffitis" value="non relevé" detail="Commentaires HTML non relevés (seul le favori les lit)." muted />
        )}
        {fromBookmarklet ? (
          <Row
            kind="ruin"
            name="Ruines"
            value={ruins > 0 ? plural(ruins, "ruine") : "aucune"}
            detail={ruins > 0 ? `${plural(ruins, "image cassée", "images cassées")} dans la page : leur panneau s'est effondré.` : "Aucune image cassée au moment du relevé."}
          />
        ) : (
          <Row kind="ruin" name="Ruines" value="non relevé" detail="Images cassées non relevées (seul le favori les voit)." muted />
        )}
      </ul>
      {painted ? (
        <button
          type="button"
          className={styles.ambianceToggle}
          aria-pressed={realColors}
          onClick={() => onRealColors(!realColors)}
        >
          <span>Vraies couleurs du site</span>
          <span className="mono-caps">{realColors ? "Activées" : "Désactivées"}</span>
        </button>
      ) : (
        <p className={`${styles.legendNote} mono-caps`}>Couleurs du site non relevées</p>
      )}
      {!fromBookmarklet && (
        <p className={`${styles.legendNote} mono-caps`}>
          {single ? "Relevez la page" : "Relevez les pages"} avec le favori pour tout voir : scripts, traqueurs,
          commentaires, images cassées.
        </p>
      )}
    </section>
  );
}
