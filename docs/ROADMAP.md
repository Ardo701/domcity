# DOMCity : feuille de route et décisions

> Document de référence du projet. Il rassemble tout ce qui a été décidé, construit et prévu.
> À lire avant de reprendre le travail. Dernière mise à jour : 2 octobre 2026 (refonte du rendu, avant l'étape 4).

## 1. Le concept

**Chaque page web est une ville.** DOMCity relève la structure d'une page (son DOM) et la construit en 3D. Les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments, les images des panneaux publicitaires. On peut survoler la ville, inspecter chaque bâtiment (ce qu'il était dans la page) et s'y promener.

- Dépôt : https://github.com/Ardo701/domcity (branche `main`, un commit par étape)
- Domaine prévu : `domcity.app` (acheté sur Cloudflare), fichiers sur `files.domcity.app`

## 2. Décisions prises, et pourquoi

| Sujet | Décision | Raison |
|---|---|---|
| Plateforme | **Web app** (pas d'appli de bureau) | Partage par lien, rien à installer |
| Capture des sites | **Bookmarklet uniquement** + champ Wikipédia sur le site | La page est déjà affichée chez l'utilisateur : ni CORS, ni anti-bot, ni proxy. Extension Chrome et npx **écartés** par l'utilisateur |
| Wikipédia | Lu directement dans le navigateur | Son API envoie `access-control-allow-origin: *` (vérifié) |
| Proxy serveur pour lire n'importe quel site | **Écarté** | Les règles de Vercel interdisent proxys et scrapers |
| Python, BeautifulSoup, Tauri | **Écartés** | Le navigateur analyse le HTML lui-même |
| Hébergement | **Vercel** (site, API) | Next.js natif, aperçus pour les réseaux sociaux |
| Base de données | **Supabase** (plutôt que Convex) | Modèle relationnel site → page → version, recherche tolérante aux fautes (pg_trgm) |
| Fichiers des villes | **Cloudflare R2** | 10 Go gratuits, sortie de données gratuite et illimitée (la mégalopole charge beaucoup de fichiers) |
| Comptes Supabase | **Jamais le compte connecté dans Claude** | Le projet est sur un autre compte : on livre des migrations SQL que l'utilisateur applique |
| Dépôt | **Un seul dépôt Next.js** (pas de monorepo) | Une seule chose à déployer ; le bookmarklet est compilé depuis le même code |
| Anti-DDoS | Vercel (inclus, tous plans) pour le site ; Cloudflare pour les fichiers | Vercel déconseille un proxy Cloudflare devant lui (il perd la visibilité du trafic) |
| Rendu de la ville | **Ville plate et réaliste** : rues, trottoirs, pâtés denses, bâtiments composés, mobilier urbain (et non plus des socles empilés par profondeur) | Demande de l'utilisateur : l'ancien rendu faisait « compartimenté, très cubique, pas une grande ville ». Les rues n'ont pas à correspondre à un élément de la page : elles séparent les blocs et découpent les longs pâtés, parfois pour le seul décor |

### Principe clé : les données ne changent pas, le moteur si

Une ville stockée est une **description** de la page (JSON), jamais un dessin. Tout l'affichage (genres, couleurs, hauteurs, placement, lumière) est calculé par le moteur à chaque ouverture. Changer le moteur change **toutes** les villes, anciennes comme nouvelles. Trois nuances :
1. Le moteur ne peut afficher que ce qui a été relevé : une nouvelle information (traqueurs, couleurs réelles…) n'existera pas dans les anciennes villes. Le champ `format` du JSON permet de gérer les versions.
2. La miniature (aperçu réseaux sociaux) est figée au moment du partage.
3. Pour désigner un bâtiment dans un lien futur, viser sa place dans la page (chemin dans l'arbre), pas le numéro de lot calculé par le moteur.

### Vie privée

- On stocke la **quantité** de texte, jamais le texte, **sauf** les titres h1 à h3 (raccourcis à 120 caractères), nécessaires pour graver les monuments. L'utilisateur l'a validé ; la liste des titres est montrée avant le partage.
- Les adresses sont nettoyées : pas de `?query` ni de `#ancre`, `www.` retiré.
- Le lien secret de suppression contient un jeton après le `#` (jamais envoyé au serveur dans l'adresse). La base ne garde que son empreinte SHA-256.
- Rien ne quitte le navigateur tant que l'utilisateur ne clique pas sur « Publier ».
- Le favori ne fait que lire : jamais le texte des paragraphes, ni ce qui est tapé dans les formulaires, ni les cookies. Avant publication d'un relevé, il montre l'adresse publiée, les titres, et laisse modifier le titre.

### Images

Le JSON garde seulement l'URL. Si le site de l'image autorise CORS, elle s'affiche sur le panneau ; sinon le panneau affiche « image indisponible » (ou « introuvable » si elle a disparu). Un clic montre la vraie image dans une fenêtre 2D (toujours permis).

### Versions et mégalopole

- Chaque relevé d'une page crée une **version datée** ; on n'écrase jamais rien.
- Mégalopole (étape 4) : la dernière version visible de chaque page d'un site, assemblée dans le navigateur, avec des cases à cocher pour ajouter ou retirer des pages. Placement selon l'adresse des pages (le chemin devient la géographie), stable quand on coche.
- Machine à remonter le temps (étape 5) : la dernière version de chaque page avant une date.

## 3. Identité visuelle (règles de design)

Demande de l'utilisateur : **un design qui ne fait pas « fait par l'IA »**.
- **Aucun tiret cadratin** (caractère U+2014) dans les textes : le vérifier dans `src`, `supabase` et `docs` avant chaque commit.
- Coins à peine arrondis : variables `--radius: 4px` et `--radius-sm: 2px`, rien d'autre.
- Couleurs calmes avec des pointes vives qui ont un sens.

Identité retenue : **« planche d'urbanisme »**.
- Papier `#eeeae1`, encre `#15151a`, filets fins, papier millimétré en fond.
- Orange chantier `#ff4b12` : actions principales et monuments. Jaune balise `#ffd23f` : surbrillance, survol, sélection.
- Polices : **Big Shoulders** (titres, capitales), **Instrument Sans** (texte), **Martian Mono** (étiquettes techniques).
- Motifs : cartouche d'architecte, flèche « Nord : haut de page », dessins axonométriques cernés d'encre (générés par le vrai moteur), repères de planche A à F.
- La ville elle-même est une **maquette posée sur la planche** : matériaux réels (béton, brique, enduit, verre, gazon, asphalte), ciel reflété dans les vitres, ombres d'un soleil d'ouest. L'orange chantier reste réservé au monument (h1) et aux accents ; le jaune balise au survol et à la sélection.

## 4. Architecture du code

```
src/
├── app/                         Next.js 16 (App Router)
│   ├── page.tsx                 accueil : recherche Wikipédia, lien vers le favori, villes partagées, légende, méthode
│   ├── installer/               page « Installer le favori » (bouton à glisser, animation, installation à la main)
│   ├── nouveau/                 reçoit la ville envoyée par le favori (non publiée tant qu'on ne clique pas)
│   ├── w/[lang]/[title]/        visite d'un article Wikipédia
│   ├── c/[slug]/                ville partagée (+ supprimer/ : lien secret)
│   ├── s/[domain]/              pages d'un site
│   └── api/                     captures (POST), captures/[slug] (DELETE), report, view, search, dev-files
├── format/                      format de ville (types, zod, limites, adresses, dictionnaire HTML → ville)
├── capture/                     page web → ville (sans dépendance, compilé dans le favori) ; Wikipédia
├── bookmarklet/                 le favori : main.ts (point d'entrée), protocol.ts (échange avec /nouveau), href.ts, generated.ts (compilé)
├── city/                        urbanisme (layout), scène Three.js, vue et contrôles, miniature
├── server/                      config, base (Supabase ou locale), fichiers (R2 ou locaux), sécurité, partage
└── ui/                          interface (recherche, explorateur, inspecteur, cartouche, partage, réception du favori…)
scripts/build-bookmarklet.mts    compile le favori avec esbuild (npm run bookmarklet, lancé aussi avant chaque build)
supabase/migrations/             schéma SQL (à appliquer dans Supabase, jamais via le compte connecté à Claude)
docs/ROADMAP.md                  ce document
```

Flux d'une ville Wikipédia : `fetchWikipediaCity` → `captureDocument` (JSON) → `layoutCity` (lots, rues, trottoirs, décors) → `buildCityScene` (instances Three.js) → `CityView`.

Le rendu (`src/city/`) :
- `layout.ts` : l'urbanisme. Ville plate sur un socle de maquette, périphérique et ceinture verte. Chaque conteneur range ses enfants en rangées dans l'ordre de la page ; des rues séparent les conteneurs et coupent les pâtés trop longs (~24 m) ou trop profonds ; les éléments simples qui se suivent forment un pâté de maisons collées sur un trottoir commun. Un petit élément isolé garde une case presque carrée, la place libre devient une place publique. Parcs, listes, formulaires, tableaux, menus, en-tête et pied de page ont leur sol (gazon, pelouse, pavés, champs, quai) et leurs allées.
- `palette.ts` : couleurs partagées par la 3D et le dessin de l'accueil (`src/ui/IsoCity.tsx`).
- `geometries.ts` : formes unitaires (boîte, toit à deux pans, pyramide, cylindre, cône, coupole, sphère, nœud, arbres, voiture, lampadaire).
- `materials.ts` : shaders qui dessinent à l'échelle réelle de chaque instance les fenêtres, vitrines et auvents, toits gravillonnés, dalles, pelouses, labours, marquages routiers et passages piétons.
- `scene.ts` : chaque bâtiment est composé de pièces tirées au sort de façon stable (gratte-ciel à retraits et antenne, immeubles béton, brique ou enduit avec équipements de toit et châteaux d'eau, combles en zinc, maisons à cheminée, tour Art déco du h1, beffroi à cadrans, kiosque à coupole, statues, ambassade à colonnes, sculptures, chantiers et grues, ponts, port avec grues et cargo), puis le mobilier : arbres d'alignement, lampadaires, voitures dans les deux sens.
- `view.ts` : caméra, contrôles, ciel (carte d'environnement), lumière, survol et sélection.
Flux d'un partage Wikipédia : le navigateur envoie langue + titre + miniature JPEG → le serveur **relève lui-même l'article** (linkedom) pour ne pas faire confiance au JSON envoyé → gzip → R2 → ligne Supabase visible.
Flux du favori : clic → ouverture immédiate de `/nouveau` (tant que le clic compte comme geste) → relevé de la page affichée (`live: true`) → `/nouveau` appelle « pret » → le favori répond avec la ville, adressée à l'origine de DOMCity seulement → `/nouveau` vérifie (zod, et que la ville vient bien du site qu'elle décrit) → « recu ». **Plan B** si l'onglet n'a pas pu s'ouvrir ou si le site coupe le lien entre fenêtres (en-tête COOP) : la ville compressée part dans l'ancre `#ville=…` et s'ouvre dans le même onglet. Partage : la ville est envoyée telle quelle (`source: "bookmarklet"`), le serveur la valide mais ne peut pas la vérifier.

### Modes de stockage (`src/server/config.ts`)

- **cloud** : Supabase + R2, quand toutes les variables d'environnement sont là (voir `.env.example`).
- **local** : en développement sans configuration, base Postgres embarquée **PGlite** (mêmes migrations SQL) et fichiers dans `.data/`. Permet de tout tester sans compte.
- **off** : en production sans configuration, le partage est masqué.

## 5. Le format de ville (v1)

`CityDoc` : `{ format: 1, source: "wikipedia" | "bookmarklet", url, title, capturedAt, lang?, page?, root }`.
Chaque `CityNode` : `tag`, `text` (nombre de caractères propres), `heading` (h1 à h3), `label` (id lisible ou 1re classe), `img` (`src`, `alt`, `w`, `h`), `links` (`internal`, `external`), `rect` (position réelle, favori), `bg` (couleur de fond réelle `#rrggbb`, notée seulement là où elle change, favori), `children`.
`page` (favori seulement) : `domSize` (éléments du DOM), `scripts`, `comments` (commentaires HTML), `resources`, `bytes` (octets transférés connus, minimum), `thirdParty` (hôtes tiers, 60 au plus, du plus sollicité au moins sollicité), `colors` (`background`, `text`, `link`). Ces ajouts sont facultatifs : les villes déjà stockées restent valides, le format reste en v1.
Limites : 30 000 éléments, profondeur 64, 2 Mo compressé. Validation zod dans `src/format/schema.ts`.

Mesures réelles : Wikipédia « Croissant » ~5 Ko, apple.com ~11 Ko, Wikipédia « Paris » ~24 Ko compressés. Avec le favori, github.com/vercel/next.js : 3 244 éléments relevés en 13 ms, 24 Ko de JSON, 6 Ko compressés.

Relevé « live » (favori) : composants web lus dans leur shadow DOM ouvert (avec les `<slot>`), `display: contents` traversé, éléments masqués ignorés, enveloppes sans surface rendues transparentes, images en chargement différé (`data-src`…) retrouvées, texte des titres lu tel qu'affiché (`innerText`).

## 6. Le dictionnaire HTML → ville

| Balise | Dans la ville |
|---|---|
| `body` | Terrain : le socle de la maquette, son périphérique et sa ceinture verte |
| `section`, `article`, `main` | Quartier, séparé des autres par de grandes avenues |
| `div` avec enfants / avec texte / vide | Îlot bordé de rues / Immeuble de bureaux (tour de verre si beaucoup de texte) / Chantier, parfois avec sa grue |
| `p`, `blockquote`, `pre` | Immeuble d'habitation (béton, brique ou enduit, commerces au rez-de-chaussée) |
| `ul`, `ol` / `li` | Lotissement sur pelouse / Maison à toit et cheminée |
| `h1` / `h2` / `h3` / `h4-h6` | Tour Art déco qui domine la ville / Beffroi à horloge / Kiosque à coupole / Statue, avec plaque gravée pour h1 à h3 |
| `img` | Panneau avec la vraie image (icônes < 48 px : panneau simple) |
| `video`, `canvas` | Écran géant |
| `iframe` | Ambassade à colonnes, sous son drapeau |
| `svg` | Sculpture abstraite |
| `form` / `button`, `input`… | Place de la mairie (pavés, fontaine) / Guichet à auvent |
| `table` | Champs cultivés |
| `hr` | Canal entre deux quais, avec ses ponts |
| `nav`, `header`, `footer`, `aside` | Allée plantée, Porte de la ville (arc monumental), Port (grues, cargo), Parc arboré |

Le texte écrit directement dans un conteneur devient un bâtiment de plus. Ordre de la page : de gauche à droite, puis du nord (haut de page) au sud. Source : `src/format/taxonomy.ts` et `src/city/layout.ts`.

Idées d'ambiance retenues pour l'étape 5 : usines qui fument (quantité de JavaScript), caméras de surveillance (traqueurs publicitaires), météo (poids de la page), ruines (images cassées), graffitis (commentaires HTML), vraies couleurs du site.

## 7. Base de données (Supabase)

Migrations dans `supabase/migrations/`, testées sur PGlite :
1. `20261002120000_initial_schema.sql` : tables `sites`, `pages`, `captures`, `capture_secrets`, `reports`, `rate_events` ; triggers de compteurs ; RLS (lecture publique seulement) ; fonctions `create_capture`, `publish_capture`, `delete_capture`, `report_capture`, `hit_rate_limit`, `site_city`, `page_versions`, `search_cities`, `record_view`.
2. `20261002160000_sharing_reads.sql` : `get_capture`, `recent_captures`, `get_site`, `site_pages`.

Règles : toutes les écritures passent par l'API (clé secrète) ; 3 signalements de personnes différentes masquent une version (la page retombe sur la précédente) ; une version est `pending` tant que ses fichiers ne sont pas dans R2. Ne jamais modifier une migration déjà appliquée : en ajouter une nouvelle.

## 8. API

| Route | Rôle | Protections |
|---|---|---|
| `POST /api/captures` | Partager (multipart : `source`, `lang` + `title` ou `city` gzip, `thumbnail` JPEG) | Même origine, 10 partages / heure / IP, gzip borné, zod, JPEG vérifié, pages locales ou d'intranet refusées |
| `DELETE /api/captures/[slug]` | Supprimer avec `{ token }` | Même origine, 30 / heure |
| `POST /api/captures/[slug]/report` | Signaler `{ reason, details? }` | Même origine, 20 / heure, un seul par IP et par ville |
| `POST /api/captures/[slug]/view` | Compter une visite | Une fois par session de navigateur |
| `GET /api/search?q=` | Recherche (« amzon » trouve amazon.com) | Lecture seule |
| `GET /api/dev-files/...` | Sert les fichiers en mode local | Développement uniquement |

## 9. État d'avancement

### Étape 1 : ville 3D et mode Wikipédia ✅ (commit `5775dbc`)
Accueil, recherche Wikipédia (fr, en, de, es, it), relevé, urbanisme, rendu Three.js instancié (ombres, étages, toits, monuments, panneaux avec images), vue aérienne, promenade (souris capturée ou regard en glissant si le navigateur refuse), survol, inspecteur, cartouche, légende, version mobile.

### Étape 2 : partage ✅ (commit `473157e`)
Bouton « Partager » (aperçu de ce qui sera publié + miniature 1200 × 630 marquée DOMCity), lien public `/c/[slug]` et lien secret `/c/[slug]/supprimer#jeton`, « Vos villes » mémorisées dans le navigateur, page de ville partagée (copier le lien, signaler, choix de version), page de site `/s/[domain]`, recherche et galerie sur l'accueil, aperçus Open Graph et Twitter, mode local complet.

Vérifié : 27 tests (capture, urbanisme, fichiers piégés, partage de bout en bout sur la base locale), TypeScript, ESLint, compilation de production, parcours complet dans le navigateur (partager, rouvrir, rechercher, versions, supprimer).
**Non vérifié** : le mode cloud contre un vrai Supabase et un vrai R2 (aucun compte branché) ; la capture de la souris dans un navigateur normal ; un vrai téléphone ; un ordinateur peu puissant.

### Étape 3 : le favori (bookmarklet) ✅
- **Le favori** (`src/bookmarklet/main.ts`, ~9 Ko minifiés, ~13,5 Ko encodés) : tout le code est dans le lien, rien n'est chargé ni injecté dans la page. Il ouvre `/nouveau`, relève la page affichée, et n'envoie la ville qu'à l'origine de DOMCity. Plan B dans l'ancre de l'adresse (popup bloquée, site qui isole ses fenêtres). L'adresse de DOMCity est inscrite dans le lien au moment de l'installation (`bookmarkletHref(window.location.origin)`) : un favori installé depuis localhost pointe vers localhost, depuis domcity.app vers domcity.app.
- **`/nouveau`** : attend la ville (« Réception du relevé »), la vérifie, la garde en mémoire de session (un rechargement ne la perd pas), puis la construit. Mention « Votre relevé · non publié ». Si le favori date d'une version précédente (`BOOKMARKLET_VERSION`), un bandeau propose de le réinstaller.
- **Partage d'un relevé** : titre publié modifiable, adresse publiée affichée, avertissement « page privée ? ne la publiez pas », liste de ce qui part (positions, couleurs, scripts, sites tiers). Les pages locales ou d'intranet (localhost, IP, `.local`…) ne se partagent pas (refus côté serveur aussi).
- **Ville partagée par le favori** : mention « Relevé par un visiteur » (avec explication au survol).
- **`/installer`** : bouton orange à glisser, animation du geste en trois temps (glisser, cliquer, visiter), « ce qui est relevé / jamais relevé », installation à la main sur téléphone (copier le code), limites. Un clic sur le bouton essaie le favori sur la page même.
- **Relevé enrichi** (pour l'étape 5) : couleurs de fond réelles, scripts, commentaires HTML, ressources, poids, hôtes tiers ; affichés dans le cartouche (« 10 scripts · 3 sites tiers · 2,1 Mo chargés ») et l'inspecteur (position sur la page, fond réel).
- Accueil : lien « Installer le favori », menu « Le favori ». Correction au passage : le champ de recherche faisait déborder l'accueil sur mobile.
- Aucune nouvelle migration SQL : l'API acceptait déjà `source: "bookmarklet"`.

Vérifié : 45 tests (favori compilé à jour et assez court, échange de messages simulé des deux côtés, plan B, origine vérifiée, relevé live avec shadow DOM, `display: contents`, couleurs et scripts tiers, pages locales refusées), TypeScript, ESLint, compilation de production. Dans le navigateur : page Installer (bureau et mobile 375 px sans débordement), animation, clic d'essai (plan B, ville construite), favori lancé sur github.com/vercel/next.js (ville construite, publiée avec un titre modifié, page partagée « Relevé par un visiteur », inspecteur avec fond réel et position).
**Non vérifié** : le chemin principal par messages entre onglets dans un vrai navigateur (le navigateur de test bloque les nouveaux onglets : seul le plan B a tourné pour de vrai, le chemin principal est couvert par les tests) ; le glisser dans une vraie barre de favoris (Chrome, Firefox, Safari) ; le clic depuis la barre sur un site à CSP stricte ou Trusted Types (YouTube) ; l'installation à la main sur téléphone.

### Refonte du rendu : une vraie ville (avant l'étape 4)
Demandée par l'utilisateur après l'étape 3. Ville plate, rues hiérarchisées avec marquages et passages piétons, trottoirs, pâtés denses, bâtiments composés, places publiques, mobilier urbain, reflets du ciel, ombres visibles. Monument toujours plus haut que la plus haute tour. Le dessin de l'accueil suit le même moteur. Wikipédia « Paris » : 2 664 éléments, 954 tronçons de rue, environ 850 000 triangles, 2 ms par image sur ce poste.
Vérifié : tests de l'urbanisme (aucun bâtiment sur une rue, rues entre conteneurs voisins, périphérique, monument dominant), captures Paris, Tour Eiffel, GitHub, compilation de production.
**Non vérifié** : un ordinateur peu puissant ou un téléphone ; la promenade au niveau de la rue en interaction réelle.

### Pour activer le partage en production (à faire par l'utilisateur à la toute fin, guidé à l'étape 6)
L'utilisateur appliquera **toutes les migrations Supabase à la fin**, en une fois (décision du 2 octobre 2026).
1. Créer le projet Supabase, appliquer les migrations de `supabase/migrations/` dans l'ordre (SQL Editor).
2. Créer le bucket R2 `domcity-villes`, un jeton API « Object Read & Write », brancher le domaine `files.domcity.app` (nuage orange), et la règle CORS :
   ```json
   [{ "AllowedOrigins": ["https://domcity.app", "http://localhost:3000"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```
3. Renseigner les variables de `.env.example` dans Vercel.

## 10. Étapes suivantes

### Étape 4 : la mégalopole
Page de site enrichie : toutes les pages assemblées, cases à cocher, placement déterministe selon l'arborescence des adresses, autoroutes entre pages liées, niveaux de détail pour les grandes villes (quartiers lointains simplifiés, images chargées de près). Fonction SQL déjà prête : `site_city(domain, as_of)`. Les relevés du favori nourrissent la mégalopole comme ceux de Wikipédia.

### Étape 5 : machine à remonter le temps et ambiance
Curseur de date (même fonction `site_city` avec `as_of`) ; éléments d'ambiance listés en section 6. Les données sont déjà relevées par le favori : `page.scripts` (usines), `page.thirdParty` à comparer à une liste de traqueurs tenue par le moteur (caméras), `page.bytes` et `page.domSize` (météo), `page.comments` (graffitis), `bg` et `page.colors` (vraies couleurs).

### Étape 6 : mise en ligne
Guide pas à pas : domaine sur Cloudflare (DNS chez Cloudflare, **nuage gris** pour `domcity.app` vers Vercel, **nuage orange** pour `files.domcity.app` vers R2), projet Vercel relié au dépôt, variables d'environnement, règles du pare-feu Vercel (limite sur `/api/captures`), Attack Mode en cas d'attaque, purge du cache Cloudflare à la suppression (jeton facultatif).

## 11. En réserve (idées et limites connues)

- Promenade : pas encore de collisions avec les bâtiments.
- Rendu : niveaux de détail par page (arbres et voitures masqués au loin) si une mégalopole devient lourde ; immeubles en L ou à cour intérieure ; vraies couleurs des sites (relevées par le favori) en option d'ambiance.
- Urbanisme : un petit élément isolé entre deux gros blocs laisse une place publique ; sur les pages très imbriquées, il reste de rares bâtiments minuscules.
- Très grandes villes : niveaux de détail et `three-mesh-bvh` pour le survol si besoin.
- Image Open Graph par défaut pour l'accueil.
- Avertissement de compilation sans conséquence sur la police Big Shoulders.
- Favori : utiliser `rect` pour ranger la ville selon la mise en page réelle (ordre visuel plutôt qu'ordre du code) ; lire les cadres (`iframe`) du même site ; les shadow DOM fermés restent invisibles.
- Favori : les adresses d'images peuvent contenir des paramètres signés (CDN privés) ; envisager de retirer les paramètres de signature connus avant publication.
- Favori : le navigateur ne garde que ~250 ressources dans sa mesure (`resources` et `bytes` sont des minimums).
- Le domaine racine (`rootDomain`) est approché sans la liste officielle des suffixes : github.githubassets.com compte comme site tiers de github.com.
- Plan Vercel Hobby : usage non commercial uniquement (les dons sont permis).
- Projet Supabase gratuit mis en pause après une semaine sans activité.

## 12. Travailler sur le projet

```bash
npm install
npm run dev        # http://localhost:3000, partage en mode local
npm test           # 45 tests
npm run lint
npm run typecheck
npm run bookmarklet  # recompile le favori après une modification de src/capture ou src/bookmarklet
```

Le favori compilé (`src/bookmarklet/generated.ts`) est versionné ; un test échoue s'il n'est pas à jour, et `npm run build` le recompile toujours avant de construire.

Essais de rendu (développement seulement) : la vue 3D est joignable dans la console (`window.__domcity`) ; `lookFrom([x, y, z], [cx, cy, cz])` place la caméra, `capture()` donne l'image, et `POST /api/dev-shot?name=…` l'enregistre dans `.data/shots/`. Utile quand l'onglet est en arrière-plan et ne se redessine plus.

Conventions : textes en français, commentaires en français, aucun tiret cadratin, un commit par étape sur `main`, migrations SQL nouvelles plutôt que modifiées.
