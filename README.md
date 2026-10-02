# DOMCity

**Chaque page web est une ville.** DOMCity relève la structure d'une page (son DOM) et la construit en 3D : les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments, les images des panneaux publicitaires. Ensuite, on s'y promène.

## Étape 1 (actuelle) : la ville 3D et le mode Wikipédia

- On tape un article Wikipédia (fr, en, de, es, it) et sa ville se construit dans le navigateur. Aucun serveur n'intervient : l'API de Wikipédia autorise directement la lecture depuis un autre site.
- Vue aérienne (glisser, tourner, zoomer) ou promenade au clavier (ZQSD / WASD).
- Survol : ce qu'était chaque bâtiment dans la page. Clic : inspecteur complet (sélecteur, texte, liens, image, position dans l'arbre).

## Le dictionnaire HTML → ville

| Balise | Dans la ville |
|---|---|
| `body` | Terrain |
| `section`, `article`, `main` | Quartier (plus c'est imbriqué, plus ça monte) |
| `div` avec enfants / sans enfants | Îlot / Immeuble (hauteur selon le texte) |
| `div` vide | Terrain vague |
| `p`, `blockquote`, `pre` | Habitation |
| `ul`, `ol` / `li` | Lotissement / Maison |
| `h1` / `h2` / `h3` | Monument / Beffroi / Kiosque, avec le titre gravé |
| `img` | Panneau avec la vraie image |
| `hr` | Rivière qui coupe le quartier |
| `nav`, `header`, `footer`, `aside` | Périphérique, Porte de la ville, Port, Parc |
| `table`, `form`, `iframe`, `svg`, `video` | Champs, Mairie, Ambassade, Sculpture, Écran géant |

La liste complète et les couleurs sont dans [`src/format/taxonomy.ts`](src/format/taxonomy.ts).

## Développement

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # tests de la capture et de l'urbanisme
npm run lint
npm run typecheck
```

## Organisation

```
src/
├── app/                Next.js : accueil (/), visite d'un article (/w/[lang]/[title])
├── format/             le format de la ville (types, validation zod, limites, adresses)
├── capture/            page web → ville (JSON) ; mode Wikipédia
├── city/               ville → 3D : urbanisme (layout), scène Three.js, vue et contrôles
└── ui/                 composants d'interface (recherche, inspecteur, cartouche…)
supabase/migrations/    schéma de la base (étape 2), à appliquer dans Supabase
```

`src/capture` n'a aucune dépendance : il sera compilé tel quel dans le bookmarklet (étape 3).

## Feuille de route

1. **Ville 3D + mode Wikipédia** ✅
2. Partage : API, Supabase (base) et Cloudflare R2 (fichiers des villes), lien public et lien secret de suppression
3. Bookmarklet : n'importe quel site devient une ville
4. Mégalopole : toutes les pages d'un site, à cocher et décocher
5. Machine à remonter le temps et ambiance (usines, caméras, météo…)
6. Mise en ligne sur Vercel, domaine `domcity.app`

Contenus Wikipédia sous licence CC BY-SA.
