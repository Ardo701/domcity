/** The 3D view of a city or a megalopolis: tools, panels, tooltips, inspector, sharing, ambiance. */

import type { ReactNode } from "react";
import type { Weather } from "@/city/ambiance";
import type { ImageStatus } from "@/city/textures";
import type { ReportReason } from "@/format/shared";
import { dateTime, formatBytes, formatCount, formatDecimal, formatMegabytes, longDate, plural, timeAgo } from "../format";
import { defineMessages, type Locale } from "../locale";

/** Oct 4, 2026 / 04.10.2026: the capture date, in the cartouche. */
const cartoucheDate = (iso: string, locale: Locale) =>
  locale === "fr"
    ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", ".")
    : new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

/** What the airport serves: the page, or the whole site (megalopolis). */
export type AirportScope = "page" | "site";

interface CityMessages {
  tools: {
    modes: string;
    aerial: string;
    walk: string;
    reset: string;
    legend: string;
    ambiance: string;
    fpsTitle: string;
    share: string;
    copyLink: string;
    linkCopied: string;
    report: string;
  };
  sitePages: string;
  kicker: { visitor: string; shared: string; capture: string; sheet: string };
  visitorNote: string;
  outdated: (reinstall: (label: string) => ReactNode) => ReactNode;
  hint: string;
  steps: { wikipedia: string[]; shared: string[]; capture: string[] };
  errorKicker: string;
  errors: {
    refused: string;
    notFound: { title: string; message: (title: string) => string };
    shared: { title: string; message: string };
    capture: { title: string; message: string };
    wikipedia: { title: string; message: string };
  };
  home: string;
  backHome: string;
  loading: { kicker: string; elements: (n: number) => string };
  legend: { title: string; close: string; note: string };
  north: { title: string; label: string; caption: string };
  perf: { label: string; title: string; hiddenTab: string; frame: string; compute: string; triangles: string; calls: string; ms: (value: number) => string; thousands: (n: number) => string; count: (n: number) => string };
  walk: {
    locked: string;
    free: string;
    kicker: string;
    title: string;
    keys: [string, string, string, string];
    move: string;
    space: string;
    shift: string;
    mouse: string;
    fly: string;
    look: string;
    start: string;
    leave: string;
  };
  scope: Record<AirportScope, string>;
  tooltip: {
    airfield: string;
    airport: string;
    outside: (scope: string) => string;
    thisPage: string;
    links: (n: number) => string;
    airfieldFleet: (planes: number) => string;
    airportFleet: (runways: number, planes: number) => string;
    to: (sites: string) => string;
    airfieldClick: string;
    airportClick: string;
    factories: string;
    factoriesWhere: string;
    scripts: (n: number) => string;
    factoryCount: (n: number) => string;
    notInPageScripts: string;
    cameras: string;
    camerasWhere: string;
    trackers: (trackers: number, cameras: number) => string;
    tracking: string;
    between: (n: number, selector: string) => string;
    along: (selector: string) => string;
    inside: (selector: string, name: string) => string;
    drawn: string;
    textTotal: (chars: string) => string;
    children: (n: number) => string;
    linkCounts: (internal: number, external: number) => string;
    directText: string;
    imagesOf: (selector: string) => string;
    quoted: (text: string) => string;
  };
  inspector: {
    label: string;
    status: Record<ImageStatus, string>;
    ownText: string;
    totalText: string;
    inside: string;
    insideValue: (direct: number, all: number) => string;
    none: string;
    depth: string;
    level: (n: number) => string;
    height: string;
    floors: (n: number) => string;
    links: string;
    linksValue: (internal: number, external: number) => string;
    onPage: string;
    onPageValue: (w: number, h: number, y: number) => string;
    background: string;
    number: (n: number) => string;
    close: string;
    page: string;
    ownCity: string;
    directTextOf: (selector: string) => string;
    imagesOf: (selector: string) => string;
    refused: string;
    viewImage: string;
    noAddress: string;
    path: string;
    approach: string;
    parent: string;
  };
  departures: {
    label: string;
    airfield: string;
    outside: string;
    title: string;
    close: string;
    airfieldBlurb: (n: number) => string;
    airportBlurb: (n: number) => string;
    unknown: string;
    links: (n: number) => string;
    pagesOnDomcity: (n: number) => string;
    seeCity: string;
    inFlight: string;
    onTime: string;
  };
  viewer: { label: string; noAlt: string; original: string; close: string };
  copy: { copy: string; copied: string };
  report: {
    kicker: string;
    title: string;
    close: string;
    done: string;
    reason: string;
    reasons: Record<ReportReason, string>;
    details: string;
    failed: string;
    offline: string;
    submit: string;
    sending: string;
    cancel: string;
  };
  share: {
    published: string;
    kicker: string;
    close: string;
    publicLink: string;
    secretLink: string;
    warning: string;
    seeCity: string;
    thumbAlt: string;
    rendering: string;
    thumbNote: string;
    titleField: string;
    privacy: ReactNode;
    whatTitle: string;
    address: string;
    structure: string;
    images: string;
    bookmarklet: (thirdParty: number) => string;
    linksTo: (targets: string[]) => string;
    otherPages: (n: number) => string;
    sites: (n: number, list: string) => string;
    headings: (n: number) => string;
    moreHeadings: (n: number) => string;
    failed: string;
    offline: string;
    publish: string;
    publishing: string;
    cancel: string;
    /** The page has a city published less than 30 days ago: the visitor confirms or not. */
    recent: (date: string) => string;
    seeExisting: string;
    publishNew: string;
  };
  ambiance: {
    title: string;
    close: string;
    lead: (single: boolean) => string;
    weather: string;
    weathers: Record<Weather, string>;
    loaded: (bytes: number) => string;
    elements: (n: number, captured: boolean) => string;
    weatherDetail: (weight: string) => string;
    cities: (n: number) => string;
    weatherCount: (name: string, n: number) => string;
    notCaptured: string;
    none: (feminine: boolean) => string;
    factories: string;
    factoryCount: (n: number) => string;
    factoriesDetail: (scripts: number) => string;
    factoriesMissing: string;
    cameras: string;
    cameraCount: (n: number) => string;
    trackersDetail: (n: number, list: string) => string;
    noTrackers: string;
    camerasMissing: string;
    graffiti: string;
    tagCount: (n: number) => string;
    graffitiDetail: (comments: number) => string;
    graffitiMissing: string;
    ruins: string;
    ruinCount: (n: number) => string;
    ruinsDetail: (n: number) => string;
    noRuins: string;
    ruinsMissing: string;
    colors: string;
    on: string;
    off: string;
    colorsMissing: string;
    useBookmarklet: (single: boolean) => string;
  };
  cartouche: {
    label: string;
    captured: (iso: string) => string;
    version: string;
    versionDate: (iso: string) => string;
    latest: string;
    buildings: string;
    districts: string;
    monuments: string;
    posters: string;
    canals: string;
    sites: string;
    levels: string;
    visits: string;
    measured: string;
    scripts: (n: number) => string;
    thirdParty: (n: number, more: boolean) => string;
    loaded: (bytes: number) => string;
  };
  mega: {
    loadFailed: string;
    buildFailed: string;
    steps: (loaded: number, total: number) => string[];
    siteLink: string;
    kicker: string;
    pagesTitle: string;
    shown: (shown: number, total: number) => string;
    rebuilding: string;
    elements: (n: number) => string;
    showTitle: string;
    show: string;
    ownCity: string;
    unavailable: string;
    heavy: (n: number) => string;
    latestPages: (n: number, total: number) => string;
    cities: string;
    connections: string;
    highway: string;
    noLinks: string;
    destinations: (n: number) => string;
    airfields: (n: number) => string;
    errorKicker: string;
    errorTitle: string;
  };
}

