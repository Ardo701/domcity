# DOMCity

**Chaque page web est une ville.** DOMCity relève la structure d'une page (son DOM) et la construit en 3D : les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments, les images des panneaux publicitaires. Ensuite, on s'y promène.

> Toutes les décisions, l'architecture et la suite du projet : [docs/ROADMAP.md](docs/ROADMAP.md).

## Ce qui marche aujourd'hui

### Étape 1 : la ville 3D et le mode Wikipédia

- On tape un article Wikipédia (fr, en, de, es, it) et sa ville se construit dans le navigateur. Aucun serveur n'intervient : l'API de Wikipédia autorise directement la lecture depuis un autre site.
- Vue aérienne (glisser, tourner, zoomer) ou promenade au clavier (ZQSD / WASD).
- Survol : ce qu'était chaque bâtiment dans la page. Clic : inspecteur complet (sélecteur, texte, liens, image, position dans l'arbre).

### Étape 2 : le partage
- Bouton « Partager » : aperçu de ce qui sera publié, miniature de la vue, puis un lien public et un lien secret de suppression.
- Pages `/c/[slug]` (ville partagée, versions, signalement) et `/s/[domain]` (pages d'un site), recherche et galerie sur l'accueil.
- Production : Supabase (base) + Cloudflare R2 (fichiers), variables dans [`.env.example`](.env.example).
- Développement : sans aucune configuration, tout tourne en **mode local** (base Postgres embarquée PGlite avec les vraies migrations, fichiers dans `.data/`).

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
npm test           # capture, urbanisme, partage de bout en bout (base locale)
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
├── server/             partage : base (Supabase ou locale), fichiers (R2 ou locaux), sécurité
└── ui/                 composants d'interface (recherche, inspecteur, cartouche, partage…)
supabase/migrations/    schéma de la base, à appliquer dans Supabase (dans l'ordre)
```

`src/capture` n'a aucune dépendance : il sera compilé tel quel dans le bookmarklet (étape 3).

## Feuille de route

1. **Ville 3D + mode Wikipédia** ✅
2. **Partage** : API, Supabase et R2, lien public et lien secret de suppression ✅
3. Bookmarklet : n'importe quel site devient une ville
4. Mégalopole : toutes les pages d'un site, à cocher et décocher
5. Machine à remonter le temps et ambiance (usines, caméras, météo…)
6. Mise en ligne sur Vercel, domaine `domcity.app`

Contenus Wikipédia sous licence CC BY-SA.
