/**
 * Les matériaux de la ville. Les détails (fenêtres, marquages, dalles, pelouses)
 * sont dessinés dans les shaders, à l'échelle réelle de chaque instance : une
 * façade de 30 m a ses 26 étages, quelle que soit la boîte étirée qui la porte.
 *
 * La couleur de l'instance reste la couleur dominante (mur, asphalte, gazon) :
 * c'est elle que le survol et la sélection remplacent par le jaune balise.
 */

import * as THREE from "three";

/** Styles de façade, passés par instance (aFacade.x). */
export const FACADE = { glass: 0, office: 1, brick: 2, stucco: 3, house: 4, stone: 5 } as const;
/** Styles de sol (aGround.x). */
export const GROUND = { base: 0, sidewalk: 1, plaza: 2, grass: 3, lawn: 4, crops: 5, dirt: 6, wharf: 7, quay: 8 } as const;
/** Styles de chaussée (aRoad.x). */
export const ROAD = { ring: 0, avenue: 1, street: 2, lane: 3, path: 4, runway: 5, taxiway: 6 } as const;
/** Sens d'une chaussée pour le marquage (deuxième valeur de aRoad). */
export const ROAD_AXIS = { x: 0, z: 1, bend: 2, cross: 3 } as const;

const NOISE = /* glsl */ `
float dcHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float dcNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(dcHash(i), dcHash(i + vec2(1.0, 0.0)), f.x), mix(dcHash(i + vec2(0.0, 1.0)), dcHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float dcBand(float x, float center, float halfWidth) {
  float aa = fwidth(x) * 0.8;
  return 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, abs(x - center));
}
`;

/** Position dans la boîte en unités réelles (depuis le coin nord-ouest, au sol), taille de la boîte, normale locale. */
const BOX_VERTEX = /* glsl */ `
#ifdef USE_INSTANCING
  vec3 dcScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
#else
  vec3 dcScale = vec3(1.0);
#endif
vDcBox = (position + vec3(0.5, 0.0, 0.5)) * dcScale;
vDcSize = dcScale;
vDcNormal = normal;
vec4 dcWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  dcWorld = instanceMatrix * dcWorld;
#endif
vDcWorld = (modelMatrix * dcWorld).xyz;
`;

const BOX_VARYINGS = /* glsl */ `
varying vec3 vDcBox;
varying vec3 vDcSize;
varying vec3 vDcNormal;
varying vec3 vDcWorld;
varying vec4 vDcExtra;
`;

function boxShader(
  material: THREE.MeshStandardMaterial,
  key: string,
  attribute: string,
  fragment: string,
  surface = "",
): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nattribute vec4 ${attribute};\n${BOX_VARYINGS}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${BOX_VERTEX}\nvDcExtra = ${attribute};`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${BOX_VARYINGS}\n${NOISE}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\nfloat dcGlass = 0.0;\n{\n${fragment}\n}`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n${surface}`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}

/**
 * Façades : fenêtres, rez-de-chaussée commerçant, acrotère, toit gravillonné.
 * aFacade = (style, hauteur d'étage, graine, commerces).
 */
const FACADE_FRAGMENT = /* glsl */ `
vec3 dcN = vDcNormal;
float dcStyle = vDcExtra.x;
float dcFloor = vDcExtra.y;
float dcSeed = vDcExtra.z;
float dcShop = vDcExtra.w;
vec3 dcWall = diffuseColor.rgb;

