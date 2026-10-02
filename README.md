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

### Étape 3 : le favori
- Page `/installer` : un bouton à glisser dans la barre de favoris. Sur n'importe quel site, un clic relève la page telle qu'elle s'affiche (composants web compris) et l'ouvre en ville dans DOMCity (`/nouveau`).
- Tout le code tient dans le favori : rien n'est chargé ni injecté dans la page, il marche aussi sur les sites stricts. La ville passe d'un onglet à l'autre par messages, ou par l'ancre de l'adresse quand le site isole ses fenêtres.
- Le relevé note aussi les vraies couleurs de fond, les scripts, les sites tiers contactés et le poids de la page (pour l'ambiance de l'étape 5).
- Publication possible, avec titre modifiable et mention « relevé par un visiteur ». Les pages locales ou d'intranet ne se publient pas.

## Le dictionnaire HTML → ville

| Balise | Dans la ville |
|---|---|
| `body` | Terrain, entouré d'un périphérique |
| `section`, `article`, `main` | Quartier, séparé des autres par de grandes avenues |
| `div` avec enfants / avec texte | Îlot bordé de rues / Immeuble de bureaux (tour de verre si beaucoup de texte) |
| `div` vide | Chantier, parfois avec sa grue |
| `p`, `blockquote`, `pre` | Immeuble d'habitation |
| `ul`, `ol` / `li` | Lotissement / Maison |
| `h1` / `h2` / `h3` | Tour Art déco / Beffroi à horloge / Kiosque, avec le titre gravé |
| `img` | Panneau avec la vraie image |
| `hr` | Canal entre deux quais |
| `nav`, `header`, `footer`, `aside` | Allée plantée, Porte de la ville, Port, Parc |
| `table`, `form`, `iframe`, `svg`, `video` | Champs, Place de la mairie, Ambassade, Sculpture, Écran géant |

Rues, trottoirs, arbres, lampadaires et voitures sont du décor : les rues séparent les blocs de la page et découpent les longs pâtés.

La liste complète et les couleurs sont dans [`src/format/taxonomy.ts`](src/format/taxonomy.ts).

## Développement

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # capture, favori, urbanisme, partage de bout en bout (base locale)
npm run lint
npm run typecheck
npm run bookmarklet  # recompile le favori (src/bookmarklet/generated.ts)
```

## Organisation

```
src/
├── app/                Next.js : accueil, article (/w/…), favori (/installer, /nouveau), partage (/c/…, /s/…)
├── format/             le format de la ville (types, validation zod, limites, adresses)
├── capture/            page web → ville (JSON) ; mode Wikipédia
├── bookmarklet/        le favori : point d'entrée, échange avec /nouveau, version compilée
├── city/               ville → 3D : urbanisme (layout), scène Three.js, vue et contrôles
├── server/             partage : base (Supabase ou locale), fichiers (R2 ou locaux), sécurité
└── ui/                 composants d'interface (recherche, inspecteur, cartouche, partage…)
supabase/migrations/    schéma de la base, à appliquer dans Supabase (dans l'ordre)
scripts/                compilation du favori (esbuild)
```

`src/capture` n'a aucune dépendance : il est compilé tel quel dans le favori.

## Feuille de route

1. **Ville 3D + mode Wikipédia** ✅
2. **Partage** : API, Supabase et R2, lien public et lien secret de suppression ✅
3. **Favori (bookmarklet)** : n'importe quel site devient une ville ✅
4. Mégalopole : toutes les pages d'un site, à cocher et décocher
5. Machine à remonter le temps et ambiance (usines, caméras, météo…)
6. Mise en ligne sur Vercel, domaine `domcity.app`

Contenus Wikipédia sous licence CC BY-SA.
