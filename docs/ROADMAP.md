# DOMCity : feuille de route et décisions

> Document de référence du projet. Il rassemble tout ce qui a été décidé, construit et prévu.
> À lire avant de reprendre le travail. Dernière mise à jour : 3 octobre 2026 (retouches avant la mise en ligne : flèche du nord, figure de l'accueil rendue par le moteur 3D, en-tête épuré avec un bouton GitHub, héros qui tient dans le premier écran, accueil centré sur le favori, barre de navigation commune, pages Découvrir et Votre compte, pied de page et pages légales, les sites au premier plan avec la page d'un site, miniature automatique).

## 1. Le concept

**Chaque page web est une ville.** DOMCity relève la structure d'une page (son DOM) et la construit en 3D. Les sections deviennent des quartiers, les blocs des immeubles, les titres des monuments, les images des panneaux publicitaires. On peut survoler la ville, inspecter chaque bâtiment (ce qu'il était dans la page) et s'y promener.

- Dépôt : https://github.com/Ardo701/domcity (branche `main`, un commit par étape)
- Domaine prévu : `domcity.app` (acheté sur Cloudflare), fichiers sur `files.domcity.app`

## 2. Décisions prises, et pourquoi

| Sujet | Décision | Raison |
|---|---|---|
| Plateforme | **Web app** (pas d'appli de bureau) | Partage par lien, rien à installer |
| Capture des sites | **Bookmarklet uniquement** ; le mode Wikipédia reste joignable par son adresse (`/w/fr/Paris`), sans champ de recherche affiché (ni sur l'accueil, ni dans la barre d'une ville) | La page est déjà affichée chez l'utilisateur : ni CORS, ni anti-bot, ni proxy. Extension Chrome et npx **écartés** par l'utilisateur |
| Wikipédia | Lu directement dans le navigateur | Son API envoie `access-control-allow-origin: *` (vérifié) |
| Proxy serveur pour lire n'importe quel site | **Écarté** | Les règles de Vercel interdisent proxys et scrapers |
| Python, BeautifulSoup, Tauri | **Écartés** | Le navigateur analyse le HTML lui-même |
| Hébergement | **Vercel** (site, API) | Next.js natif, aperçus pour les réseaux sociaux |
| Base de données | **Supabase** (plutôt que Convex) | Modèle relationnel site → page → version, recherche tolérante aux fautes (pg_trgm) |
| Fichiers des villes | **Cloudflare R2** | 10 Go gratuits, sortie de données gratuite et illimitée (la mégalopole charge beaucoup de fichiers) |
| Comptes Supabase | **Jamais le compte connecté dans Claude** | Le projet est sur un autre compte : on livre des migrations SQL que l'utilisateur applique |
| Dépôt | **Un seul dépôt Next.js** (pas de monorepo) | Une seule chose à déployer ; le bookmarklet est compilé depuis le même code |
| Anti-DDoS | Vercel (inclus, tous plans) pour le site ; Cloudflare pour les fichiers | Vercel déconseille un proxy Cloudflare devant lui (il perd la visibilité du trafic) |
| Langue | **Français pour l'instant, anglais plus tard** ; les nouvelles adresses sont en anglais (`/create`, `/account`, `/explore`, `/site/…`) | L'application sera traduite : ses adresses n'auront pas à changer. Les autres (`/nouveau`, `/c/…/supprimer`) changeront avec la traduction. `/c/` (ville partagée) et `/w/` (Wikipédia) restent courts : ce sont les liens qu'on partage |
| Recherche et galerie | **Par site** (amazon.com, fr.wikipedia.org), plus ville par ville | Une mégalopole a plusieurs villes : un site relevé vingt fois remplissait la galerie. Les pages dont le titre répond à la recherche sont rangées sous leur site et mènent droit à leur ville |
| Rendu de la ville | **Ville plate et réaliste** : rues, trottoirs, pâtés denses, bâtiments composés, mobilier urbain (et non plus des socles empilés par profondeur) | Demande de l'utilisateur : l'ancien rendu faisait « compartimenté, très cubique, pas une grande ville ». Les rues n'ont pas à correspondre à un élément de la page : elles séparent les blocs et découpent les longs pâtés, parfois pour le seul décor |

### Principe clé : les données ne changent pas, le moteur si

Une ville stockée est une **description** de la page (JSON), jamais un dessin. Tout l'affichage (genres, couleurs, hauteurs, placement, lumière) est calculé par le moteur à chaque ouverture. Changer le moteur change **toutes** les villes, anciennes comme nouvelles. Trois nuances :
1. Le moteur ne peut afficher que ce qui a été relevé : une nouvelle information (traqueurs, couleurs réelles…) n'existera pas dans les anciennes villes. Le champ `format` du JSON permet de gérer les versions.
2. La miniature (aperçu sur les réseaux, galerie) est figée au moment du partage. Elle est toujours rendue par le moteur, au même cadrage (toute la ville vue du sud-ouest), jamais choisie par la personne qui partage.
3. Pour désigner un bâtiment dans un lien futur, viser sa place dans la page (chemin dans l'arbre), pas le numéro de lot calculé par le moteur.

### Vie privée

- On stocke la **quantité** de texte, jamais le texte, **sauf** les titres h1 à h3 (raccourcis à 120 caractères), nécessaires pour graver les monuments. L'utilisateur l'a validé ; la liste des titres est montrée avant le partage.
- Les adresses sont nettoyées : pas de `?query` ni de `#ancre`, `www.` retiré.
- Le lien secret de suppression contient un jeton après le `#` (jamais envoyé au serveur dans l'adresse). La base ne garde que son empreinte SHA-256.
- Rien ne quitte le navigateur tant que l'utilisateur ne clique pas sur « Publier ».
- Le favori ne fait que lire : jamais le texte des paragraphes, ni ce qui est tapé dans les formulaires, ni les cookies. Avant publication d'un relevé, il montre l'adresse publiée, les titres, et laisse modifier le titre.
- Les liens d'une page vers les autres pages de son site ne sont gardés que sous forme d'**empreinte** (FNV-1a sur 32 bits du chemin, `src/format/links.ts`), jamais en clair : la mégalopole calcule l'empreinte de ses pages et voit lesquelles sont visées. Un chemin privé (un dépôt, un dossier client) ne se lit donc pas dans une ville partagée. Les **domaines** des autres sites visés sont gardés en clair (60 au plus) : ce sont les destinations des vols (validé par l'utilisateur). Un intranet ou une adresse IP n'est jamais noté. L'aperçu avant partage le dit.

### Images

Le JSON garde seulement l'URL. Si le site de l'image autorise CORS, elle s'affiche sur le panneau ; sinon le panneau affiche « image indisponible » (ou « introuvable » si elle a disparu). Un clic montre la vraie image dans une fenêtre 2D (toujours permis).

### Versions et mégalopole

- Chaque relevé d'une page crée une **version datée** ; on n'écrase jamais rien.
- Mégalopole (étape 4, faite) : la dernière version visible de chaque page d'un site (48 au plus, les plus récentes), assemblée dans le navigateur, avec des cases à cocher pour ajouter ou retirer des pages. Placement selon l'adresse des pages (le chemin devient la géographie), stable quand on coche : une page masquée laisse des champs à sa place.
- Machine à remonter le temps (la dernière version de chaque page avant une date) : **mise de côté** par l'utilisateur, l'étape 5 se limite à l'ambiance. La base la permet déjà (`site_city` avec `p_as_of`).

## 3. Identité visuelle (règles de design)

Demande de l'utilisateur : **un design qui ne fait pas « fait par l'IA »**.
- **Aucun tiret cadratin** (caractère U+2014) dans les textes : le vérifier dans `src`, `supabase` et `docs` avant chaque commit.
- Coins à peine arrondis : variables `--radius: 4px` et `--radius-sm: 2px`, rien d'autre.
- Couleurs calmes avec des pointes vives qui ont un sens.

Identité retenue : **« planche d'urbanisme »**.
- Papier `#eeeae1`, encre `#15151a`, filets fins, papier millimétré en fond.
- Orange chantier `#ff4b12` : actions principales et monuments. Jaune balise `#ffd23f` : surbrillance, survol, sélection.
- Polices : **Big Shoulders** (titres, capitales), **Instrument Sans** (texte), **Martian Mono** (étiquettes techniques).
- Motifs : cartouche d'architecte, flèche « Nord : haut de page » (elle tourne avec la caméra), figures axonométriques rendues par le vrai moteur 3D (la maquette posée sur la planche, ses repères reliés aux balises), vignettes de la légende rendues elles aussi par le moteur (un morceau de ville découpé comme une maquette, cerné d'encre). Le cadre de planche (repères A à F), le surtitre « Planche 01 » du haut de page et les numéros de planche des sections de l'accueil ont été retirés à la demande de l'utilisateur.
- La ville elle-même est une **maquette posée sur la planche** : matériaux réels (béton, brique, enduit, verre, gazon, asphalte), ciel reflété dans les vitres, ombres d'un soleil d'ouest. L'orange chantier reste réservé au monument (h1) et aux accents ; le jaune balise au survol et à la sélection.

## 4. Architecture du code

```
src/
├── app/                         Next.js 16 (App Router)
│   ├── page.tsx                 accueil : bouton « Créer une ville » (vers le favori), villes partagées, légende, méthode
│   ├── create/                  page « Créer une ville » : installer le favori (bouton à glisser, animation, installation à la main ; ancienne `/installer`, redirigée)
│   ├── explore/                 « Découvrir les villes » : recherche et les 60 dernières villes partagées
│   ├── account/                 « Votre compte » : les villes publiées depuis ce navigateur, leur lien secret
│   ├── legal/, terms/, privacy/ mentions légales, conditions d'utilisation, confidentialité (éditeur : `src/ui/publisher.ts`)
│   ├── nouveau/                 reçoit la ville envoyée par le favori (non publiée tant qu'on ne clique pas)
│   ├── w/[lang]/[title]/        visite d'un article Wikipédia
│   ├── c/[slug]/                ville partagée (+ supprimer/ : lien secret)
│   ├── site/[domain]/           la page d'un site : ses pages (par morceaux de 60), l'accueil manquant ; megalopolis/ : la mégalopole (toutes ses pages assemblées)
│   └── api/                     captures (POST), captures/[slug] (DELETE), report, view, search, sites/known, dev-files
├── format/                      format de ville (types, zod, limites, adresses, dictionnaire HTML → ville)
├── capture/                     page web → ville (sans dépendance, compilé dans le favori) ; Wikipédia
├── bookmarklet/                 le favori : main.ts (point d'entrée), protocol.ts (échange avec /nouveau), href.ts, generated.ts (compilé)
├── city/                        urbanisme (layout), mégalopole (megalopolis, world), scène Three.js, vue et contrôles
├── server/                      config, base (Supabase ou locale), fichiers (R2 ou locaux), sécurité, partage
└── ui/                          interface (recherche, explorateur, inspecteur, cartouche, partage, réception du favori, mégalopole…)
scripts/build-bookmarklet.mts    compile le favori avec esbuild (npm run bookmarklet, lancé aussi avant chaque build)
supabase/migrations/             schéma SQL (à appliquer dans Supabase, jamais via le compte connecté à Claude)
docs/ROADMAP.md                  ce document
```

Flux d'une ville Wikipédia : `fetchWikipediaCity` → `captureDocument` (JSON) → `layoutCity` (lots, rues, trottoirs, décors) → `buildCityScene` (instances Three.js) → `CityView`.

Le rendu (`src/city/`) :
- `layout.ts` : l'urbanisme. Ville plate sur un socle de maquette, périphérique (coins arrondis) et ceinture verte. Chaque conteneur range ses enfants en rangées dans l'ordre de la page ; des rues séparent les conteneurs et coupent les pâtés trop longs (~24 m) ou trop profonds ; les rues transversales suivent une grille calée sur toute la ville (un joint entre deux maisons est amené sur la ligne la plus proche), si bien qu'elles se prolongent d'une rangée à l'autre et d'une liste à la suivante ; les éléments simples qui se suivent forment un pâté de maisons collées sur un trottoir commun. Un petit élément isolé garde une case presque carrée, la place libre devient une place publique. Parcs, listes, formulaires, tableaux, menus, en-tête et pied de page ont leur sol (gazon, pelouse, pavés, champs, quai) et leurs allées.
- `palette.ts` : couleurs partagées par la 3D et l'interface. Les vignettes de la légende (`src/ui/KindSwatch.tsx`) sont des rendus du moteur, réunis dans `public/figures/legende.webp` (voir section 12).
- `geometries.ts` : formes unitaires (boîte, toit à deux pans, pyramide, cylindre, cône, coupole, sphère, nœud, virage et son bas-côté, plaque, drapeau qui ondule, arbres, voiture, lampadaire).
- `materials.ts` : shaders qui dessinent à l'échelle réelle de chaque instance les fenêtres, vitrines et auvents, toits gravillonnés, dalles, pelouses, labours, marquages routiers et passages piétons.
- `scene.ts` : chaque bâtiment est composé de pièces tirées au sort de façon stable (gratte-ciel à retraits et antenne, immeubles béton, brique ou enduit avec équipements de toit et châteaux d'eau, combles en zinc, maisons à cheminée, tour Art déco du h1, beffroi à cadrans, kiosque à coupole, statues, ambassade à colonnes, sculptures, chantiers et grues, ponts, port avec grues et cargo), puis le mobilier : arbres d'alignement, lampadaires, voitures dans les deux sens.
- `textures.ts` : affiches, panneau « indisponible », plaques des monuments, et l'atlas des icônes (toutes les petites images de la ville dans une seule texture, un seul appel de dessin).
- `view.ts` : caméra, contrôles, ciel (carte d'environnement), lumière, survol et sélection. Elle affiche un « monde » (`world.ts`) : une ville seule, ou plusieurs posées à leur place.
- `ambiance.ts` : ce que la page fait sans le montrer (météo, usines, caméras, graffitis, ruines, vraies couleurs), calculé depuis le relevé ; `layout.ts` place usines, caméras et nuages, `scene.ts` les dessine. La liste des traqueurs est dans `src/format/trackers.ts`, tenue par le moteur.
- `megalopolis.ts` : le plan de la mégalopole (placement des villes et de leurs aérodromes, couloirs, autoroutes, campagne, grand aéroport commun). `world.ts` : l'assemblage. Chaque ville est bâtie dans ses propres coordonnées et avec ses propres numéros de lots (ses tirages au sort en dépendent : elle est identique seule et dans la mégalopole) ; la vue la pose à sa place et décale ses numéros dans un plan commun qui sert au survol et à l'inspecteur.

Flux d'une mégalopole : `/site/[domain]/megalopolis` (serveur : `site_city`, 48 pages au plus) → le navigateur télécharge les villes (6 à la fois) → `citySide` de chacune → `placePages` (toutes les pages, affichées ou non) → pour les pages cochées : `layoutCity(doc, { airport: "aerodrome" })` → `buildMegalopolis` (autoroutes, campagne, grand aéroport) → `assembleWorld` (numéros de survol de l'aéroport puis des aérodromes, après le dernier lot) → `CityView`. Cocher ou décocher rebâtit le monde (`setWorld`) sans bouger la caméra ni les autres villes.
Flux d'un partage Wikipédia : le navigateur envoie langue + titre + miniature JPEG → le serveur **relève lui-même l'article** (linkedom) pour ne pas faire confiance au JSON envoyé → gzip → R2 → ligne Supabase visible.
Flux du favori : clic → ouverture immédiate de `/nouveau` (tant que le clic compte comme geste) → relevé de la page affichée (`live: true`) → `/nouveau` appelle « pret » → le favori répond avec la ville, adressée à l'origine de DOMCity seulement → `/nouveau` vérifie (zod, et que la ville vient bien du site qu'elle décrit) → « recu ». **Plan B** si l'onglet n'a pas pu s'ouvrir ou si le site coupe le lien entre fenêtres (en-tête COOP) : la ville compressée part dans l'ancre `#ville=…` et s'ouvre dans le même onglet. Partage : la ville est envoyée telle quelle (`source: "bookmarklet"`), le serveur la valide mais ne peut pas la vérifier.

### Modes de stockage (`src/server/config.ts`)

- **cloud** : Supabase + R2, quand toutes les variables d'environnement sont là (voir `.env.example`).
- **local** : en développement sans configuration, base Postgres embarquée **PGlite** (mêmes migrations SQL) et fichiers dans `.data/`. Permet de tout tester sans compte.
- **off** : en production sans configuration, le partage est masqué.

## 5. Le format de ville (v1)

`CityDoc` : `{ format: 1, source: "wikipedia" | "bookmarklet", url, title, capturedAt, lang?, page?, linksTo?, root }`.
Chaque `CityNode` : `tag`, `text` (nombre de caractères propres), `heading` (h1 à h3), `label` (id lisible ou 1re classe), `img` (`src`, `alt`, `w`, `h`), `links` (`internal`, `external`), `rect` (position réelle, favori), `bg` (couleur de fond réelle `#rrggbb`, notée seulement là où elle change, favori), `children`.
`page` (favori seulement) : `domSize` (éléments du DOM), `scripts`, `comments` (commentaires HTML), `resources`, `bytes` (octets transférés connus, minimum), `thirdParty` (hôtes tiers, 60 au plus, du plus sollicité au moins sollicité), `colors` (`background`, `text`, `link`). Ces ajouts sont facultatifs : les villes déjà stockées restent valides, le format reste en v1.
`linksTo` (Wikipédia et favori, depuis l'étape 4) : `pages` (empreintes des chemins des pages du même site visées, 1 000 au plus, les plus visées d'abord, la page elle-même exclue) et `sites` (`[domaine, nombre de liens]`, 60 au plus). Facultatif : les villes relevées avant ne le savent pas (pas d'autoroute ni de vols pour elles tant qu'elles ne sont pas relevées à nouveau). Favori en version 2 (un bandeau propose de réinstaller l'ancien).
`img.broken` (favori, depuis l'étape 5) : l'image était cassée dans la page au moment du relevé (chargement fini, rien d'affiché ; ni une image en chargement différé pas encore demandée, ni un SVG sans taille). Favori en version 3.
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
| `img` | Affiche avec la vraie image, accrochée à une façade du bâtiment le plus proche dans la page (toutes les façades libres, en rangées comme à Times Square ; sur le toit quand elles sont pleines). Icône de moins de 48 px : enseigne au rez-de-chaussée ; petit drapeau : mât sur le toit. Elle ne prend pas de case au sol |
| `video`, `canvas` | Écran géant sur une façade, comme une affiche |
| bloc qui n'a que des images (grille de photos) | Galerie : un immeuble sombre bâti pour porter ses images, couvert d'écrans |
| `iframe` | Ambassade à colonnes, sous son drapeau |
| `svg` | Sculpture abstraite |
| `form` / `button`, `input`… | Place de la mairie (pavés, fontaine) / Guichet à auvent |
| `table` | Champs cultivés |
| `hr` | Canal entre deux quais, avec ses ponts |
| liens externes (toute la page) | Aéroport hors les murs, à l'est, relié au périphérique : 1 piste dès 5 liens, 2 dès 50, 3 dès 300, et un avion par porte (12 au plus). Les six sites les plus visés ont chacun leur avion en vol ; un clic ouvre le tableau des départs. Dans la mégalopole : un grand aéroport pour le site, et pour chaque ville d'au moins 20 liens externes un **aérodrome** (piste courte, hangar, 1 à 3 petits avions, manche à air) dont le clic ouvre les départs de sa page |
| lien vers une autre page du site (mégalopole) | Autoroute entre leurs deux villes (deux fois deux voies, terre-plein central), branchée sur un coin de chaque périphérique |
| `nav`, `header`, `footer`, `aside` | Allée plantée, Porte de la ville (arc monumental), Port (grues, cargo, chenal vers le large), Parc arboré |

Les images cherchent leur porteur dans leur bloc (le bâtiment le plus proche dans l'ordre de la page), sinon un niveau au-dessus, et ainsi de suite ; un porteur plein passe la main au suivant. Si aucun bâtiment n'est à deux niveaux d'elles et qu'elles sont au moins trois, ou au bord d'un quartier, une galerie est bâtie pour elles. Une façade collée à un voisin ne porte rien. Leurs numéros restent dans l'ordre de la page (`hung` dans `layout.ts` : un lot sans case, posé ensuite). Le texte écrit directement dans un conteneur devient un bâtiment de plus : un immeuble, ou une maison dans une liste ou un parc. Dans un tableau, ce texte est celui de ses cases (le relevé ne garde que ses images) : il devient une ferme au milieu des champs, jamais un champ posé sur le champ. Ordre de la page : de gauche à droite, puis du nord (haut de page) au sud. Source : `src/format/taxonomy.ts` et `src/city/layout.ts`.

### L'ambiance (étape 5) : ce que la page fait sans le montrer

| Dans la page | Dans la ville |
|---|---|
| Poids : octets chargés (`page.bytes`) et éléments (`page.domSize`, sinon ceux relevés) | **Météo**, le pire des deux : grand soleil (moins de 0,6 Mo et 800 éléments), beau temps (1,5 Mo, 1 500), nuageux (3 Mo, 3 000), couvert (6 Mo, 6 000), orage au-delà. Nuages en boules de coton au-dessus des toits (ombre portée), d'autant plus nombreux que le ciel est chargé ; orage : nuages sombres, rideaux de pluie, un éclair. Une ville seule prend aussi la lumière du temps (soleil voilé, papier de la planche assombri) ; la mégalopole garde une lumière neutre, chaque ville a ses nuages |
| Scripts (`page.scripts`) | **Usines** dans la ceinture verte (ouest, puis sud, puis nord, jamais près des coins) : hall de brique à sheds, une ou deux cheminées rayées qui fument vers l'est. Une usine pour six scripts, 12 au plus |
| Traqueurs parmi les sites tiers (`page.thirdParty` comparé à `TRACKERS`) | **Caméras de surveillance** au bord des rues, sur leur mât, diode orange, champ de vision dessiné au sol. Trois par traqueur, 36 au plus |
| Commentaires HTML (`page.comments`) | **Graffitis** au pied des façades sud (immeubles, palissades de chantier) : « TODO », « FIXME », « &lt;!-- --&gt; », « HACK »… (le texte des commentaires n'est jamais relevé : ce sont les mots qu'on y trouve). Un par commentaire, 40 au plus |
| Image cassée (`img.broken`) | **Ruine** à la place du panneau : pans de mur en équerre, panneau tombé, poteaux penchés, gravats |
| Couleurs de fond (`bg`, `page.colors.background`) | **Vraies couleurs du site**, en option : murs, toits et sols prennent la couleur de fond de leur élément (ou de son plus proche parent qui en a une). Le monument garde la sienne |

Survol : « Usines · 48 scripts dans la page » et « Caméras de surveillance · 5 traqueurs publicitaires · googletagmanager.com, doubleclick.net… ». Bouton **Ambiance** dans la barre d'outils : le bulletin (météo et sa cause, usines, caméras et la liste des traqueurs, graffitis, ruines) et l'interrupteur des vraies couleurs ; dans la mégalopole, les totaux et la météo de chaque ville. La légende a un groupe « Ambiance ».

## 7. Base de données (Supabase)

Migrations dans `supabase/migrations/`, testées sur PGlite :
1. `20261002120000_initial_schema.sql` : tables `sites`, `pages`, `captures`, `capture_secrets`, `reports`, `rate_events` ; triggers de compteurs ; RLS (lecture publique seulement) ; fonctions `create_capture`, `publish_capture`, `delete_capture`, `report_capture`, `hit_rate_limit`, `site_city`, `page_versions`, `search_cities`, `record_view`.
2. `20261002160000_sharing_reads.sql` : `get_capture`, `recent_captures`, `get_site`, `site_pages`.
3. `20261003120000_megalopolis.sql` : `known_sites(domaines[])`, parmi les sites liés, ceux qui ont des villes sur DOMCity (le tableau des départs propose d'aller les voir).
4. `20261003180000_sites_first.sql` : `search_sites` (un résultat par site, ses 3 pages qui répondent le mieux avec leur dernière version), `recent_sites` (la galerie, avec la miniature de l'accueil ou à défaut de la page la plus récente), `site_page_list` (les pages d'un site par morceaux). Retire `search_cities` et `recent_captures`.

Règles : toutes les écritures passent par l'API (clé secrète) ; 3 signalements de personnes différentes masquent une version (la page retombe sur la précédente) ; une version est `pending` tant que ses fichiers ne sont pas dans R2. Ne jamais modifier une migration déjà appliquée : en ajouter une nouvelle.

## 8. API

| Route | Rôle | Protections |
|---|---|---|
| `POST /api/captures` | Partager (multipart : `source`, `lang` + `title` ou `city` gzip, `thumbnail` JPEG) | Même origine, 10 partages / heure / IP, gzip borné, zod, JPEG vérifié, pages locales ou d'intranet refusées |
| `DELETE /api/captures/[slug]` | Supprimer avec `{ token }` | Même origine, 30 / heure |
| `POST /api/captures/[slug]/report` | Signaler `{ reason, details? }` | Même origine, 20 / heure, un seul par IP et par ville |
| `POST /api/captures/[slug]/view` | Compter une visite | Une fois par session de navigateur |
| `GET /api/search?q=` | Recherche par site (« amzon » trouve amazon.com ; « croissant », la page sous son site) | Lecture seule |
| `GET /api/sites/known?d=a.com,b.org` | Parmi ces domaines, ceux qui ont des villes | Lecture seule, 60 domaines au plus |
| `GET /api/dev-files/...` | Sert les fichiers en mode local | Développement uniquement |

## 9. État d'avancement

### Étape 1 : ville 3D et mode Wikipédia ✅ (commit `5775dbc`)
Accueil, recherche Wikipédia (fr, en, de, es, it), relevé, urbanisme, rendu Three.js instancié (ombres, étages, toits, monuments, panneaux avec images), vue aérienne, promenade (souris capturée ou regard en glissant si le navigateur refuse), survol, inspecteur, cartouche, légende, version mobile.

### Étape 2 : partage ✅ (commit `473157e`)
Bouton « Partager » (aperçu de ce qui sera publié + miniature 1200 × 630 marquée DOMCity, aujourd'hui une maquette rendue automatiquement : voir les retouches), lien public `/c/[slug]` et lien secret `/c/[slug]/supprimer#jeton`, « Vos villes » mémorisées dans le navigateur, page de ville partagée (copier le lien, signaler, choix de version), page de site `/s/[domain]`, recherche et galerie sur l'accueil, aperçus Open Graph et Twitter, mode local complet.

Vérifié : 27 tests (capture, urbanisme, fichiers piégés, partage de bout en bout sur la base locale), TypeScript, ESLint, compilation de production, parcours complet dans le navigateur (partager, rouvrir, rechercher, versions, supprimer).
**Non vérifié** : le mode cloud contre un vrai Supabase et un vrai R2 (aucun compte branché) ; la capture de la souris dans un navigateur normal ; un vrai téléphone ; un ordinateur peu puissant.

### Étape 3 : le favori (bookmarklet) ✅
- **Le favori** (`src/bookmarklet/main.ts`, ~9 Ko minifiés, ~13,5 Ko encodés) : tout le code est dans le lien, rien n'est chargé ni injecté dans la page. Il ouvre `/nouveau`, relève la page affichée, et n'envoie la ville qu'à l'origine de DOMCity. Plan B dans l'ancre de l'adresse (popup bloquée, site qui isole ses fenêtres). L'adresse de DOMCity est inscrite dans le lien au moment de l'installation (`bookmarkletHref(window.location.origin)`) : un favori installé depuis localhost pointe vers localhost, depuis domcity.app vers domcity.app.
- **`/nouveau`** : attend la ville (« Réception du relevé »), la vérifie, la garde en mémoire de session (un rechargement ne la perd pas), puis la construit. Mention « Votre relevé · non publié ». Si le favori date d'une version précédente (`BOOKMARKLET_VERSION`), un bandeau propose de le réinstaller.
- **Partage d'un relevé** : titre publié modifiable, adresse publiée affichée, avertissement « page privée ? ne la publiez pas », liste de ce qui part (positions, couleurs, scripts, sites tiers). Les pages locales ou d'intranet (localhost, IP, `.local`…) ne se partagent pas (refus côté serveur aussi).
- **Ville partagée par le favori** : mention « Relevé par un visiteur » (avec explication au survol).
- **`/installer`** (aujourd'hui `/create`) : bouton orange à glisser, animation du geste en trois temps (glisser, cliquer, visiter), « ce qui est relevé / jamais relevé », installation à la main sur téléphone (copier le code), limites. Un clic sur le bouton essaie le favori sur la page même.
- **Relevé enrichi** (pour l'étape 5) : couleurs de fond réelles, scripts, commentaires HTML, ressources, poids, hôtes tiers ; affichés dans le cartouche (« 10 scripts · 3 sites tiers · 2,1 Mo chargés ») et l'inspecteur (position sur la page, fond réel).
- Accueil : lien « Installer le favori », menu « Le favori ». Correction au passage : le champ de recherche faisait déborder l'accueil sur mobile.
- Aucune nouvelle migration SQL : l'API acceptait déjà `source: "bookmarklet"`.

Vérifié : 45 tests (favori compilé à jour et assez court, échange de messages simulé des deux côtés, plan B, origine vérifiée, relevé live avec shadow DOM, `display: contents`, couleurs et scripts tiers, pages locales refusées), TypeScript, ESLint, compilation de production. Dans le navigateur : page Installer (bureau et mobile 375 px sans débordement), animation, clic d'essai (plan B, ville construite), favori lancé sur github.com/vercel/next.js (ville construite, publiée avec un titre modifié, page partagée « Relevé par un visiteur », inspecteur avec fond réel et position).
**Non vérifié** : le chemin principal par messages entre onglets dans un vrai navigateur (le navigateur de test bloque les nouveaux onglets : seul le plan B a tourné pour de vrai, le chemin principal est couvert par les tests) ; le glisser dans une vraie barre de favoris (Chrome, Firefox, Safari) ; le clic depuis la barre sur un site à CSP stricte ou Trusted Types (YouTube) ; l'installation à la main sur téléphone.

### Refonte du rendu : une vraie ville (avant l'étape 4)
Demandée par l'utilisateur après l'étape 3. Ville plate, rues hiérarchisées avec marquages et passages piétons, trottoirs, pâtés denses, bâtiments composés, places publiques, mobilier urbain, reflets du ciel, ombres visibles. Monument toujours plus haut que la plus haute tour. Le dessin de l'accueil suit le même moteur. Wikipédia « Paris » : 2 664 éléments, 954 tronçons de rue, environ 850 000 triangles, 2 ms par image sur ce poste.
Vérifié : tests de l'urbanisme (aucun bâtiment sur une rue, rues entre conteneurs voisins, périphérique, monument dominant), captures Paris, Tour Eiffel, GitHub, compilation de production.
**Non vérifié** : un ordinateur peu puissant ou un téléphone ; la promenade au niveau de la rue en interaction réelle.
Compteur **FPS** (bouton « FPS » de la barre d'outils, mémorisé dans le navigateur) : images par seconde, temps entre deux images, temps de calcul, triangles et appels de dessin. Tant qu'il est affiché, la ville est redessinée à chaque image (sinon elle ne l'est que quand quelque chose bouge). Chiffre à l'encre au-delà de 50 (fluide), sur fond jaune au-delà de 30, sur fond orange en dessous.
Scintillement de loin corrigé (affiches rayées par leur cadre, chaussées, champs et toits verts qui clignotaient en dézoomant) : le plan proche de la caméra avance jusqu'à mi-chemin de la ville en vue aérienne, ce qui rend à la profondeur toute sa précision, et l'affiche passe toujours devant son cadre.
Boutons Recadrer, Légende et FPS sur fond de papier encadré (ils se perdaient dans la ville).
Coins du périphérique arrondis (demande de l'utilisateur : les tronçons « menaient nulle part ») : chaque coin est une **case de raccord** (`Joint` dans `layout.ts`) qui dit par quels côtés la chaussée sort. Deux côtés voisins donnent un virage (quart de disque, marquage qui suit la courbe, bas-côté gazonné, arbres le long de l'arrondi) ; deux côtés opposés une ligne droite ; trois ou quatre un carrefour.
Petites images (demande de l'utilisateur : des « champs de panneaux vides » sur Wikipédia « Paris ») : les icônes de moins de 48 px (flèches de tendance des tableaux, pastilles « Article de qualité », crayons Wikidata) étaient de grands panneaux vierges, 342 sur 507. Ce sont désormais des panonceaux d'un mètre qui montrent l'icône, et les petits drapeaux (reconnus à leur fichier ou à leur texte, et à leur forme) flottent sur un mât de 5 m. Les 82 icônes différentes de Paris tiennent dans un atlas de 640 × 576 px : un appel de dessin pour toutes. L'inspecteur les nomme « Panonceau » et « Drapeau ».
Rues alignées (demande de l'utilisateur : dans un lotissement, les petites rues « ne s'alignent pas ») : chaque rangée coupait ses pâtés à sa façon, les rues transversales se décalaient d'une rangée à l'autre (90 petites rues sur 73 positions dans les références de Paris). Elles suivent désormais une grille commune à la ville, au pas d'un pâté ; les cases voisines s'étirent de 30 % au plus pour l'atteindre. Paris : toutes sur 4 lignes, et les listes empilées partagent les mêmes rues.
Survol d'une rue (demande de l'utilisateur : « pourquoi une route s'appelle un îlot ? ») : une rue appartient au conteneur qui l'a fait tracer, la bulle affichait donc ce conteneur. Elle nomme désormais la rue (rue, ruelle, allée, avenue), puis le conteneur : « Ruelle · dans <li.gallerybox> · îlot · Pas dans la page : la ville la trace entre les 2 éléments de ce <li.gallerybox> ». Un clic ouvre toujours la fiche du conteneur.
Aéroport (demande de l'utilisateur) : les liens de la page vers d'autres sites. Il n'est pas un élément de la page : il est hors les murs, à l'est, sur une extension du socle (`airport` dans `layout.ts`), relié au périphérique par une avenue à travers la ceinture verte. Terminal vitré et tour de contrôle côté ville, avions aux portes avec passerelles (dérives aux couleurs de compagnies), voie de circulation à axe jaune, pistes à touches de piano (deux styles de chaussée de plus dans le shader). Avec 2 pistes, un avion attend en bout de piste ; avec 3, un autre décolle. Au survol : « Aéroport · 540 liens vers d'autres sites · 3 pistes · 12 avions aux portes » ; un clic ouvre le tableau des départs (étape 4). Paris : 540 liens, 3 pistes ; Tour Eiffel : 167, 2 pistes ; GitHub : 14, 1 piste. Un port ne fait jamais passer son chenal par l'aéroport.
Ports ouverts sur le large (demande de l'utilisateur : un port enfermé dans la ville « n'est pas logique ») : un chenal mène le bassin jusqu'au bord de la maquette, par le plus court chemin libre (bassin prolongé vers l'ouest ou l'est, ou chenal vers le sud). Il ne passe sous aucun bâtiment ni le long d'une rue ; trottoirs et ceinture verte s'écartent, les rues le franchissent sur un pont (`channels` et `bridges` dans `layout.ts`). Le bassin est descendu au niveau de l'eau des canaux, sous le quai. Sur github.com/vercel/next.js : 13 m vers l'ouest, sous le périphérique.
Toute petite image, quel que soit le site, est agrandie d'un nombre entier de fois dans la fenêtre « voir l'image » (jusqu'à 240 px de côté) et dans l'aperçu de l'inspecteur (160 px) ; au-delà de ×4 ses pixels restent nets plutôt que flous (`src/ui/explorer/FitImage.tsx`). Les images SVG restent vectorielles.

### Étape 4 : la mégalopole ✅
- **Relevé des liens** (commit `a24df6c`) : chaque page note les empreintes des pages de son site qu'elle vise et les domaines des autres sites (voir Vie privée et section 5). Wikipédia aussi (le serveur relève à nouveau l'article au partage). Aperçu avant partage : « Où mènent ses liens ».
- **Page de site** `/s/[domain]` (aujourd'hui `/site/[domain]/megalopolis`) : la mégalopole en 3D, plein écran comme une ville. Liste « Pages du site » (titre et adresse, éléments, cases à cocher, « Voir » qui y amène la caméra, ↗ vers sa ville seule), repliée d'office sur téléphone. D'emblée, les premières pages tant qu'elles font moins de 16 000 éléments (16 pages au plus) ; au-delà de 40 000 éléments affichés, un avertissement.
- **Placement** (`placePages`) : la page d'accueil en haut à gauche, puis dossier par dossier dans l'ordre des adresses ; dans un dossier, de la plus grande ville à la plus petite, en rangées ; une petite ville s'empile sous la précédente quand la plus grande de la rangée lui laisse la place. Des couloirs de campagne de 16 m séparent les villes. Le placement tient compte de toutes les pages, cochées ou non : rien ne bouge quand on coche.
- **Autoroutes** (`buildMegalopolis`) : deux pages affichées sont liées si l'une vise l'autre. Chaque liaison suit le plus court chemin dans les couloirs (Dijkstra, virages pénalisés, autoroutes déjà tracées moins chères : le réseau se partage), et se branche par une bretelle sur un coin du périphérique de chaque ville (le coin devient un carrefour, la ceinture verte s'écarte). Carrefours d'autoroute en cases de raccord (`Joint`, style `highway`).
- **Campagne** : herbe, et parcelles de tailles inégales (blé, cultures vertes, labours, bosquets, prés) bordées de haies, là où il n'y a pas de ville (pages masquées, bas des colonnes, bout des rangées).
- **Grand aéroport commun** à l'est, au bout du grand couloir le plus proche du milieu, relié par l'autoroute à la page qui a le plus de liens vers d'autres sites ; sa taille suit la somme des liens externes des pages affichées. **Vols** : les six sites les plus visés ont un avion en vol, cap tiré du nom du site (aussi dans une ville seule). Un clic sur l'aéroport ouvre le **tableau des départs** (vols DC 001…, liens, « Voir sa ville → » quand le site est sur DOMCity).
- **Un aérodrome par ville** (demande de l'utilisateur : « chaque ville a le sien ») : dès 20 liens vers d'autres sites, la ville garde à l'est de son socle une bande de 18 m (`AERODROME`, réservée par le placement, cochée ou non) avec une piste courte, un hangar au bout d'une rue qui traverse la ceinture verte, 1 à 3 petits avions et une manche à air. Aucune bretelle d'autoroute ne part vers l'est de cette ville. Survol : « Aérodrome · /wiki/Paris · 540 liens vers d'autres sites » ; clic : les départs de cette page. Les vols restent au grand aéroport.
- **Ports** : le chenal qui sort d'une ville continue tout droit à travers la campagne jusqu'au bord de la mégalopole, sous les autoroutes (ponts) ; une autre ville, un carrefour ou une route parallèle l'arrêtent avant.
- **Niveaux de détail** : de loin, une ville de la mégalopole perd ses arbres, voitures et lampadaires ; ses affiches et icônes ne se chargent que quand on s'en approche. Survol : la bulle nomme la page de l'élément ; l'inspecteur donne son numéro dans sa page et un lien vers sa ville seule.

Vérifié : 69 tests (empreintes, relevé des liens, placement sans chevauchement et empilement, liaisons et seulement elles, autoroutes jamais sur une ville, stabilité quand on masque, aéroport et vols, aérodromes dans leur bande et à l'écart des autoroutes, chenal prolongé, plan identique d'une fois sur l'autre), TypeScript, ESLint, compilation de production. Dans le navigateur, sur la base locale : 9 articles de Wikipédia liés (Paris, Louvre, Lyon, Tour Eiffel…) : 12 417 éléments, 24 liaisons, 60 destinations ; 2,3 millions de triangles et 2 ms par image en vue d'ensemble sur ce poste ; prête en ~5 s en développement, une case cochée rebâtit en ~0,25 s ; 8 aérodromes sur 9 villes (la page d'homonymie n'en a pas), bulle et départs de la page au clic, tableau qui reste celui de sa page quand on coche une autre ville ; github.com (1 page) : chenal prolongé jusqu'au bord, autoroute vers l'aéroport ; téléphone 375 px sans débordement.
**Non vérifié** : une mégalopole de 48 grandes pages ; un ordinateur peu puissant ; `known_sites` sur un vrai Supabase.

### Étape 5 : l'ambiance ✅
Demande de l'utilisateur : l'ambiance seule, pas la machine à remonter le temps. Voir la section 6 (« L'ambiance »).
- Météo, usines, caméras, graffitis, ruines, vraies couleurs ; numéros de survol des usines et des caméras après le dernier lot, comme l'aéroport (`Special` dans `world.ts`, un seul mécanisme pour aéroport, aérodromes, usines et caméras).
- Favori en version 3 : il note les images cassées. L'aperçu avant partage et la page Installer le disent (avec le nombre de commentaires HTML, déjà relevé depuis l'étape 3).
- Les villes Wikipédia et les relevés plus anciens n'ont que la météo (sur les éléments relevés) ; le bulletin dit ce qui manque et propose le favori.
- Aucune nouvelle migration SQL.

Vérifié : 74 tests (traqueurs et sous-domaines, météo et comptes, usines dans la ceinture hors des rues, carrefours et chenaux, caméras au bord des rues, ruines, numéros de survol seule et dans le monde, image cassée relevée et pas celle en chargement différé), TypeScript, ESLint, compilation de production. Dans le navigateur : GitHub (relevé réel) : couvert, 2 usines, 7 graffitis, vraies couleurs sombres (la page avait été relevée en thème sombre) ; le même relevé chargé de 5 traqueurs, 7,5 Mo, 48 scripts et 3 images cassées : orage avec pluie et éclair, 8 usines, 15 caméras, 23 graffitis, 3 ruines ; mégalopole Wikipédia : 3 villes nuageuses, 1 de beau temps, 5 au soleil ; bulletin sur téléphone 375 px sans débordement.
**Non vérifié** : la détection des images cassées dans un vrai navigateur (couverte par les tests) ; le favori v3 glissé dans une vraie barre ; le rendu sur un ordinateur peu puissant (nuages et fumées ajoutent quelques centaines d'instances).

### Images accrochées aux bâtiments ✅
Demande de l'utilisateur : des dizaines de panneaux plantés chacun sur sa parcelle (et des champs de panonceaux) ne font pas une ville naturelle. Les images deviennent des affiches sur les façades, à la Times Square, sur toutes les façades libres (la caméra tourne : aucune n'est privilégiée). Voir le dictionnaire (section 6).
- Les 9 articles Wikipédia de la mégalopole avaient 935 grands panneaux pour 6 780 bâtiments ; 99,7 % des images trouvent un porteur à un ou deux niveaux d'elles. Musée du Louvre : 301 affiches, toutes accrochées, réparties sur les quatre orientations (70 à 88 chacune), 22 enseignes, 1 drapeau, aucune image sans place.
- Taille d'une affiche selon l'image (environ 3 m pour une vignette de 250 px, 13 m au plus), au-dessus du rez-de-chaussée (vitrines, enseignes, graffitis restent visibles) ; sous le toit pentu d'un immeuble bas, sous le premier retrait d'un gratte-ciel.
- Affiche de remplacement sobre quand le site ne prête pas l'image : le texte alternatif en grand sur une teinte calme, « image non affichée · clic pour la voir » (les hachures « indisponible » auraient couvert des façades entières).
- La bulle et l'inspecteur nomment « Affiche », « Enseigne », « Drapeau », « Galerie (images de <div.grille>) ». Les ruines (images cassées) gardent leur parcelle.
Vérifié : 75 tests (affiches contre la façade de leur porteur, dans aucun bâtiment, au-dessus de sa base ; image d'une figure sur sa légende ; galerie pour un bloc d'images ; plusieurs façades ; numéros dans l'ordre de la page ; les images ne grandissent pas la ville), TypeScript, ESLint, compilation de production. Dans le navigateur : Louvre (vue d'ensemble sans champ de panneaux, affiches sur façades, drapeau au toit), page d'essai à grille de 20 photos (galerie de 14 étages couverte d'affiches).
**Non vérifié** : un site marchand réel (grilles de produits) ; le rendu de très nombreuses affiches sur un ordinateur modeste (autant d'appels de dessin qu'avant : les niveaux de détail des affiches restent à faire).

### Tailles minimales et rues réalistes ✅
Demande de l'utilisateur : des maisons minuscules (une d'un mètre de large sous un drapeau), des ruelles « seules » sans route au bout, des voitures au milieu de la chaussée.
- **Taille minimale des bâtiments** (`MIN_SIDE` dans `layout.ts`) : maison 2,2 unités (6,6 m), immeuble et tour 2,6 (7,8 m), galerie 6. Une petite case ne partage plus la rangée d'un voisin qui l'écraserait, une rangée n'est jamais moins profonde que son plus petit bâtiment, une rue ne se trace pas si elle écrase ses voisins, et un bâtiment mord sur son trottoir plutôt que de rétrécir. Quand les rangées ne tiennent vraiment pas, elles se rangent comme un texte, ligne à ligne, chaque case à sa taille minimale (`denseRows`).
- **Rues à double sens** : toute rue carrossable fait au moins 2,4 unités (7 m, `DRIVABLE_MIN`) et porte une file de voitures dans chaque sens. Une rue plus étroite n'est pas tracée. Les lotissements gardent entre leurs rangées la place d'une ruelle (jardins un peu plus profonds) ; sur une pelouse, la ruelle a un accotement plutôt qu'un trottoir.
- **Réseau relié** : de proche en proche, chaque rue rejoint le périphérique ; celle que rien ne relie s'efface (`connectRoads`) : de l'herbe sur une pelouse, un passage pavé en ville. Les impasses (rattachées par un seul bout) restent permises.
- **Chaque bâtiment donne sur une rue** (deuxième retour de l'utilisateur : des maisons sans route, une maison qui coupe une route, un « sable » au survol muet, des drapeaux en l'air). Les rangées vont par deux, dos à dos, de part et d'autre d'une rue : une rangée sans rue au nord en reçoit une au sud, la dernière en reçoit une au nord si son bord sud ne donne sur rien. Chaque bâtiment réserve de quoi être longé par une rue (`accessMargin`) ; si la rue obligatoire ne tient pas, la limite entre les deux rangées glisse vers celle qui a de la place et le trottoir se resserre (les bâtiments mordent dessus). Chaque conteneur sait quels bords donnent vraiment sur une rue (`Access`) ; un conteneur au bout d'une rangée incomplète prend la place libre pour toucher le bord ; un tronçon sans issue à l'est ni à l'ouest reçoit une rue transversale commune à ses rangées. Au plus serré, on renonce aux marges (et à la rue), jamais à la taille des bâtiments.
- **Plus de maison au milieu d'une route** : une petite rue transversale qui bute, à travers un simple écart, sur une maison de la rangée voisine (au lieu de rejoindre la rue d'en face) s'efface. Celle qui borde un conteneur reste (elle le dessert), quitte à finir en impasse.
- Le « sable » était une rue coupée du réseau changée en allée de gravier : elle s'efface désormais.
- **Drapeaux** : le mât se plante sur le vrai toit plat de son porteur (le socle d'un gratte-ciel, en retrait du bord), jamais sur une maison ni un toit pentu (mêmes tirages que la scène).
- Sur les 11 villes locales (~7 500 bâtiments) : 0 bâtiment trop petit, 0 rue trop étroite, 29 bâtiments sans rue à moins de 9 m (0,4 %, des blocs exigus : diagrammes, bandeaux), contre 365 avant (Montmartre 61 → 0, Lyon 98 → 1, Paris 129 → 16).
- Paris : 485 maisons sur 721 sous 2,2 unités avant, 0 après ; 200 rues trop étroites pour deux voitures avant, 0 après ; 0 rue coupée du réseau (6 allées piétonnes) ; ruelles des lotissements 212 ; la ville grandit de 1,4 %.
Vérifié : 79 tests (tailles minimales sur des pages piégeuses : trente niveaux en escalier, longue liste, boîtes de galerie ; rues assez larges et toutes reliées au périphérique ; chaque maison d'un lotissement enclavé à moins de 9 m d'une rue ; drapeaux sur un toit plat, jamais sur une maison), TypeScript, ESLint, compilation de production ; Paris dans le navigateur (lotissements, ruelles à double sens, drapeaux).
**Non vérifié** : un site très imbriqué relevé par le favori (les escaliers de `div` de l'essai sont synthétiques).

### Retouches avant la mise en ligne
Demandées par l'utilisateur avant l'étape 6.
- **Flèche du nord** (« quand on tourne la caméra il n'y a plus de haut ni de bas logique ») : elle tourne avec la caméra, comme une boussole, et montre toujours où est le haut de la page ; le « N » la suit en restant droit. Le cap se lit sur la droite de l'écran, toujours à l'horizontale (`heading` dans `view.ts`), en vue aérienne comme en promenade. Un clic sur la flèche remet le nord en haut de l'écran (`faceNorth`) : la caméra tourne autour de ce qu'elle regarde par le plus court arc, sans changer de hauteur ni de distance ; en promenade, le promeneur se tourne vers le nord. Ville seule et mégalopole.
- **Figure de l'accueil** (« c'est encore l'ancien type de ville, tout cubique ») : la page de démonstration n'est plus dessinée en boîtes SVG mais rendue par le vrai moteur 3D, en axonométrie (caméra orthographique), vue du sud-ouest (le monument entier, la porte, l'affiche), sur fond transparent : la maquette pose ses ombres sur le papier millimétré de la page. C'est une image (`public/figures/accueil.webp`, 1800 px, ~220 Ko) : l'accueil reste léger, sans Three.js. Les repères (`<h1>` Monument, `<header>` Porte, `<div>` Tour de bureaux, `<h2>` Beffroi, `<img>` Affiche, `<hr>` Canal, `<ul>` Lotissement, `<iframe>` Ambassade, `<footer>` Port) sont placés par l'urbanisme de la page et projetés avec la caméra de l'image (`src/ui/CityFigure.tsx`, `figureMeta.ts`). Les images de l'exemple sont dans `public/figures`. La page Installer montre la même image. L'ancien dessin (`IsoCity`) est retiré.
- **Régénérer la figure** : `npm run dev`, puis ouvrir `/dev/figure` (développement seulement) : la ville est bâtie, rendue deux fois (fond noir puis blanc, pour la transparence), cadrée au plus près, puis enregistrée avec sa caméra et l'empreinte de son urbanisme (`src/ui/heroFigure.generated.ts`). Un test échoue si l'urbanisme de l'exemple a changé depuis. Un changement du seul dessin (`scene.ts`) ne le fait pas échouer : régénérer à la main.
- **En-tête épuré** (accueil et page Installer) : plus de cadre autour de la page ni de lettres A à F, plus de surtitre au carré orange au-dessus du grand titre (« Planche 01 · Urbanisme du web », « Annexe A · Le favori DOMCity ») ; les sections de l'accueil sont renumérotées à partir de la planche 01 (numéros retirés depuis : « Planche 01, 02, 03 » au-dessus des titres des villes partagées, de la légende et de la méthode). À droite de l'en-tête, à la place de « Relevé expérimental · v0.1 », un bouton **GitHub** (logo et libellé, le logo seul sur téléphone) qui mène au dépôt (`REPO_URL` dans `src/ui/GithubLink.tsx` ; le dépôt est encore privé, il sera public à la mise en ligne).
- Le bouton de l'accueil qui mène à la page Installer s'intitule « Créer une ville » (sous « N'importe quel site ») au lieu de « Installer le favori DOMCity ».
- L'image de la figure est préchargée (`preload` de React) : sans cela, le navigateur ne la découvre qu'en lisant le SVG, et les repères apparaissaient un instant sans la ville.
- **Le héros tient dans le premier écran** (« tout le hero n'est pas visible sur l'écran de mon Mac », 1470 × 800) : il faisait 1 085 px de haut, le bouton « Créer une ville » tombait sous le pli. Le titre passe sur trois lignes voulues (« Chaque page / web est une / ville. », il en faisait quatre par retour à la ligne), sa taille, les marges et les écarts suivent aussi la hauteur de l'écran (`svh`) ; sur un écran bas (760 px ou moins, portable de 13 pouces), l'en-tête et le texte se resserrent encore. Vérifié de 1280 × 700 à 2560 × 1300 ; une fenêtre plus basse (1024 × 640) défile encore un peu.
- **Accueil centré sur le favori** (« pour éviter de mettre en avant Wikipédia ») : le champ Wikipédia et les exemples « Essayer » quittent l'accueil. Le bouton principal est « Créer une ville » : il mène aux instructions du favori (`/create`). Il est blanc cassé ; au survol, l'orange chantier tombe au centre comme une goutte et s'étale jusqu'aux bords : deux taches irrégulières qui grandissent en se déformant, au bord ondulé par un bruit (filtre SVG `cta-liquide`). Le texte d'accroche parle du favori seulement. Le mode Wikipédia reste entier : adresses `/w/…`, villes partagées. Le petit champ « Autre article » de la barre d'une ville et de la mégalopole est retiré lui aussi ; il ne reste que dans le panneau d'erreur d'un article Wikipédia introuvable (pour corriger son titre). Les outils (Vue aérienne, Promenade, Recadrer, Légende, Ambiance, FPS, Copier le lien, Signaler) prennent sa place, dans le coin en haut à droite au niveau du titre ; quand ils ne tiennent pas à côté (une ville partagée sous 1 270 px environ, une mégalopole sous 1 100 px), ils passent à la ligne, toujours à droite. Les panneaux (inspecteur, légende, liste des pages, avertissement) se placent sous la barre d'après sa hauteur mesurée (`--bar-bottom`, `useBarBottom.ts`) : sur téléphone, la légende ne recouvre plus la deuxième ligne d'outils. Le héros tient désormais dans le premier écran de 1024 × 640 à 1920 × 1000, et sur téléphone la figure aussi.
- **Navigation commune** (accueil, Créer une ville, Découvrir, Votre compte : `src/ui/SiteHeader.tsx` et `HeaderBar.tsx`) : le logo ramène à l'accueil, puis « Découvrir », « Créer une ville » (la page du favori, ancien « Le favori »), « Votre compte » et le bouton GitHub. Les liens vers les sections de l'accueil (les villes, la légende, la méthode) et de la page du favori sont retirés à la demande de l'utilisateur. La barre reste en haut quand on fait défiler : un fond de papier apparaît et son filet s'étire, animé, jusqu'aux bords de l'écran. Sur téléphone (640 px ou moins), un bouton à trois traits (qui devient une croix) ouvre un menu plein écran : liens numérotés en grandes capitales, GitHub en bas ; Échap ou un lien le referme, la page ne défile pas tant qu'il est ouvert. De 641 à 860 px, GitHub n'a plus que son logo. Autant de marge au-dessus qu'en dessous des liens (20 px ; « il y a plus de marge au-dessus qu'en dessous »).
- **Votre compte** (`/account`, « les villes publiées sur ce navigateur ») : il n'y a ni inscription ni mot de passe, le compte est le navigateur (les villes partagées et leur lien secret, gardés dans son stockage). Chaque ville : titre, date de publication, « Voir », « Copier le lien secret » (pour la supprimer depuis un autre navigateur), « Supprimer ». Sans ville : un mot et le bouton « Créer une ville ». Sur l'accueil, la liste « Vos villes, sur ce navigateur » devient un bouton « Vos villes publiées » (avec leur nombre) vers cette page. Page non indexée.
- **Découvrir les villes** (`/explore`) : la recherche et les 60 derniers sites mis à jour (d'abord les 60 dernières villes, voir « Les sites au premier plan »). L'accueil en garde 9 et un lien « Découvrir tous les sites ».
- **La page du favori devient `/create`** (« pour créer en anglais ») : son onglet s'intitule « Créer une ville », comme son lien dans la barre. L'ancienne adresse `/installer` y redirige (`next.config.ts`). Le favori lui-même ne la connaît pas : rien à recompiler.
- **Pied de page** (« un vrai footer » ; l'ancien cartouche Projet, Relevé, Sources, Échelle est retiré, sans mention de Wikipédia) : `src/ui/SiteFooter.tsx`, sur l'accueil, Créer une ville, Découvrir, Votre compte et les pages légales. La marque et une phrase, trois colonnes (Villes : Découvrir, Créer une ville, Votre compte ; Projet : le code sur GitHub ; Légal : Mentions légales, Conditions d'utilisation, Confidentialité), puis « © 2026 DOMCity » et « Haut de page ».
- **Pages légales** (`/legal`, `/terms`, `/privacy`, en français, mises à jour le 3 octobre 2026) : éditeur et hébergeurs (Vercel pour le site, Cloudflare R2 pour les fichiers, Supabase pour la base), propriété des pages relevées, signalement, crédits (Three.js, polices, et la licence CC BY-SA des titres repris de Wikipédia, seul endroit où Wikipédia est nommé) ; règles de publication, interdits, suppression par le lien secret, signalements (masquée à trois), absence de garantie, droit français ; ce que le favori lit et ne lit jamais, ce qui reste dans le navigateur, ce qui est gardé à la publication, empreintes salées des adresses IP, ce que voient les autres sites (images chargées depuis leur site), prestataires et transferts, bases légales, aucun cookie, droits et CNIL. Écrites d'après le code (stockage, `security.ts`, migrations). **L'identité de l'éditeur est à compléter** dans `src/ui/publisher.ts` : tant qu'un champ est vide, la page affiche « À compléter » sur fond jaune.
- **Logo** : l'utilisateur garde les quatre blocs (cinq pistes proposées : tour Art déco, plan page-ville, ville dans sa balise, maquette sur socle, arbre DOM ; aucune retenue). L'icône d'onglet (`src/app/icon.svg`) perd son fond de papier et se cadre au plus près des blocs : la forme du logo se distingue, sur un onglet clair comme sombre.
- **Vignettes de la légende rendues par le moteur** (« les icônes représentent les éléments de l'ancienne DA, très simples ») : les petits blocs SVG de couleur laissent place à de vraies maquettes, comme la figure de l'accueil. Pour chaque genre (et les rues), une petite page d'exemple est bâtie, un morceau de sa ville est découpé autour de l'élément (sols et rues coupés net, bâtiments gardés entiers ou retirés), rendu en axonométrie du sud-ouest sans ombre portée, puis cerné d'un trait d'encre. Quelques retouches pour la lisibilité : la caméra de surveillance tournée vers nous, le tag sur un petit immeuble vu d'assez bas, le terrain sans ses bâtiments. Les 32 vignettes tiennent dans une image de 1024 × 512 (95 Ko). Elles servent dans la légende de l'accueil (48 px) et de la vue (32 px, au lieu de 22), l'inspecteur, les bulles, le bulletin d'ambiance, le tableau des départs et la page introuvable.
- **Les sites au premier plan** (« une mégalopole peut avoir plusieurs villes ») : la recherche et la galerie montrent des sites, plus des villes une par une. Recherche : un résultat par site (« fr.wikipedia.org · 9 villes ») ; les pages dont le titre répond sont rangées dessous (3 au plus, puis « et 4 autres ») et mènent droit à leur ville ; un titre qui commence par le mot cherché passe devant. Galerie de l'accueil (9 sites) et de Découvrir (60) : un site par carte, la miniature de sa page d'accueil (ou de sa page la plus récente), son nombre de villes, ses visites, sa dernière mise à jour.
- **Page d'un site** (`/site/apple.com`, ancienne `/s/…` redirigée ; « pourquoi /s/ ? ») : légère, sans 3D. Le domaine, ses chiffres (villes, versions, visites, mise à jour), « Visiter la mégalopole » (dès 2 pages, à `/site/…/megalopolis` ; sinon « Visiter la ville »), « Ouvrir apple.com ↗ », puis ses pages en cartes dans l'ordre des adresses (titre, chemin décodé, bâtiments, versions, date), par morceaux de 60. Elle existe dès qu'une page du site est partagée : si la page d'accueil ne l'est pas, une carte vide « Pas encore relevée » invite à l'ouvrir et à cliquer sur le favori (pas pour Wikipédia, qui n'a pas d'accueil à cette adresse). Dans la mégalopole, le surtitre « Mégalopole » y ramène. Nouvelle migration (la 4e).
- **Miniature automatique** (« je ne veux pas qu'une personne puisse faire sa propre image ») : la miniature n'est plus une photo de la vue au moment du partage (cadrage, zoom et vraies couleurs au choix de chacun, cartouche imprimé dedans), mais une prise de vue du moteur, toujours la même : toute la ville en axonométrie, vue du sud-ouest comme la figure de l'accueil, posée avec ses ombres sur le papier millimétré, sans sélection, survol ni vraies couleurs (`thumbnail` dans `view.ts`). Une seule image, un JPEG de 1200 × 630 (le format des aperçus sur les réseaux), qui sert aussi à la galerie : environ 150 Ko et 0,4 s de rendu pour Lyon. Le serveur refuse un JPEG d'une autre taille (`readThumbnail`) ; il ne peut pas vérifier ce qu'il montre (il ne sait pas rendre la 3D) : une image forgée hors de l'interface reste possible, comme une ville forgée, et le signalement s'en charge.

### Pour activer le partage en production (à faire par l'utilisateur à la toute fin, guidé à l'étape 6)
L'utilisateur appliquera **toutes les migrations Supabase à la fin**, en une fois (décision du 2 octobre 2026).
1. Créer le projet Supabase, appliquer les migrations de `supabase/migrations/` dans l'ordre (SQL Editor).
2. Créer le bucket R2 `domcity-villes`, un jeton API « Object Read & Write », brancher le domaine `files.domcity.app` (nuage orange), et la règle CORS :
   ```json
   [{ "AllowedOrigins": ["https://domcity.app", "http://localhost:3000"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```
3. Renseigner les variables de `.env.example` dans Vercel.
4. Compléter l'éditeur du site (nom, statut, adresse, contact, directeur de la publication) dans `src/ui/publisher.ts` : les pages légales l'affichent.

## 10. Étapes suivantes

### Étape 6 : mise en ligne
Guide pas à pas : domaine sur Cloudflare (DNS chez Cloudflare, **nuage gris** pour `domcity.app` vers Vercel, **nuage orange** pour `files.domcity.app` vers R2), projet Vercel relié au dépôt, variables d'environnement, règles du pare-feu Vercel (limite sur `/api/captures`), Attack Mode en cas d'attaque, purge du cache Cloudflare à la suppression (jeton facultatif).

## 11. En réserve (idées et limites connues)

- Machine à remonter le temps (mise de côté à l'étape 5) : un curseur de date sur la page d'un site, la dernière version de chaque page avant cette date (`site_city` avec `p_as_of`, déjà dans la première migration).
- Ambiance : le temps n'est pas animé (pluie, fumée et éclair sont figés, la ville ne se redessine que quand on bouge) ; la liste des traqueurs est à tenir à jour.
- Promenade : pas encore de collisions avec les bâtiments.
- Canaux (`hr`) : les mener eux aussi jusqu'au bord de la maquette, comme les ports (mis de côté par l'utilisateur pour l'instant).
- Performances : chaque affiche est un objet à part (un appel de dessin) ; de loin, les remplacer par des aplats dessinés en un seul lot (proposé à l'utilisateur, avec les plaques des h2 et h3 cachées de loin).
- Mégalopole : survoler une autoroute ne dit pas encore quelles pages elle relie ; les vols ne vont pas encore d'une mégalopole à l'autre en 3D (le tableau des départs y mène) ; un site de plus de 48 pages ne montre que les plus récentes ; les affiches d'une ville très illustrée (Louvre) font beaucoup d'appels de dessin, même de loin.
- Port d'un `<footer>` peu profond (rangée pleine largeur) : bassin et chenal étroits (1,6 m sur GitHub).
- Profondeur : quand la caméra passe sous le haut des toits (promenade, vue rasante), le plan proche revient à 30 cm ; des surfaces très lointaines pourraient encore scintiller un peu.
- Rendu : immeubles en L ou à cour intérieure.
- Urbanisme : un petit élément isolé entre deux gros blocs laisse une place publique ; les impasses (rues rattachées par un seul bout) n'ont pas encore de raquette de retournement.
- Très grandes villes : niveaux de détail et `three-mesh-bvh` pour le survol si besoin.
- Image Open Graph par défaut pour l'accueil.
- Miniatures : figées au partage, elles vieillissent quand le dessin change. Les refaire toutes d'un coup (une page de développement comme `/dev/figure`, une route d'administration en production) ; noter la version du moteur avec chacune.
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
npm test           # 86 tests
npm run lint
npm run typecheck
npm run bookmarklet  # recompile le favori après une modification de src/capture ou src/bookmarklet
```

Le favori compilé (`src/bookmarklet/generated.ts`) est versionné ; un test échoue s'il n'est pas à jour, et `npm run build` le recompile toujours avant de construire.

La figure de l'accueil (`public/figures/accueil.webp` et `src/ui/heroFigure.generated.ts`) est versionnée aussi : `npm run dev` puis `/dev/figure` la régénère ; un test échoue si l'urbanisme de l'exemple a changé depuis.

Les vignettes de la légende (`public/figures/legende.webp` et `src/ui/legendSprite.generated.ts`) aussi : `npm run dev` puis `/dev/legend` les rend toutes et les enregistre (`/dev/legend?only=house,tower` : un essai, sans enregistrer). Chaque genre y a sa petite page d'exemple et son cadrage (`src/app/dev/legend/specs.ts`) ; `excerpt.ts` découpe le morceau de ville. À refaire quand le dessin d'un genre change ; un test échoue si un genre n'a pas de vignette.

Essais de rendu (développement seulement) : la vue 3D est joignable dans la console (`window.__domcity`) ; `lookFrom([x, y, z], [cx, cy, cz])` place la caméra, `capture()` donne l'image, et `POST /api/dev-shot?name=…` l'enregistre dans `.data/shots/`. Utile quand l'onglet est en arrière-plan et ne se redessine plus.

Conventions : textes en français, commentaires en français, aucun tiret cadratin, un commit par étape sur `main`, migrations SQL nouvelles plutôt que modifiées.