export const CITY = defineMessages<CityMessages>({
  en: {
    tools: {
      modes: "How to visit",
      aerial: "Aerial view",
      walk: "Walk",
      reset: "Reframe",
      legend: "Legend",
      ambiance: "Ambiance",
      fpsTitle: "Show the frames per second",
      share: "Share",
      copyLink: "Copy link",
      linkCopied: "Link copied",
      report: "Report",
    },
    sitePages: "All the pages of this site",
    kicker: { visitor: "Captured by a visitor", shared: "Shared city", capture: "Your capture · not published", sheet: "DOMCity · Sheet" },
    visitorNote: "Captured with the DOMCity bookmarklet by a visitor: DOMCity cannot check that it is faithful to the page.",
    outdated: (reinstall) => <>Your bookmarklet is from a previous version. {reinstall("Reinstall it")} to get the latest captures.</>,
    hint: "Drag: move · Right click: rotate · Wheel: zoom · Click: inspect · Double-click: approach",
    steps: {
      wikipedia: ["Capturing the article on Wikipedia", "Drawing the plan and the streets", "Construction", "Lighting"],
      shared: ["Opening the shared city", "Drawing the plan and the streets", "Construction", "Lighting"],
      capture: ["Reading the capture", "Drawing the plan and the streets", "Construction", "Lighting"],
    },
    errorKicker: "Capture error",
    errors: {
      refused: "Refused site",
      notFound: { title: "Plot not found", message: (title) => `No article “${title}” on Wikipedia.` },
      shared: { title: "City unavailable", message: "This city's file could not be loaded. Try again in a moment." },
      capture: {
        title: "Cannot build",
        message: "This capture could not be built. Run the bookmarklet again from the page, or try another page.",
      },
      wikipedia: { title: "Capture interrupted", message: "Wikipedia could not be reached. Check your connection, then try again." },
    },
    home: "Back to the home page",
    backHome: "← Back to the home page",
    loading: { kicker: "Under construction", elements: (n) => ` of ${formatCount(n, "en")} elements` },
    legend: {
      title: "Legend",
      close: "Close the legend",
      note: "Streets, cars and trees are scenery. Hover over a street: it points to the block of the page it serves.",
    },
    north: {
      title: "Put the top of the page back at the top of the screen",
      label: "North: top of the page. Put north back at the top of the screen",
      caption: "Top of page",
    },
    perf: {
      label: "Rendering performance",
      title: "Continuous measurement: while the meter is shown, the city is redrawn on every frame.",
      hiddenTab: "FPS · hidden tab",
      frame: "Frame",
      compute: "Compute",
      triangles: "Triangles",
      calls: "Calls",
      ms: (value) => `${formatDecimal(value, "en")} ms`,
      thousands: (n) => `${formatCount(n, "en")} k`,
      count: (n) => formatCount(n, "en"),
    },
    walk: {
      locked: "Esc: release the mouse",
      free: "Drag: look · WASD: move · Space / Shift: up, down · Esc: pause",
      kicker: "Walk mode",
      title: "Down into the street",
      keys: ["W", "A", "S", "D"],
      move: "Forward, back, sideways. On a French keyboard: Z Q S D.",
      space: "Space",
      shift: "Shift",
      mouse: "Mouse",
      fly: "Up and down, like a drone.",
      look: "Look around. A click on a building inspects it.",
      start: "Start the walk",
      leave: "Back to the aerial view",
    },
    scope: { page: "the whole page", site: "the whole site" },
    tooltip: {
      airfield: "Airfield",
      airport: "Airport",
      outside: (scope) => `outside the walls · ${scope}`,
      thisPage: "this page",
      links: (n) => `${plural("en", n, "link", "links")} to other sites`,
      airfieldFleet: (planes) => `1 short runway · ${plural("en", planes, "small plane", "small planes")}`,
      airportFleet: (runways, planes) => `${plural("en", runways, "runway", "runways")} · ${plural("en", planes, "plane", "planes")} at the gates`,
      to: (sites) => `To ${sites}`,
      airfieldClick: "Click: this page's departures",
      airportClick: "Click: the departures board",
      factories: "Factories",
      factoriesWhere: "green belt · the whole page",
      scripts: (n) => `${plural("en", n, "script", "scripts")} in the page`,
      factoryCount: (n) => `${plural("en", n, "factory", "factories")}, one for every six scripts`,
      notInPageScripts: "Not in the page: the JavaScript it runs",
      cameras: "Surveillance cameras",
      camerasWhere: "along the streets · the whole page",
      trackers: (trackers, cameras) => `${plural("en", trackers, "ad tracker", "ad trackers")} · ${plural("en", cameras, "camera", "cameras")}`,
      tracking: "They follow visitors from one site to another",
      between: (n, selector) => `between the ${formatCount(n, "en")} elements of this <${selector}>`,
      along: (selector) => `along what <${selector}> contains`,
      inside: (selector, name) => `in <${selector}> · ${name.toLowerCase()}`,
      drawn: "Not in the page: the city draws it",
      textTotal: (chars) => `${chars} in all`,
      children: (n) => `${plural("en", n, "element", "elements")} inside`,
      linkCounts: (internal, external) => `${plural("en", internal, "internal link", "internal links")} · ${formatCount(external, "en")} external`,
      directText: "direct text",
      imagesOf: (selector) => `images of <${selector}>`,
      quoted: (text) => `“${text}”`,
    },
    inspector: {
      label: "Inspector",
      status: {
        loading: "Loading the poster…",
        shown: "Shown in the city",
        blocked: "The image's site forbids using it in 3D. It stays visible here.",
        missing: "Not found: the image has disappeared from its site.",
        refused: "Hidden: its site is refused by DOMCity.",
      },
      ownText: "Own text",
      totalText: "Total text",
      inside: "Elements inside",
      insideValue: (direct, all) => `${formatCount(direct, "en")} direct, ${formatCount(all, "en")} in all`,
      none: "none",
      depth: "Depth",
      level: (n) => `level ${n}`,
      height: "Height",
      floors: (n) => plural("en", n, "floor", "floors"),
      links: "Links",
      linksValue: (internal, external) => `${formatCount(internal, "en")} internal · ${formatCount(external, "en")} external`,
      onPage: "On the page",
      onPageValue: (w, h, y) => `${formatCount(w, "en")} × ${formatCount(h, "en")} px, ${formatCount(y, "en")} px from the top`,
      background: "Real background",
      number: (n) => `Element #${n}`,
      close: "Close the inspector",
      page: "Page",
      ownCity: "Its own city →",
      directTextOf: (selector) => `direct text of <${selector}>`,
      imagesOf: (selector) => `images of <${selector}>`,
      refused: "Hidden image: it comes from a site refused by DOMCity.",
      viewImage: "See the image",
      noAddress: "No image address.",
      path: "Address in the page",
      approach: "Approach",
      parent: "See the parent",
    },
    departures: {
      label: "Departures board",
      airfield: "Airfield",
      outside: "Outside the walls",
      title: "Departures",
      close: "Close the departures board",
      airfieldBlurb: (n) =>
        `${plural("en", n, "link", "links")} from this page lead to other sites. Its long-haul flights leave from the site's large airport, to the east.`,
      airportBlurb: (n) =>
        `${plural("en", n, "link leads", "links lead")} to other sites. Each destination is a targeted site; the first ones have their plane in flight.`,
      unknown: "This capture does not say yet which sites its links lead to: only cities captured since October 2026 know it.",
      links: (n) => plural("en", n, "link", "links"),
      pagesOnDomcity: (n) => `${plural("en", n, "page", "pages")} on DOMCity`,
      seeCity: "See its city →",
      inFlight: "In flight",
      onTime: "On time",
    },
    viewer: { label: "Image", noAlt: "No alt text", original: "Open the original", close: "Close" },
    copy: { copy: "Copy", copied: "Copied" },
    report: {
      kicker: "Moderation",
      title: "Report this city",
      close: "Close",
      done: "Thank you, noted. If other visitors report it too, the city will be hidden.",
      reason: "Reason",
      reasons: { offensive: "Shocking content", spam: "Spam or advertising", privacy: "Personal data", other: "Other reason" },
      details: "Details (optional)",
      failed: "The report failed.",
      offline: "Cannot connect.",
      submit: "Send the report",
      sending: "Sending…",
      cancel: "Cancel",
    },
    share: {
      published: "City published",
      kicker: "Share the city",
      close: "Close",
      publicLink: "Public link, to share",
      secretLink: "Secret deletion link",
      warning:
        "The secret link lets you delete the city. Keep it to yourself: it is only shown once. This browser remembers it too, in “Your account”.",
      seeCity: "See the shared city",
      thumbAlt: "City thumbnail",
      rendering: "Rendering the model…",
      thumbNote:
        "The image of the city is made by DOMCity: the whole model, always seen from the same angle. It serves as a preview on social networks and in the gallery.",
      titleField: "Published title",
      privacy: (
        <>
          <strong>Private page? Do not publish it.</strong> Mailbox, customer account, internal document: its structure and
          headings would become visible to all. The city will carry the mention “captured by a visitor”.
        </>
      ),
      whatTitle: "What will be published",
      address: "The address of the page, without its parameters:",
      structure: "The structure of the page: the tags, how they nest, how much text.",
      images: "The addresses of the images, not the images themselves.",
      bookmarklet: (thirdParty) =>
        `The position and background color of each element, the broken images, the number of HTML comments${
          thirdParty > 0 ? `, the number of scripts and the ${thirdParty} third-party sites the page contacts` : ""
        }.`,
      linksTo: (targets) => `Where its links lead: ${targets.join(", and ")}.`,
      otherPages: (n) => `${n} other ${n === 1 ? "page" : "pages"} of the site (a fingerprint of each address, not the address)`,
      sites: (n, list) => `${plural("en", n, "site", "sites")} (${list})`,
      headings: (n) => `The text of the headings, and only that (${plural("en", n, "heading", "headings")}):`,
      moreHeadings: (n) => ` · and ${n} more`,
      failed: "Sharing failed.",
      offline: "Cannot connect. Try again in a moment.",
      publish: "Publish the city",
      publishing: "Publishing…",
      cancel: "Cancel",
      recent: (date) =>
        `This page already has a city, published ${timeAgo(date, "en")} (${longDate(date, "en")}). Publish a new version anyway?`,
      seeExisting: "See the existing city ↗",
      publishNew: "Publish a new version",
    },
    ambiance: {
      title: "Ambiance",
      close: "Close the ambiance",
      lead: (single) => `What the ${single ? "page does" : "pages do"} without showing it, made visible in the city.`,
      weather: "Weather",
      weathers: { clear: "Bright sun", fair: "Fair weather", cloudy: "Cloudy", overcast: "Overcast", storm: "Storm" },
      loaded: (bytes) => `${formatMegabytes(bytes, "en")} loaded`,
      elements: (n, captured) => `${plural("en", n, "element", "elements")}${captured ? " captured" : ""}`,
      weatherDetail: (weight) => `${weight}. The heavier the page, the cloudier the sky.`,
      cities: (n) => plural("en", n, "city", "cities"),
      weatherCount: (name, n) => `${name}: ${formatCount(n, "en")}`,
      notCaptured: "not captured",
      none: () => "none",
      factories: "Factories",
      factoryCount: (n) => plural("en", n, "factory", "factories"),
      factoriesDetail: (scripts) => `${plural("en", scripts, "script", "scripts")} in the page: one factory for every six, in the green belt.`,
      factoriesMissing: "Scripts not captured (only the bookmarklet counts them).",
      cameras: "Cameras",
      cameraCount: (n) => plural("en", n, "camera", "cameras"),
      trackersDetail: (n, list) => `${plural("en", n, "ad tracker", "ad trackers")}: ${list}.`,
      noTrackers: "No known tracker among the page's third-party sites.",
      camerasMissing: "Third-party sites not captured (only the bookmarklet sees them).",
      graffiti: "Graffiti",
      tagCount: (n) => plural("en", n, "tag", "tags"),
      graffitiDetail: (comments) =>
        `${plural("en", comments, "HTML comment", "HTML comments")} left in the page, sprayed at the foot of the buildings.`,
      graffitiMissing: "HTML comments not captured (only the bookmarklet reads them).",
      ruins: "Ruins",
      ruinCount: (n) => plural("en", n, "ruin", "ruins"),
      ruinsDetail: (n) => `${plural("en", n, "broken image", "broken images")} in the page: their panel has collapsed.`,
      noRuins: "No broken image at the time of the capture.",
      ruinsMissing: "Broken images not captured (only the bookmarklet sees them).",
      colors: "The site's true colors",
      on: "On",
      off: "Off",
      colorsMissing: "Site colors not captured",
      useBookmarklet: (single) =>
        `Capture the ${single ? "page" : "pages"} with the bookmarklet to see everything: scripts, trackers, comments, broken images.`,
    },
    cartouche: {
      label: "Title block",
      captured: (iso) => `Captured ${cartoucheDate(iso, "en")}`,
      version: "Version",
      versionDate: (iso) => dateTime(iso, "en"),
      latest: " (latest)",
      buildings: "Buildings",
      districts: "Districts",
      monuments: "Monuments",
      posters: "Posters",
      canals: "Canals",
      sites: "Building sites",
      levels: "Levels",
      visits: "Visits",
      measured: "Measured on the displayed page, at the time of the capture",
      scripts: (n) => plural("en", n, "script", "scripts"),
      thirdParty: (n, more) => `${formatCount(n, "en")}${more ? "+" : ""} third-party ${n === 1 ? "site" : "sites"}`,
      loaded: (bytes) => `${formatBytes(bytes, "en")} loaded`,
    },
    mega: {
      loadFailed: "No city of this site could be loaded. Try again in a moment.",
      buildFailed: "The megalopolis could not be built. Try again in a moment.",
      steps: (loaded, total) => [
        `Opening the cities (${formatCount(loaded, "en")} / ${formatCount(total, "en")})`,
        "Placing by address",
        "Drawing the highways and building",
        "Lighting",
      ],
      siteLink: "The site's page, with the list of its pages",
      kicker: "Megalopolis",
      pagesTitle: "Pages of the site",
      shown: (shown, total) => `${formatCount(shown, "en")} / ${formatCount(total, "en")} shown`,
      rebuilding: " · building…",
      elements: (n) => `${formatCount(n, "en")} el.`,
      showTitle: "Show this city",
      show: "View",
      ownCity: "Its own city, with its versions",
      unavailable: "unavailable",
      heavy: (n) => `${formatCount(n, "en")} elements shown: the view may slow down on a modest computer.`,
      latestPages: (n, total) => `The ${formatCount(n, "en")} most recently captured pages, out of ${formatCount(total, "en")}.`,
      cities: "Cities",
      connections: "Connections",
      highway: "Highway: a link between two pages",
      noLinks: "No link between the pages shown",
      destinations: (n) => ` · airport: ${plural("en", n, "destination", "destinations")}`,
      airfields: (n) => ` · ${plural("en", n, "airfield", "airfields")}`,
      errorKicker: "Construction error",
      errorTitle: "Megalopolis unavailable",
    },
  },
  fr: {
    tools: {
      modes: "Façon de visiter",
      aerial: "Vue aérienne",
      walk: "Promenade",
      reset: "Recadrer",
      legend: "Légende",
      ambiance: "Ambiance",
      fpsTitle: "Afficher les images par seconde",
      share: "Partager",
      copyLink: "Copier le lien",
      linkCopied: "Lien copié",
      report: "Signaler",
    },
    sitePages: "Toutes les pages de ce site",
    kicker: { visitor: "Relevé par un visiteur", shared: "Ville partagée", capture: "Votre relevé · non publié", sheet: "DOMCity · Planche" },
    visitorNote: "Relevé avec le favori DOMCity par un visiteur : DOMCity ne peut pas vérifier qu'il est fidèle à la page.",
    outdated: (reinstall) => (
      <>
        Votre favori date d&apos;une version précédente. {reinstall("Réinstallez-le")} pour profiter des derniers relevés.
      </>
    ),
    hint: "Glisser : se déplacer · Clic droit : tourner · Molette : zoomer · Clic : inspecter · Double-clic : approcher",
    steps: {
      wikipedia: ["Relevé de l'article sur Wikipédia", "Tracé du plan et des rues", "Construction", "Mise en lumière"],
      shared: ["Ouverture de la ville partagée", "Tracé du plan et des rues", "Construction", "Mise en lumière"],
      capture: ["Lecture du relevé", "Tracé du plan et des rues", "Construction", "Mise en lumière"],
    },
    errorKicker: "Erreur de relevé",
    errors: {
      refused: "Site refusé",
      notFound: { title: "Terrain introuvable", message: (title) => `Aucun article « ${title} » sur Wikipédia.` },
      shared: { title: "Ville inaccessible", message: "Le fichier de cette ville n'a pas pu être chargé. Réessayez dans un instant." },
      capture: {
        title: "Construction impossible",
        message: "Ce relevé n'a pas pu être bâti. Relancez le favori depuis la page, ou essayez une autre page.",
      },
      wikipedia: { title: "Relevé interrompu", message: "Wikipédia n'a pas pu être joint. Vérifiez votre connexion, puis réessayez." },
    },
    home: "Retour à l'accueil",
    backHome: "← Retour à l'accueil",
    loading: { kicker: "Chantier en cours", elements: (n) => ` de ${formatCount(n, "fr")} éléments` },
    legend: {
      title: "Légende",
      close: "Fermer la légende",
      note: "Rues, voitures et arbres sont du décor. Survolez une rue : elle désigne le bloc de la page qu'elle dessert.",
    },
    north: {
      title: "Remettre le haut de la page en haut de l'écran",
      label: "Nord : haut de la page. Remettre le nord en haut de l'écran",
      caption: "Haut de page",
    },
    perf: {
      label: "Performances du rendu",
      title: "Mesure en continu : tant que le compteur est affiché, la ville est redessinée à chaque image.",
      hiddenTab: "FPS · onglet caché",
      frame: "Image",
      compute: "Calcul",
      triangles: "Triangles",
      calls: "Appels",
      ms: (value) => `${formatDecimal(value, "fr")} ms`,
      thousands: (n) => `${formatCount(n, "fr")} k`,
      count: (n) => formatCount(n, "fr"),
    },
    walk: {
      locked: "Échap : libérer la souris",
      free: "Glisser : regarder · ZQSD : avancer · Espace / Maj : monter, descendre · Échap : pause",
      kicker: "Mode promenade",
      title: "On descend dans la rue",
      keys: ["Z", "Q", "S", "D"],
      move: "Avancer, reculer, aller de côté. Sur un clavier anglais : W A S D.",
      space: "Espace",
      shift: "Maj",
      mouse: "Souris",
      fly: "Monter et descendre, comme un drone.",
      look: "Regarder autour. Un clic sur un bâtiment l'inspecte.",
      start: "Commencer la promenade",
      leave: "Revenir à la vue aérienne",
    },
    scope: { page: "toute la page", site: "tout le site" },
    tooltip: {
      airfield: "Aérodrome",
      airport: "Aéroport",
      outside: (scope) => `hors les murs · ${scope}`,
      thisPage: "cette page",
      links: (n) => `${plural("fr", n, "lien", "liens")} vers d'autres sites`,
      airfieldFleet: (planes) => `1 piste courte · ${plural("fr", planes, "petit avion", "petits avions")}`,
      airportFleet: (runways, planes) => `${plural("fr", runways, "piste", "pistes")} · ${plural("fr", planes, "avion", "avions")} aux portes`,
      to: (sites) => `Vers ${sites}`,
      airfieldClick: "Clic : les départs de cette page",
      airportClick: "Clic : le tableau des départs",
      factories: "Usines",
      factoriesWhere: "ceinture verte · toute la page",
      scripts: (n) => `${plural("fr", n, "script", "scripts")} dans la page`,
      factoryCount: (n) => `${plural("fr", n, "usine", "usines")}, une pour six scripts`,
      notInPageScripts: "Pas dans la page : le JavaScript qu'elle fait tourner",
      cameras: "Caméras de surveillance",
      camerasWhere: "au bord des rues · toute la page",
      trackers: (trackers, cameras) =>
        `${plural("fr", trackers, "traqueur publicitaire", "traqueurs publicitaires")} · ${plural("fr", cameras, "caméra", "caméras")}`,
      tracking: "Ils suivent les visiteurs d'un site à l'autre",
      between: (n, selector) => `entre les ${formatCount(n, "fr")} éléments de ce <${selector}>`,
      along: (selector) => `le long de ce que contient <${selector}>`,
      inside: (selector, name) => `dans <${selector}> · ${name.toLowerCase()}`,
      drawn: "Pas dans la page : la ville la trace",
      textTotal: (chars) => `${chars} en tout`,
      children: (n) => `${plural("fr", n, "élément", "éléments")} dedans`,
      linkCounts: (internal, external) =>
        `${plural("fr", internal, "lien interne", "liens internes")} · ${plural("fr", external, "externe", "externes")}`,
      directText: "texte direct",
      imagesOf: (selector) => `images de <${selector}>`,
      quoted: (text) => `« ${text} »`,
    },
    inspector: {
      label: "Inspecteur",
      status: {
        loading: "Chargement de l'affiche…",
        shown: "Affichée dans la ville",
        blocked: "Le site de l'image interdit de l'utiliser en 3D. Elle reste visible ici.",
        missing: "Introuvable : l'image a disparu de son site.",
        refused: "Masquée : son site est refusé par DOMCity.",
      },
      ownText: "Texte propre",
      totalText: "Texte en tout",
      inside: "Éléments dedans",
      insideValue: (direct, all) => `${formatCount(direct, "fr")} directs, ${formatCount(all, "fr")} en tout`,
      none: "aucun",
      depth: "Profondeur",
      level: (n) => `niveau ${n}`,
      height: "Hauteur",
      floors: (n) => plural("fr", n, "étage", "étages"),
      links: "Liens",
      linksValue: (internal, external) => `${formatCount(internal, "fr")} internes · ${formatCount(external, "fr")} externes`,
      onPage: "Sur la page",
      onPageValue: (w, h, y) => `${formatCount(w, "fr")} × ${formatCount(h, "fr")} px, à ${formatCount(y, "fr")} px du haut`,
      background: "Fond réel",
      number: (n) => `Élément n° ${n}`,
      close: "Fermer l'inspecteur",
      page: "Page",
      ownCity: "Sa ville seule →",
      directTextOf: (selector) => `texte direct de <${selector}>`,
      imagesOf: (selector) => `images de <${selector}>`,
      refused: "Image masquée : elle vient d'un site refusé par DOMCity.",
      viewImage: "Voir l'image",
      noAddress: "Pas d'adresse d'image.",
      path: "Adresse dans la page",
      approach: "Approcher",
      parent: "Voir le parent",
    },
    departures: {
      label: "Tableau des départs",
      airfield: "Aérodrome",
      outside: "Hors les murs",
      title: "Départs",
      close: "Fermer le tableau des départs",
      airfieldBlurb: (n) =>
        `${formatCount(n, "fr")} liens de cette page mènent vers d'autres sites. Ses longs courriers partent du grand aéroport du site, à l'est.`,
      airportBlurb: (n) =>
        `${formatCount(n, "fr")} liens mènent vers d'autres sites. Chaque destination est un site visé ; les premières ont leur avion en vol.`,
      unknown: "Ce relevé ne dit pas encore vers quels sites mènent ses liens : seules les villes relevées depuis octobre 2026 le savent.",
      links: (n) => plural("fr", n, "lien", "liens"),
      pagesOnDomcity: (n) => `${plural("fr", n, "page", "pages")} sur DOMCity`,
      seeCity: "Voir sa ville →",
      inFlight: "En vol",
      onTime: "À l'heure",
    },
    viewer: { label: "Image", noAlt: "Sans texte alternatif", original: "Ouvrir l'original", close: "Fermer" },
    copy: { copy: "Copier", copied: "Copié" },
    report: {
      kicker: "Modération",
      title: "Signaler cette ville",
      close: "Fermer",
      done: "Merci, c'est noté. Si d'autres visiteurs la signalent aussi, la ville sera masquée.",
      reason: "Motif",
      reasons: { offensive: "Contenu choquant", spam: "Spam ou publicité", privacy: "Données personnelles", other: "Autre raison" },
      details: "Précisions (facultatif)",
      failed: "Le signalement a échoué.",
      offline: "Connexion impossible.",
      submit: "Envoyer le signalement",
      sending: "Envoi…",
      cancel: "Annuler",
    },
    share: {
      published: "Ville publiée",
      kicker: "Partager la ville",
      close: "Fermer",
      publicLink: "Lien public, à partager",
      secretLink: "Lien secret de suppression",
      warning:
        "Le lien secret permet de supprimer la ville. Gardez-le pour vous : il n'est affiché qu'une fois. Ce navigateur s'en souvient aussi, dans « Votre compte ».",
      seeCity: "Voir la ville partagée",
      thumbAlt: "Miniature de la ville",
      rendering: "Rendu de la maquette…",
      thumbNote:
        "L'image de la ville est faite par DOMCity : toute la maquette, toujours vue du même angle. Elle sert d'aperçu sur les réseaux et dans la galerie.",
      titleField: "Titre publié",
      privacy: (
        <>
          <strong>Page privée ? Ne la publiez pas.</strong> Messagerie, compte client, document interne : sa structure et ses
          titres deviendraient visibles de tous. La ville portera la mention « relevé par un visiteur ».
        </>
      ),
      whatTitle: "Ce qui sera publié",
      address: "L'adresse de la page, sans ses paramètres :",
      structure: "La structure de la page : les balises, leur imbrication, la quantité de texte.",
      images: "Les adresses des images, pas les images elles-mêmes.",
      bookmarklet: (thirdParty) =>
        `La position et la couleur de fond de chaque élément, les images cassées, le nombre de commentaires HTML${
          thirdParty > 0 ? `, le nombre de scripts et les ${thirdParty} sites tiers contactés par la page` : ""
        }.`,
      linksTo: (targets) => `Où mènent ses liens : ${targets.join(", et ")}.`,
      otherPages: (n) => `${n} ${n > 1 ? "autres pages" : "autre page"} du site (une empreinte de chaque adresse, pas l'adresse)`,
      sites: (n, list) => `${plural("fr", n, "site", "sites")} (${list})`,
      headings: (n) => `Le texte des titres, et lui seulement (${plural("fr", n, "titre", "titres")}) :`,
      moreHeadings: (n) => ` · et ${n} autres`,
      failed: "Le partage a échoué.",
      offline: "Connexion impossible. Réessayez dans un instant.",
      publish: "Publier la ville",
      publishing: "Publication…",
      cancel: "Annuler",
      recent: (date) =>
        `Cette page a déjà une ville, publiée ${timeAgo(date, "fr")} (le ${longDate(date, "fr")}). Publier quand même une nouvelle version ?`,
      seeExisting: "Voir la ville existante ↗",
      publishNew: "Publier une nouvelle version",
    },
    ambiance: {
      title: "Ambiance",
      close: "Fermer l'ambiance",
      lead: (single) => `${single ? "Ce que la page fait" : "Ce que les pages font"} sans le montrer, rendu visible dans la ville.`,
      weather: "Météo",
      weathers: { clear: "Grand soleil", fair: "Beau temps", cloudy: "Nuageux", overcast: "Couvert", storm: "Orage" },
      loaded: (bytes) => `${formatMegabytes(bytes, "fr")} chargés`,
      elements: (n, captured) => `${plural("fr", n, "élément", "éléments")}${captured ? " relevés" : ""}`,
      weatherDetail: (weight) => `${weight}. Plus la page pèse, plus le ciel se couvre.`,
      cities: (n) => plural("fr", n, "ville", "villes"),
      weatherCount: (name, n) => `${name} : ${formatCount(n, "fr")}`,
      notCaptured: "non relevé",
      none: (feminine) => (feminine ? "aucune" : "aucun"),
      factories: "Usines",
      factoryCount: (n) => plural("fr", n, "usine", "usines"),
      factoriesDetail: (scripts) => `${plural("fr", scripts, "script", "scripts")} dans la page : une usine pour six, dans la ceinture verte.`,
      factoriesMissing: "Scripts non relevés (seul le favori les compte).",
      cameras: "Caméras",
      cameraCount: (n) => plural("fr", n, "caméra", "caméras"),
      trackersDetail: (n, list) => `${plural("fr", n, "traqueur publicitaire", "traqueurs publicitaires")} : ${list}.`,
      noTrackers: "Aucun traqueur connu parmi les sites tiers de la page.",
      camerasMissing: "Sites tiers non relevés (seul le favori les voit).",
      graffiti: "Graffitis",
      tagCount: (n) => plural("fr", n, "tag", "tags"),
      graffitiDetail: (comments) =>
        `${plural("fr", comments, "commentaire HTML laissé", "commentaires HTML laissés")} dans la page, bombé${comments > 1 ? "s" : ""} au pied des immeubles.`,
      graffitiMissing: "Commentaires HTML non relevés (seul le favori les lit).",
      ruins: "Ruines",
      ruinCount: (n) => plural("fr", n, "ruine", "ruines"),
      ruinsDetail: (n) => `${plural("fr", n, "image cassée", "images cassées")} dans la page : leur panneau s'est effondré.`,
      noRuins: "Aucune image cassée au moment du relevé.",
      ruinsMissing: "Images cassées non relevées (seul le favori les voit).",
      colors: "Vraies couleurs du site",
      on: "Activées",
      off: "Désactivées",
      colorsMissing: "Couleurs du site non relevées",
      useBookmarklet: (single) =>
        `${single ? "Relevez la page" : "Relevez les pages"} avec le favori pour tout voir : scripts, traqueurs, commentaires, images cassées.`,
    },
    cartouche: {
      label: "Cartouche",
      captured: (iso) => `Relevé du ${cartoucheDate(iso, "fr")}`,
      version: "Version",
      versionDate: (iso) => dateTime(iso, "fr"),
      latest: " (la plus récente)",
      buildings: "Bâtiments",
      districts: "Quartiers",
      monuments: "Monuments",
      posters: "Panneaux",
      canals: "Canaux",
      sites: "Chantiers",
      levels: "Niveaux",
      visits: "Visites",
      measured: "Mesuré sur la page affichée, au moment du relevé",
      scripts: (n) => plural("fr", n, "script", "scripts"),
      thirdParty: (n, more) => `${formatCount(n, "fr")}${more ? "+" : ""} site${n > 1 ? "s" : ""} tiers`,
      loaded: (bytes) => `${formatBytes(bytes, "fr")} chargés`,
    },
    mega: {
      loadFailed: "Aucune ville de ce site n'a pu être chargée. Réessayez dans un instant.",
      buildFailed: "La mégalopole n'a pas pu être bâtie. Réessayez dans un instant.",
      steps: (loaded, total) => [
        `Ouverture des villes (${formatCount(loaded, "fr")} / ${formatCount(total, "fr")})`,
        "Placement selon les adresses",
        "Tracé des autoroutes et construction",
        "Mise en lumière",
      ],
      siteLink: "La page du site, avec la liste de ses pages",
      kicker: "Mégalopole",
      pagesTitle: "Pages du site",
      shown: (shown, total) => `${formatCount(shown, "fr")} / ${formatCount(total, "fr")} affichée${shown > 1 ? "s" : ""}`,
      rebuilding: " · chantier…",
      elements: (n) => `${formatCount(n, "fr")} él.`,
      showTitle: "Montrer cette ville",
      show: "Voir",
      ownCity: "Sa ville seule, avec ses versions",
      unavailable: "indisponible",
      heavy: (n) => `${formatCount(n, "fr")} éléments affichés : la vue peut ralentir sur un ordinateur modeste.`,
      latestPages: (n, total) => `Les ${formatCount(n, "fr")} pages relevées le plus récemment, sur ${formatCount(total, "fr")}.`,
      cities: "Villes",
      connections: "Liaisons",
      highway: "Autoroute : un lien entre deux pages",
      noLinks: "Aucun lien entre les pages affichées",
      destinations: (n) => ` · aéroport : ${plural("fr", n, "destination", "destinations")}`,
      airfields: (n) => ` · ${plural("fr", n, "aérodrome", "aérodromes")}`,
      errorKicker: "Erreur de chantier",
      errorTitle: "Mégalopole inaccessible",
    },
  },
});