if (abs(dcN.y) < 0.5) {
  bool alongX = abs(dcN.z) > 0.5;
  float u = alongX ? vDcBox.x : vDcBox.z;
  float width = alongX ? vDcSize.x : vDcSize.z;
  float y = vDcBox.y;
  float top = vDcSize.y;

  float colW = 1.25; float winW = 0.6; float winH = 0.55; float sill = 0.24;
  if (dcStyle < 0.5) { colW = 1.5; winW = 0.9; winH = 0.74; sill = 0.13; }
  else if (dcStyle < 1.5) { colW = 1.3; winW = 0.62; winH = 0.56; sill = 0.24; }
  else if (dcStyle < 2.5) { colW = 1.0; winW = 0.46; winH = 0.56; sill = 0.24; }
  else if (dcStyle < 3.5) { colW = 1.15; winW = 0.44; winH = 0.6; sill = 0.2; }
  else if (dcStyle < 4.5) { colW = 1.4; winW = 0.36; winH = 0.5; sill = 0.28; }
  else { colW = 0.95; winW = 0.3; winH = 0.78; sill = 0.11; }

  float cols = max(1.0, floor(width / colW + 0.5));
  float cell = width / cols;
  float shopH = dcShop > 0.5 ? dcFloor * 1.4 : 0.0;
  float gu = u / cell;
  float fy = (y - shopH) / dcFloor;
  float parapet = top - (dcStyle < 0.5 ? 0.12 : 0.4);

  vec2 f = vec2(fract(gu), fract(fy));
  vec2 aa = fwidth(vec2(gu, fy));
  float inX = smoothstep(0.5 - winW * 0.5 - aa.x, 0.5 - winW * 0.5 + aa.x, f.x)
            * (1.0 - smoothstep(0.5 + winW * 0.5 - aa.x, 0.5 + winW * 0.5 + aa.x, f.x));
  float inY = smoothstep(sill - aa.y, sill + aa.y, f.y) * (1.0 - smoothstep(sill + winH - aa.y, sill + winH + aa.y, f.y));
  float zone = step(shopH + 0.05, y) * step(y, parapet - 0.12);
  float win = inX * inY * zone;
  // De loin, le motif fourmillerait : on passe à sa teinte moyenne.
  float far = clamp(max(aa.x, aa.y) * 2.2 - 0.35, 0.0, 1.0);
  win = mix(win, winW * winH * zone, far);

  float h = dcHash(vec2(floor(gu) + dcSeed * 17.0, floor(fy) + dcSeed * 31.0));
  vec3 glass = mix(vec3(0.17, 0.22, 0.27), vec3(0.36, 0.45, 0.52), h);
  if (dcStyle < 0.5) glass = mix(dcWall * 0.55 + vec3(0.02, 0.05, 0.08), dcWall * 0.85, h * 0.7);
  glass = mix(glass, vec3(0.93, 0.8, 0.55), step(0.965, h) * (1.0 - far) * 0.7);

  // Pierre : pilastres entre les baies. Enduit : nez de dalle à chaque étage.
  if (dcStyle > 4.5) dcWall *= 1.0 + 0.07 * step(0.5, abs(f.x - 0.5) * 2.0) * (1.0 - far);
  if (dcStyle > 2.5 && dcStyle < 3.5) dcWall *= 1.0 - 0.1 * dcBand(f.y, 0.03, 0.03) * (1.0 - far) * zone;
  // Acrotère et corniche un peu plus clairs.
  dcWall *= 1.0 + 0.07 * step(parapet, y);

  vec3 color = mix(dcWall, glass, win);
  dcGlass = win;

  // Rez-de-chaussée : vitrines et auvents de couleur.
  if (dcShop > 0.5 && y < shopH) {
    float bays = max(1.0, floor(width / 2.6 + 0.5));
    float bx = fract(u / (width / bays));
    float shopWin = step(0.1, bx) * step(bx, 0.9) * step(0.12, y) * step(y, shopH * 0.74);
    float pick = dcHash(vec2(floor(u / (width / bays)), dcSeed * 7.0));
    vec3 awning = pick < 0.25 ? vec3(0.86, 0.33, 0.16) : pick < 0.5 ? vec3(0.2, 0.33, 0.6) : pick < 0.75 ? vec3(0.27, 0.5, 0.38) : vec3(0.75, 0.7, 0.62);
    float awn = step(shopH * 0.76, y) * step(y, shopH * 0.93);
    color = mix(dcWall * 0.85, vec3(0.16, 0.19, 0.21), shopWin);
    color = mix(color, awning, awn);
    dcGlass = shopWin;
  }

  // Porte d'entrée des maisons, côté rue (sud).
  if (dcStyle > 3.5 && dcStyle < 4.5 && dcN.z > 0.5) {
    float door = dcBand(u, width * 0.5, 0.32) * step(y, 1.6) * step(0.05, y);
    color = mix(color, vec3(0.32, 0.22, 0.16), door);
  }

  // Le pied des murs reçoit moins de lumière.
  color *= 0.76 + 0.24 * smoothstep(0.0, 1.8, y);
  diffuseColor.rgb = color;
} else if (dcN.y > 0.5) {
  // Toit : gravillons dans la teinte du bâtiment, acrotère plus clair.
  float edge = min(min(vDcBox.x, vDcSize.x - vDcBox.x), min(vDcBox.z, vDcSize.z - vDcBox.z));
  float grain = dcNoise(vDcWorld.xz * 2.5 + dcSeed * 9.0);
  vec3 roof = dcWall * mix(0.56, 0.68, grain);
  roof = mix(roof, dcWall * 1.02, 1.0 - smoothstep(0.16, 0.24, edge));
  diffuseColor.rgb = roof;
}
`;

const FACADE_SURFACE = /* glsl */ `
roughnessFactor = mix(roughnessFactor, 0.14, dcGlass);
metalnessFactor = mix(metalnessFactor, 0.55, dcGlass * 0.8);
`;

/** Sols : dalles, pavés, gazon, labours, quais. aGround = (style, graine, -, -). */
const GROUND_FRAGMENT = /* glsl */ `
float dcStyle = vDcExtra.x;
vec2 p = vDcWorld.xz;
vec3 c = diffuseColor.rgb;
if (vDcNormal.y > 0.5) {
  float n = dcNoise(p * 0.7);
  float fine = dcNoise(p * 3.1);
  if (dcStyle < 0.5) {
    c *= 0.94 + 0.08 * n;
  } else if (dcStyle < 1.5) {
    vec2 t = fract(p / 1.0);
    float joint = max(dcBand(t.x, 0.0, 0.03) + dcBand(t.x, 1.0, 0.03), dcBand(t.y, 0.0, 0.03) + dcBand(t.y, 1.0, 0.03));
    c *= (0.95 + 0.07 * fine) * (1.0 - 0.12 * joint);
  } else if (dcStyle < 2.5) {
    vec2 cell = floor(p / 2.0);
    vec2 t = fract(p / 2.0);
    float joint = max(dcBand(t.x, 0.0, 0.02) + dcBand(t.x, 1.0, 0.02), dcBand(t.y, 0.0, 0.02) + dcBand(t.y, 1.0, 0.02));
    c *= (0.95 + 0.06 * dcHash(cell)) * (1.0 - 0.1 * joint);
  } else if (dcStyle < 3.5) {
    c *= 0.86 + 0.18 * n + 0.08 * fine;
  } else if (dcStyle < 4.5) {
    float stripe = step(0.5, fract(p.x / 3.2));
    c *= (0.93 + 0.07 * stripe) * (0.95 + 0.08 * fine);
  } else if (dcStyle < 5.5) {
    float row = fract(p.x / 0.9);
    c = mix(c * 0.78, c * 1.08, smoothstep(0.3, 0.5, row) * (1.0 - smoothstep(0.75, 0.95, row)));
    c *= 0.92 + 0.12 * n;
  } else if (dcStyle < 6.5) {
    c *= 0.82 + 0.26 * n * fine + 0.06 * fine;
  } else if (dcStyle < 7.5) {
    vec2 t = fract(p / vec2(3.0, 1.5));
    float joint = max(dcBand(t.x, 0.0, 0.015) + dcBand(t.x, 1.0, 0.015), dcBand(t.y, 0.0, 0.03) + dcBand(t.y, 1.0, 0.03));
    c *= (0.93 + 0.09 * n) * (1.0 - 0.14 * joint);
  } else {
    vec2 q = vec2(p.x + 0.5 * step(0.5, fract(p.y / 1.2)), p.y);
    vec2 t = fract(q / vec2(1.2, 0.6));
    float joint = max(dcBand(t.x, 0.0, 0.03) + dcBand(t.x, 1.0, 0.03), dcBand(t.y, 0.0, 0.05) + dcBand(t.y, 1.0, 0.05));
    c *= (0.92 + 0.08 * fine) * (1.0 - 0.16 * joint);
  }
} else {
  // Bordures et tranches : un peu plus sombres.
  c *= 0.82;
}
diffuseColor.rgb = c;
`;

/** Chaussées : asphalte, lignes de rive, axe, passages piétons. aRoad = (style, axe : 0 = x, 1 = z, -, -). */
// Sens (vDcExtra.y) : 0 le long de x, 1 le long de z, 2 virage (quart de disque centré sur
// le coin du repère local : la traversée devient le rayon, le long devient l'arc), 3 carrefour sans marquage.
const ROAD_FRAGMENT = /* glsl */ `
float dcStyle = vDcExtra.x;
bool dcAlongX = vDcExtra.y < 0.5;
bool dcBend = vDcExtra.y > 1.5 && vDcExtra.y < 2.5;
bool dcCross = vDcExtra.y > 2.5;
float along = dcAlongX ? vDcBox.x : vDcBox.z;
float across = dcAlongX ? vDcBox.z : vDcBox.x;
float len = dcAlongX ? vDcSize.x : vDcSize.z;
float wid = dcAlongX ? vDcSize.z : vDcSize.x;
if (dcBend) {
  across = length(vDcBox.xz);
  along = across * atan(vDcBox.z, max(vDcBox.x, 1e-4));
  len = 0.0;
  wid = vDcSize.x;
}
vec3 c = diffuseColor.rgb;
if (vDcNormal.y > 0.5) {
  c *= 0.9 + 0.1 * dcNoise(vDcWorld.xz * 0.9) + 0.05 * dcNoise(vDcWorld.xz * 6.0);
  if (dcStyle < 3.5) {
    float paint = 0.0;
    if (dcStyle < 2.5 && wid > 2.9) {
      paint = max(dcBand(across, 0.32, 0.07), dcBand(across, wid - 0.32, 0.07));
    }
    if (dcStyle < 0.5) {
      paint = max(paint, max(dcBand(across, wid * 0.5 - 0.13, 0.06), dcBand(across, wid * 0.5 + 0.13, 0.06)));
    } else {
      float dash = step(0.42, fract(along / 3.2));
      paint = max(paint, dcBand(across, wid * 0.5, 0.07) * dash);
    }
    // Passages piétons aux carrefours, aux deux bouts.
    if (dcStyle > 0.5 && dcStyle < 3.5 && len > wid * 2.2) {
      float d0 = along;
      float d1 = len - along;
      float zone = max(step(0.45, d0) * step(d0, 1.65), step(0.45, d1) * step(d1, 1.65));
      float zebra = step(0.5, fract(across / 0.6)) * step(0.35, across) * step(across, wid - 0.35);
      paint = mix(paint, zebra, zone);
    }
    if (dcCross) paint = 0.0;
    c = mix(c, vec3(0.93, 0.92, 0.87), clamp(paint, 0.0, 1.0) * 0.92);
  } else if (dcStyle < 4.5) {
    c *= 0.9 + 0.22 * dcNoise(vDcWorld.xz * 5.0);
  } else if (dcStyle < 5.5) {
    // Piste : lignes de bord, axe en longs tirets, et aux deux seuils les « touches de piano ».
    float paint = max(dcBand(across, 0.35, 0.08), dcBand(across, wid - 0.35, 0.08));
    paint = max(paint, dcBand(across, wid * 0.5, 0.09) * step(0.45, fract(along / 5.0)));
    float d0 = along;
    float d1 = len - along;
    float threshold = max(step(0.8, d0) * step(d0, 3.6), step(0.8, d1) * step(d1, 3.6));
    float keys = step(0.45, fract(across / 0.62)) * step(0.8, across) * step(across, wid - 0.8);
    paint = mix(paint, max(keys, max(dcBand(across, 0.35, 0.08), dcBand(across, wid - 0.35, 0.08))), threshold);
    c = mix(c, vec3(0.93, 0.92, 0.87), clamp(paint, 0.0, 1.0) * 0.92);
  } else {
    // Voie de circulation des avions : un axe jaune continu.
    c = mix(c, vec3(0.93, 0.74, 0.18), dcBand(across, wid * 0.5, 0.07) * 0.9);
  }
}
diffuseColor.rgb = c;
`;

const WATER_FRAGMENT = /* glsl */ `
if (vDcNormal.y > 0.5) {
  float ripple = dcNoise(vDcWorld.xz * vec2(0.6, 2.2)) * 0.6 + dcNoise(vDcWorld.xz * 3.0) * 0.4;
  diffuseColor.rgb *= 0.9 + 0.2 * ripple;
}
`;

/**
 * Panonceaux et drapeaux : toutes les icônes de la ville sont dessinées dans une seule texture
 * (l'atlas), chaque instance y lit sa case. aIcon = (u, v, largeur, hauteur) de la case.
 * Visible des deux côtés : un drapeau se lit à l'envers de dos, comme un vrai.
 */
export function emblemMaterial(atlas: THREE.Texture): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    map: atlas,
    roughness: 0.7,
    metalness: 0,
    side: THREE.DoubleSide,
    // Comme les affiches : la plaque gagne toujours sur son support, même de loin.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aIcon;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvMapUv = aIcon.xy + vMapUv * aIcon.zw;");
  };
  material.customProgramCacheKey = () => "domcity-emblem";
  return material;
}

export interface CityMaterials {
  /** Façades à fenêtres (attribut aFacade). */
  facade: THREE.MeshStandardMaterial;
  /** Toits, flèches, colonnes, équipements : la couleur de l'instance, sans plus. */
  plain: THREE.MeshStandardMaterial;
  /** Formes à couleurs de sommets : arbres, voitures, lampadaires. */
  painted: THREE.MeshStandardMaterial;
  /** Sols (attribut aGround). */
  ground: THREE.MeshStandardMaterial;
  /** Chaussées (attribut aRoad). */
  road: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  /** Le papier autour de la maquette. */
  paper: THREE.MeshStandardMaterial;
  dispose(): void;
}

export function createMaterials(paperColor: string): CityMaterials {
  const facade = boxShader(
    new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, envMapIntensity: 0.9 }),
    "domcity-facade",
    "aFacade",
    FACADE_FRAGMENT,
    FACADE_SURFACE,
  );
  const ground = boxShader(new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 }), "domcity-ground", "aGround", GROUND_FRAGMENT);
  const road = boxShader(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }), "domcity-road", "aRoad", ROAD_FRAGMENT);
  const water = boxShader(
    new THREE.MeshStandardMaterial({ roughness: 0.08, metalness: 0.15, envMapIntensity: 1.2 }),
    "domcity-water",
    "aWater",
    WATER_FRAGMENT,
  );
  const plain = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.02 });
  const painted = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, vertexColors: true });
  const paper = new THREE.MeshStandardMaterial({ color: paperColor, roughness: 1, metalness: 0, envMapIntensity: 0.3 });
  const all = [facade, ground, road, water, plain, painted, paper];
  return { facade, plain, painted, ground, road, water, paper, dispose: () => all.forEach((m) => m.dispose()) };
}
