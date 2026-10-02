# DOMCity : feuille de route et décisions

> Document de référence du projet. Il rassemble tout ce qui a été décidé, construit et prévu.
> À lire avant de reprendre le travail. Dernière mise à jour : 2 octobre 2026 (fin de l'étape 2).

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
- Couleurs de la ville façon plan de zonage ; socles en teintes d'altitude (plus c'est imbriqué, plus c'est haut).

## 4. Architecture du code

```
src/
├── app/                         Next.js 16 (App Router)
│   ├── page.tsx                 accueil : recherche Wikipédia, villes partagées, légende, méthode
│   ├── w/[lang]/[title]/        visite d'un article Wikipédia
│   ├── c/[slug]/                ville partagée (+ supprimer/ : lien secret)
│   ├── s/[domain]/              pages d'un site
│   └── api/                     captures (POST), captures/[slug] (DELETE), report, view, search, dev-files
├── format/                      format de ville (types, zod, limites, adresses, dictionnaire HTML → ville)
├── capture/                     page web → ville (sans dépendance, réutilisé par le bookmarklet) ; Wikipédia
├── city/                        urbanisme (layout), scène Three.js, vue et contrôles, miniature
├── server/                      config, base (Supabase ou locale), fichiers (R2 ou locaux), sécurité, partage
└── ui/                          interface (recherche, explorateur, inspecteur, cartouche, partage…)
supabase/migrations/             schéma SQL (à appliquer dans Supabase, jamais via le compte connecté à Claude)
docs/ROADMAP.md                  ce document
```

Flux d'une ville Wikipédia : `fetchWikipediaCity` → `captureDocument` (JSON) → `layoutCity` (lots) → `CityView` (Three.js).
Flux d'un partage : le navigateur envoie langue + titre + miniature JPEG → le serveur **relève lui-même l'article** (linkedom) pour ne pas faire confiance au JSON envoyé → gzip → R2 → ligne Supabase visible.

### Modes de stockage (`src/server/config.ts`)

- **cloud** : Supabase + R2, quand toutes les variables d'environnement sont là (voir `.env.example`).
- **local** : en développement sans configuration, base Postgres embarquée **PGlite** (mêmes migrations SQL) et fichiers dans `.data/`. Permet de tout tester sans compte.
- **off** : en production sans configuration, le partage est masqué.

## 5. Le format de ville (v1)

`CityDoc` : `{ format: 1, source: "wikipedia" | "bookmarklet", url, title, capturedAt, lang?, root }`.
Chaque `CityNode` : `tag`, `text` (nombre de caractères propres), `heading` (h1 à h3), `label` (id lisible ou 1re classe), `img` (`src`, `alt`, `w`, `h`), `links` (`internal`, `external`), `rect` (position réelle, bookmarklet), `children`.
Limites : 30 000 éléments, profondeur 64, 2 Mo compressé. Validation zod dans `src/format/schema.ts`.

Mesures réelles : Wikipédia « Croissant » ~5 Ko, apple.com ~11 Ko, Wikipédia « Paris » ~24 Ko compressés.

## 6. Le dictionnaire HTML → ville

| Balise | Dans la ville |
|---|---|
| `body` | Terrain |
| `section`, `article`, `main` | Quartier (socle qui monte avec l'imbrication) |
| `div` avec enfants / sans enfants / vide | Îlot / Immeuble (hauteur selon le texte, étages dessinés) / Terrain vague |
| `p`, `blockquote`, `pre` | Habitation |
| `ul`, `ol` / `li` | Lotissement / Maison à toit rouge |
| `h1` / `h2` / `h3` / `h4-h6` | Monument (obélisque) / Beffroi / Kiosque / Borne, avec plaque gravée |
| `img` | Panneau avec la vraie image (icônes < 48 px : panneau simple) |
| `video`, `canvas` | Écran géant |
| `iframe` | Ambassade |
| `svg` | Sculpture |
| `form` / `button`, `input`… | Mairie / Guichet |
| `table` | Champs |
| `hr` | Rivière qui traverse le quartier |
| `nav`, `header`, `footer`, `aside` | Périphérique, Porte de la ville, Port, Parc arboré |

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
| `POST /api/captures` | Partager (multipart : `source`, `lang` + `title` ou `city` gzip, `thumbnail` JPEG) | Même origine, 10 partages / heure / IP, gzip borné, zod, JPEG vérifié |
| `DELETE /api/captures/[slug]` | Supprimer avec `{ token }` | Même origine, 30 / heure |
| `POST /api/captures/[slug]/report` | Signaler `{ reason, details? }` | Même origine, 20 / heure, un seul par IP et par ville |
| `POST /api/captures/[slug]/view` | Compter une visite | Une fois par session de navigateur |
| `GET /api/search?q=` | Recherche (« amzon » trouve amazon.com) | Lecture seule |
| `GET /api/dev-files/...` | Sert les fichiers en mode local | Développement uniquement |

## 9. État d'avancement

### Étape 1 : ville 3D et mode Wikipédia ✅ (commit `5775dbc`)
Accueil, recherche Wikipédia (fr, en, de, es, it), relevé, urbanisme, rendu Three.js instancié (ombres, étages, toits, monuments, panneaux avec images), vue aérienne, promenade (souris capturée ou regard en glissant si le navigateur refuse), survol, inspecteur, cartouche, légende, version mobile.

### Étape 2 : partage ✅
Bouton « Partager » (aperçu de ce qui sera publié + miniature 1200 × 630 marquée DOMCity), lien public `/c/[slug]` et lien secret `/c/[slug]/supprimer#jeton`, « Vos villes » mémorisées dans le navigateur, page de ville partagée (copier le lien, signaler, choix de version), page de site `/s/[domain]`, recherche et galerie sur l'accueil, aperçus Open Graph et Twitter, mode local complet.

Vérifié : 27 tests (capture, urbanisme, fichiers piégés, partage de bout en bout sur la base locale), TypeScript, ESLint, compilation de production, parcours complet dans le navigateur (partager, rouvrir, rechercher, versions, supprimer).
**Non vérifié** : le mode cloud contre un vrai Supabase et un vrai R2 (aucun compte branché) ; la capture de la souris dans un navigateur normal ; un vrai téléphone ; un ordinateur peu puissant.

### Pour activer le partage en production (à faire par l'utilisateur, guidé à l'étape 6)
1. Créer le projet Supabase, appliquer les deux migrations dans l'ordre (SQL Editor).
2. Créer le bucket R2 `domcity-villes`, un jeton API « Object Read & Write », brancher le domaine `files.domcity.app` (nuage orange), et la règle CORS :
   ```json
   [{ "AllowedOrigins": ["https://domcity.app", "http://localhost:3000"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```
3. Renseigner les variables de `.env.example` dans Vercel.

## 10. Étapes suivantes

### Étape 3 : le bookmarklet
- `scripts/build-bookmarklet.ts` : compile `src/capture` (sans dépendance) en une ligne `javascript:`.
- Capture de la page affichée avec `withLayout: true` (positions réelles, éléments masqués ignorés), puis ouverture de `domcity.app/nouveau` et transfert des données par `postMessage` (pas d'injection de script : compatible avec les sites stricts comme GitHub ou X).
- Page `/nouveau` : affiche la ville, aperçu avant partage, envoi via `source: "bookmarklet"` (déjà accepté par l'API).
- Page « Installer » : bouton à glisser dans les favoris, animation d'explication.
- À ajouter au relevé : nombre de scripts et domaines des traqueurs, couleurs réelles (pour l'étape 5).
- Mention « relevé par un visiteur » : un JSON de bookmarklet ne peut pas être vérifié par le serveur (risque de fausses villes, d'où les signalements).

### Étape 4 : la mégalopole
Page de site enrichie : toutes les pages assemblées, cases à cocher, placement déterministe selon l'arborescence des adresses, autoroutes entre pages liées, niveaux de détail pour les grandes villes (quartiers lointains simplifiés, images chargées de près). Fonction SQL déjà prête : `site_city(domain, as_of)`.

### Étape 5 : machine à remonter le temps et ambiance
Curseur de date (même fonction `site_city` avec `as_of`) ; éléments d'ambiance listés en section 6.

### Étape 6 : mise en ligne
Guide pas à pas : domaine sur Cloudflare (DNS chez Cloudflare, **nuage gris** pour `domcity.app` vers Vercel, **nuage orange** pour `files.domcity.app` vers R2), projet Vercel relié au dépôt, variables d'environnement, règles du pare-feu Vercel (limite sur `/api/captures`), Attack Mode en cas d'attaque, purge du cache Cloudflare à la suppression (jeton facultatif).

## 11. En réserve (idées et limites connues)

- Promenade : pas encore de collisions avec les bâtiments.
- Très grandes villes : niveaux de détail et `three-mesh-bvh` pour le survol si besoin.
- Image Open Graph par défaut pour l'accueil.
- Avertissement de compilation sans conséquence sur la police Big Shoulders.
- Plan Vercel Hobby : usage non commercial uniquement (les dons sont permis).
- Projet Supabase gratuit mis en pause après une semaine sans activité.

## 12. Travailler sur le projet

```bash
npm install
npm run dev        # http://localhost:3000, partage en mode local
npm test           # 27 tests
npm run lint
npm run typecheck
```

Conventions : textes en français, commentaires en français, aucun tiret cadratin, un commit par étape sur `main`, migrations SQL nouvelles plutôt que modifiées.
