import { demoCity } from "./demo/demoCity";
import { DemoPlayer } from "./demo/DemoPlayer";

// The sample city is prepared once, on the server: the browser only receives its numbers.
const CITY = demoCity();

/**
 * The gesture from start to finish, animated: drag the bookmarklet from DOMCity, open a site, click the bookmarklet,
 * and watch the page become its city (the page's blocks rise from the ground, then the real engine's rendering).
 */
export function InstallDemo() {
  return <DemoPlayer city={CITY} />;
}
