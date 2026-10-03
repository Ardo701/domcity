import { demoCity } from "./demo/demoCity";
import { DemoPlayer } from "./demo/DemoPlayer";

// La ville d'exemple est préparée une fois, sur le serveur : le navigateur ne reçoit que ses chiffres.
const CITY = demoCity();

/**
 * Le geste de bout en bout, animé : glisser le favori depuis DOMCity, ouvrir un site, cliquer sur le favori,
 * et voir la page devenir sa ville (les blocs de la page sortent de terre, puis le rendu du vrai moteur).
 */
export function InstallDemo() {
  return <DemoPlayer city={CITY} />;
}
