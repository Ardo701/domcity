import * as THREE from "three";

/**
 * Matériau des immeubles : des lignes d'étage tous les 1,6 m sur les façades,
 * calculées dans le shader à partir de l'altitude réelle. Elles s'effacent au
 * loin pour ne pas fourmiller.
 */
function withFloorLines(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vFloorY;\nvarying float vFacade;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 floorWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          floorWorld = instanceMatrix * floorWorld;
        #endif
        floorWorld = modelMatrix * floorWorld;
        vFloorY = floorWorld.y;
        vFacade = 1.0 - abs(normal.y);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vFloorY;\nvarying float vFacade;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float storey = vFloorY / 1.6;
        float blur = clamp(fwidth(storey) * 3.0, 0.0, 1.0);
        float line = smoothstep(0.86, 0.9, fract(storey)) * (1.0 - blur);
        diffuseColor.rgb *= 1.0 - 0.17 * line * step(0.5, vFacade);`,
      );
  };
  material.customProgramCacheKey = () => "domcity-floor-lines";
  return material;
}

export interface CityMaterials {
  slab: THREE.MeshStandardMaterial;
  building: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  painted: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  dispose(): void;
}

export function createMaterials(groundColor: string): CityMaterials {
  const slab = new THREE.MeshStandardMaterial({ roughness: 0.97, metalness: 0 });
  const building = withFloorLines(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }));
  const plain = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
  const painted = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, vertexColors: true });
  const water = new THREE.MeshStandardMaterial({ roughness: 0.12, metalness: 0.08 });
  const ground = new THREE.MeshStandardMaterial({ color: groundColor, roughness: 1, metalness: 0 });
  const all = [slab, building, plain, painted, water, ground];
  return {
    slab,
    building,
    plain,
    painted,
    water,
    ground,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}
