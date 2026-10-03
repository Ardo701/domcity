# Refused sites

> The starting list of sites DOMCity refuses, as filled in by the migration
> `supabase/migrations/20261003200000_blocked_domains.sql` (October 3, 2026), with its notes
> translated into English by `20261003210000_blocked_domains_notes_en.sql`.
> After that, the list lives in the database: this file does not follow additions made in Supabase.

**1553 entries** in six categories. The list is maintained by hand; it will never be complete.

Each entry has a category (`category`) and a note (`note`), both in English: the note
says which group it is filed under (`Videos`, `French banks`...), so that a whole group can be
removed at once.

## What "refused" means

The six categories are treated the same way:

- **No city.** When the bookmarklet is clicked on a page of a refused site, `/nouveau` shows "Site refusé"
  and builds nothing; the capture is not kept.
- **No publishing.** The server refuses the share (403), and the database itself refuses to create the city
  (`create_capture`), even if the site's code were bypassed.
- **Nothing on screen.** An already published city of a site that enters the list disappears at once: city, site
  page, megalopolis, gallery, search, departures board. Its rows stay in the database and its files in R2
  until they are deleted by hand.
- **Images hidden everywhere.** An image from a refused site is never loaded, even when hung in another
  site's city: the poster says "Image masquée", without its alt text. At publishing, its address and text
  are removed from the city before it is stored.
- **Links removed.** A refused site does not appear in another city's departures board or flights.

On top of the list, any page that declares itself adults only (`<meta name="rating">` tag) is refused.

## How an entry applies

- A domain covers its subdomains: `pornhub.com` also refuses `fr.pornhub.com`.
- A more precise entry only affects that subdomain: `mail.google.com` refuses Google's webmail, not
  `google.com` or `www.google.com`.
- An entry without a dot is an extension: `xxx` refuses every site in `.xxx`.
- No keywords: "sex" would refuse essex.ac.uk, "porn" the French town of Pornic, "bank" a blog about riverbanks.

## Maintaining the list

In Supabase, **Table Editor → blocked_domains**: add a row (lowercase domain, without `www.` or
`https://`, and a category), or delete one. Or in the **SQL Editor**:

```sql
-- Add a site
insert into public.blocked_domains (domain, category, note) values ('example.com', 'adult', 'Manual addition');

-- Remove a site
delete from public.blocked_domains where domain = 'example.com';

-- Remove a whole group, or a whole category
delete from public.blocked_domains where note = 'Insurance';
delete from public.blocked_domains where category = 'gambling';

-- The already published cities of a refused site (to delete them by hand, with their files in R2)
select s.domain, c.slug from public.sites s join public.pages p on p.site_id = s.id
  join public.captures c on c.page_id = p.id where public.is_blocked_domain(s.domain);
```

Possible categories: `adult` (adult sites), `violence` (violence and shocking images), `bank` (banks and financial services), `private` (personal data), `gambling` (gambling), `danger` (dangerous sites).

An addition applies right away to publishing and reads. The browser downloads the whole list
(a few kilobytes, nothing about the visited page leaves) and keeps it for a few minutes: it takes up to 5 minutes for
a new site to be hidden on screen.

## Summary

| Category | Code | Entries | Why |
|---|---|---:|---|
| Adult sites | `adult` | 371 | Obscene images: no city, no publishing, and their images are never loaded, even when hung in another site's city. |
| Violence and shocking images | `violence` | 20 | Images of death, injuries or violent acts: treated like adult sites. |
| Banks and financial services | `bank` | 769 | A customer area page shows a name, accounts, amounts: no city, no publishing. |
| Personal data | `private` | 192 | Email, accounts, taxes, health, dating: the displayed page belongs to a person. No city, no publishing. |
| Gambling | `gambling` | 107 | Betting, casinos, lotteries: restricted to adults, like adult sites. |
| Dangerous sites | `danger` | 94 | Tracking, spyware, pirated downloads: DOMCity does not show them and sends nobody there. |
| **Total** | | **1553** | |

## Adult sites (`adult`, 371)

Obscene images: no city, no publishing, and their images are never loaded, even when hung in another site's city.

### Videos (note `Videos`, 133)

`3movs.com`, `4tube.com`, `85po.com`, `alphaporno.com`, `amateurporn.me`, `analdin.com`, `anysex.com`, `ashemaletube.com`, `beeg.com`, `boyfriendtv.com`, `bravotube.net`, `camwhores.tv`, `cliphunter.com`, `daftsex.com`, `dinotube.com`, `drtuber.com`, `empflix.com`, `eporner.com`, `eroprofile.com`, `faphouse.com`, `fapvid.com`, `freeones.com`, `fuq.com`, `fux.com`, `gaytube.com`, `gotporn.com`, `h2porn.com`, `hclips.com`, `hdsex.org`, `hdzog.com`, `hellporno.com`, `hotmovs.com`, `hotscope.tv`, `hqporner.com`, `iceporn.com`, `ixxx.com`, `jacquieetmichel.net`, `jacquieetmicheltv.net`, `jizzbunker.com`, `keezmovies.com`, `lobstertube.com`, `madthumbs.com`, `motherless.com`, `mylust.com`, `noodlemagazine.com`, `nudevista.com`, `nuvid.com`, `perfectgirls.net`, `porn.com`, `porn300.com`, `porn4days.com`, `pornbimbo.com`, `porndig.com`, `porndish.com`, `porndoe.com`, `pornerbros.com`, `porngo.com`, `pornhat.com`, `pornhd.com`, `pornhub.com`, `pornhub.org`, `pornhubpremium.com`, `pornjam.com`, `pornktube.com`, `pornmd.com`, `pornobae.com`, `pornomineiro.com`, `pornone.com`, `pornovoisines.com`, `pornoxo.com`, `pornpros.com`, `pornrabbit.com`, `porntn.com`, `porntop.com`, `porntrex.com`, `porntube.com`, `pornwhite.com`, `realgfporn.com`, `recurbate.com`, `redtube.com`, `redtube.net`, `ruleporn.com`, `sex.com`, `sextvx.com`, `sexu.com`, `shooshtime.com`, `slutload.com`, `spankbang.com`, `spankwire.com`, `sunporno.com`, `sxyprn.com`, `thumbzilla.com`, `tnaflix.com`, `tube8.com`, `tube8.fr`, `tubegalore.com`, `tubepornclassic.com`, `tubesafari.com`, `tubxporn.com`, `tukif.com`, `txxx.com`, `upornia.com`, `vjav.com`, `voyeurhit.com`, `vporn.com`, `watchmygf.me`, `xbabe.com`, `xcafe.com`, `xhamster.com`, `xhamster.desi`, `xhamster18.desi`, `xhamster2.com`, `xhamster3.com`, `xmoviesforyou.com`, `xnxx.com`, `xnxx.tv`, `xnxx2.com`, `xozilla.com`, `xtube.com`, `xvideos.com`, `xvideos.es`, `xvideos.red`, `xvideos2.com`, `xvideos3.com`, `xvideosporno.blog`, `xxx.com`, `xxxbunker.com`, `yespornplease.com`, `youjizz.com`, `youporn.com`, `youporngay.com`, `yourporn.sexy`, `zbporn.com`

### Webcams (note `Webcams`, 26)

`bongacams.com`, `bongacams.org`, `cam4.com`, `cam4.fr`, `camcontacts.com`, `cams.com`, `camsoda.com`, `camster.com`, `camwhoresbay.com`, `chaturbate.com`, `chaturbate.eu`, `dirtyroulette.com`, `flirt4free.com`, `imlive.com`, `jerkmate.com`, `livejasmin.com`, `livejasmin.tv`, `myfreecams.com`, `olecams.com`, `sakuralive.com`, `streamate.com`, `stripchat.com`, `stripchat.global`, `xcams.com`, `xhamsterlive.com`, `xlovecam.com`

### Subscriptions and creators (note `Subscriptions and creators`, 16)

`admireme.vip`, `avn.com`, `clips4sale.com`, `fancentro.com`, `fansly.com`, `fansone.co`, `fanvue.com`, `iwantclips.com`, `justfor.fans`, `loyalfans.com`, `manyvids.com`, `modelhub.com`, `mym.fans`, `onlyfans.com`, `pornhubmodels.com`, `unlockd.me`

### Studios (note `Studios`, 71)

`21sextury.com`, `adulttime.com`, `analvids.com`, `babes.com`, `bangbros.com`, `bangbrosnetwork.com`, `bellesa.co`, `blacked.com`, `brattysis.com`, `brazzers.com`, `cockyboys.com`, `corbinfisher.com`, `czechav.com`, `ddfnetwork.com`, `deeper.com`, `digitalplayground.com`, `dorcel.com`, `dorcelclub.com`, `erikalust.com`, `evilangel.com`, `exxxtrasmall.com`, `fakehub.com`, `familystrokes.com`, `femjoy.com`, `ftvgirls.com`, `girlsway.com`, `hegre.com`, `helixstudios.com`, `hookuphotshot.com`, `hustler.com`, `jacquieetmichelelite.com`, `joymii.com`, `julesjordan.com`, `kink.com`, `legalporno.com`, `letsdoeit.com`, `lustery.com`, `marcdorcel.com`, `men.com`, `metart.com`, `milehighmedia.com`, `mofos.com`, `mydirtyhobby.com`, `mylf.com`, `nakedsword.com`, `naughtyamerica.com`, `newsensations.com`, `nubiles-porn.com`, `nubiles.net`, `penthouse.com`, `pervmom.com`, `playboyplus.com`, `pornbox.com`, `porncz.com`, `private.com`, `propertysex.com`, `puretaboo.com`, `realitykings.com`, `realitykingsnetwork.com`, `seancody.com`, `sexart.com`, `sexyhub.com`, `shoplyfter.com`, `teamskeet.com`, `tushy.com`, `twistys.com`, `vixen.com`, `wicked.com`, `woodmancastingx.com`, `x-art.com`, `xconfessions.com`

### Drawings and games (note `Drawings and games`, 39)

`3dxchat.com`, `8muses.com`, `9hentai.to`, `affect3d.com`, `animeidhentai.com`, `chan.sankakucomplex.com`, `e-hentai.org`, `e621.net`, `exhentai.org`, `f95zone.to`, `fakku.net`, `gelbooru.com`, `hanime.tv`, `hentai-foundry.com`, `hentai.tv`, `hentai2read.com`, `hentaicomics.pro`, `hentaifox.com`, `hentaihere.com`, `hentaimama.io`, `hentaistream.com`, `hitomi.la`, `lewdzone.com`, `luscious.net`, `muchohentai.com`, `multporn.net`, `myhentaigallery.com`, `nhentai.net`, `nhentai.to`, `nutaku.net`, `ohentai.org`, `paheal.net`, `porngameshub.com`, `pururin.to`, `realbooru.com`, `rule34video.com`, `simply-hentai.com`, `tsumino.com`, `xbooru.com`

### Images and forums (note `Images and forums`, 24)

`coomer.party`, `coomer.su`, `erome.com`, `fapello.com`, `fappeningbook.com`, `forumophilia.com`, `imagefap.com`, `imagevenue.com`, `imgsrc.ru`, `kemono.party`, `kemono.su`, `nudostar.com`, `phun.org`, `pichunter.com`, `planetsuzy.org`, `pornbb.org`, `pornpics.com`, `redgifs.com`, `scrolller.com`, `sexyforums.com`, `simpcity.su`, `thothub.to`, `turboimagehost.com`, `vipergirls.to`

### Erotic stories (note `Erotic stories`, 10)

`asstr.org`, `chyoa.com`, `histoires-de-sexe.net`, `literotica.com`, `lushstories.com`, `mcstories.com`, `nifty.org`, `sexstories.com`, `storiesonline.net`, `xnxxstories.com`

### Adult dating and escorts (note `Adult dating and escorts`, 24)

`6annonce.com`, `adultfriendfinder.com`, `adultsearch.com`, `alt.com`, `benaughty.com`, `eros.com`, `escort-advisor.com`, `escortdirectory.com`, `eurogirlsescort.com`, `feeld.co`, `fetlife.com`, `fling.com`, `listcrawler.eu`, `megapersonals.eu`, `netechangisme.com`, `onenightfriend.com`, `rubmaps.ch`, `seeking.com`, `sexemodel.com`, `skipthegames.com`, `slixa.com`, `tryst.link`, `wyylde.com`, `xmatch.com`

### Adult image servers and ad networks (note `Adult image servers and ad networks`, 24)

`adxxx.com`, `ahcdn.com`, `crakrevenue.com`, `ero-advertising.com`, `exoclick.com`, `exosrv.com`, `highwebmedia.com`, `juicyads.com`, `mmcdn.com`, `motherlessmedia.com`, `phncdn.com`, `plugrush.com`, `rdtcdn.com`, `t8cdn.com`, `trafficfactory.biz`, `trafficjunky.com`, `trafficjunky.net`, `trafficstars.com`, `tsyndicate.com`, `twinred.com`, `xhcdn.com`, `xnxx-cdn.com`, `xvideos-cdn.com`, `ypncdn.com`

### Adult top-level domains (note `Adult top-level domains`, 4)

`.adult`, `.porn`, `.sex`, `.xxx`

## Violence and shocking images (`violence`, 20)

Images of death, injuries or violent acts: treated like adult sites.

### Shock sites (note `Shock sites`, 20)

`bestgore.com`, `bestgore.fun`, `crazyshit.com`, `deathaddict.com`, `documentingreality.com`, `efukt.com`, `gorecenter.com`, `goregrish.com`, `goresee.com`, `heavy-r.com`, `inhumanity.com`, `kaotic.com`, `liveleak.com`, `nothingtoxic.com`, `ogrish.com`, `rotten.com`, `seegore.com`, `shockgore.com`, `theync.com`, `watchpeopledie.tv`

## Banks and financial services (`bank`, 769)

A customer area page shows a name, accounts, amounts: no city, no publishing.

### French banks (note `French banks`, 61)

`allianzbanque.fr`, `arkea.com`, `axabanque.fr`, `banque-chalus.fr`, `banque-courtois.fr`, `banque-de-savoie.fr`, `banque-france.fr`, `banque-hottinguer.com`, `banque-kolb.fr`, `banque-laydernier.fr`, `banque-nuger.fr`, `banque-rhone-alpes.fr`, `banque-tarneaud.fr`, `banque-transatlantique.com`, `banquedelareunion.fr`, `banquemartinmaurel.com`, `banquepopulaire.fr`, `bfcoi.com`, `bforbank.com`, `bnpparibas.com`, `bnpparibas.fr`, `boursobank.com`, `boursorama-banque.com`, `boursorama.com`, `bpce.fr`, `bpifrance.fr`, `bred.fr`, `caisse-epargne.fr`, `ccf.fr`, `cfm.mc`, `cic.fr`, `cmb.fr`, `cmso.com`, `credit-agricole.com`, `credit-agricole.fr`, `credit-cooperatif.coop`, `credit-du-nord.fr`, `credit-municipal.fr`, `creditmunicipal.fr`, `creditmutuel.com`, `creditmutuel.fr`, `edmond-de-rothschild.com`, `fortuneo.fr`, `hellobank.fr`, `hsbc.fr`, `la-nef.coop`, `labanquepostale.fr`, `lcl.com`, `lcl.fr`, `milleis.fr`, `monabanq.com`, `natixis.com`, `neuflize-obc.fr`, `oddo-bhf.com`, `orangebank.fr`, `palatine.fr`, `rothschildandco.com`, `sg.fr`, `smc.fr`, `societegenerale.com`, `societegenerale.fr`

### Credit Agricole regional banks (note `Credit Agricole regional banks`, 38)

`ca-alpesprovence.fr`, `ca-anjou-maine.fr`, `ca-aquitaine.fr`, `ca-atlantique-vendee.fr`, `ca-briepicardie.fr`, `ca-centrefrance.fr`, `ca-centreloire.fr`, `ca-centreouest.fr`, `ca-centrest.fr`, `ca-champagne-bourgogne.fr`, `ca-charente-perigord.fr`, `ca-cmds.fr`, `ca-corse.fr`, `ca-cotesdarmor.fr`, `ca-des-savoie.fr`, `ca-finistere.fr`, `ca-franchecomte.fr`, `ca-guadeloupe.fr`, `ca-illeetvilaine.fr`, `ca-languedoc.fr`, `ca-loirehauteloire.fr`, `ca-lorraine.fr`, `ca-martinique.fr`, `ca-morbihan.fr`, `ca-nmp.fr`, `ca-nord-est.fr`, `ca-norddefrance.fr`, `ca-normandie-seine.fr`, `ca-normandie.fr`, `ca-paris.fr`, `ca-pca.fr`, `ca-pyrenees-gascogne.fr`, `ca-reunion.fr`, `ca-sudmed.fr`, `ca-sudrhonealpes.fr`, `ca-toulouse31.fr`, `ca-tourainepoitou.fr`, `ca-valdefrance.fr`

### Neobanks and online banks (note `Neobanks and online banks`, 44)

`ally.com`, `aspiration.com`, `atombank.co.uk`, `axosbank.com`, `bankmobile.com`, `blank.app`, `brex.com`, `bunq.com`, `c24.de`, `chime.com`, `current.com`, `dave.com`, `green-got.com`, `ing.com`, `ing.fr`, `kard.eu`, `koho.ca`, `kroo.com`, `lunar.app`, `lydia-app.com`, `mafrenchbank.fr`, `manager.one`, `mercury.com`, `monzo.com`, `n26.com`, `neon-free.ch`, `nickel.eu`, `novo.co`, `nu.com.mx`, `nubank.com.br`, `pixpay.fr`, `qonto.com`, `ramp.com`, `revolut.com`, `shine.fr`, `sofi.com`, `starlingbank.com`, `sumeria.eu`, `tomorrow.one`, `varomoney.com`, `vivid.money`, `wealthsimple.com`, `yuh.com`, `zopa.com`

### Consumer credit (note `Consumer credit`, 18)

`avant.com`, `banque-casino.fr`, `carrefour-banque.fr`, `cashper.fr`, `cetelem.com`, `cetelem.fr`, `cofidis.com`, `cofidis.fr`, `floa.fr`, `franfinance.fr`, `lendingclub.com`, `onemainfinancial.com`, `oney.fr`, `prosper.com`, `sofinco.fr`, `upgrade.com`, `upstart.com`, `younited-credit.com`

### European banks (note `European banks`, 161)

`1822direkt.de`, `abanca.com`, `abnamro.com`, `abnamro.nl`, `activobank.pt`, `aib.ie`, `alfabank.ru`, `aliorbank.pl`, `alpha.gr`, `argenta.be`, `asnbank.nl`, `bancamarch.es`, `bancamediolanum.it`, `bancatransilvania.ro`, `bancobpi.pt`, `bancobpm.it`, `bancoctt.pt`, `bancosantander.es`, `bancsabadell.com`, `bankaustria.at`, `bankinter.com`, `bankmillennium.pl`, `bankofireland.com`, `bawag.at`, `bbva.com`, `bbva.es`, `bcge.ch`, `bcr.ro`, `bcv.ch`, `belfius.be`, `beobank.be`, `berliner-sparkasse.de`, `bgl.lu`, `bil.com`, `bnl.it`, `bnpparibas.pl`, `bnpparibasfortis.be`, `bper.it`, `bpostbank.be`, `brd.ro`, `caixabank.com`, `caixabank.es`, `cajamar.es`, `cbc.be`, `cgd.pt`, `chebanca.it`, `cler.ch`, `comdirect.de`, `commerzbank.de`, `consorsbank.de`, `credem.it`, `credit-suisse.com`, `crelan.be`, `csas.cz`, `csob.cz`, `danskebank.com`, `danskebank.dk`, `db.com`, `deutsche-bank.de`, `dkb.de`, `dnb.no`, `erstebank.at`, `eurobank.gr`, `evobanco.com`, `finecobank.com`, `fio.cz`, `gazprombank.ru`, `glsbank.de`, `handelsbanken.com`, `handelsbanken.se`, `haspa.de`, `hellobank.be`, `hype.it`, `hypovereinsbank.de`, `ibercaja.es`, `imaginbank.com`, `ing.be`, `ing.de`, `ing.es`, `ing.it`, `ing.nl`, `ing.ro`, `ingbank.pl`, `intesasanpaolo.com`, `juliusbaer.com`, `kb.cz`, `kbc.be`, `keytradebank.be`, `knab.nl`, `kutxabank.es`, `lacaixa.es`, `lombardodier.com`, `mbank.pl`, `migrosbank.ch`, `millenniumbcp.pt`, `moneta.cz`, `monobank.ua`, `montepio.pt`, `mps.it`, `nbg.gr`, `nordea.com`, `nordea.dk`, `nordea.fi`, `nordea.no`, `nordea.se`, `norisbank.de`, `novobanco.pt`, `op.fi`, `openbank.es`, `otpbank.hu`, `pekao.com.pl`, `pictet.com`, `piraeusbank.gr`, `pkobp.pl`, `postbank.de`, `poste.it`, `postfinance.ch`, `privatbank.ua`, `ptsb.ie`, `rabobank.com`, `rabobank.nl`, `raiffeisen.at`, `raiffeisen.ch`, `raiffeisen.lu`, `raiffeisen.ru`, `rbinternational.com`, `regiobank.nl`, `santander.com`, `santander.de`, `santander.pl`, `santander.pt`, `sber.ru`, `sberbank.ru`, `seb.se`, `sebgroup.com`, `snsbank.nl`, `sparda.de`, `sparebank1.no`, `sparkasse.at`, `sparkasse.de`, `spuerkeess.lu`, `sskm.de`, `swedbank.com`, `swedbank.se`, `targobank.de`, `tbank.ru`, `tinkoff.ru`, `triodos.be`, `triodos.nl`, `ubs.com`, `unicajabanco.es`, `unicredit.eu`, `unicredit.it`, `unicreditgroup.eu`, `valiant.ch`, `vdk.be`, `volksbank.de`, `vr.de`, `vtb.ru`, `widiba.it`, `zkb.ch`

### United Kingdom (note `United Kingdom`, 31)

`ajbell.co.uk`, `bankofscotland.co.uk`, `barclaycard.co.uk`, `barclays.co.uk`, `barclays.com`, `capitalone.co.uk`, `chase.co.uk`, `clearpay.co.uk`, `co-operativebank.co.uk`, `coventrybuildingsociety.co.uk`, `firstdirect.com`, `halifax.co.uk`, `hl.co.uk`, `hsbc.co.uk`, `lloydsbank.com`, `lloydsbankinggroup.com`, `mbna.co.uk`, `metrobankonline.co.uk`, `moneyfarm.com`, `nationwide.co.uk`, `natwest.com`, `nutmeg.com`, `rbs.co.uk`, `sainsburysbank.co.uk`, `santander.co.uk`, `tescobank.com`, `tsb.co.uk`, `ulsterbank.co.uk`, `vanguardinvestor.co.uk`, `virginmoney.com`, `ybs.co.uk`

### United States (note `United States`, 47)

`53.com`, `alliantcreditunion.org`, `americanexpress.com`, `bankofamerica.com`, `bankofthewest.com`, `barclaysus.com`, `becu.org`, `bmoharris.com`, `bnymellon.com`, `capitalone.com`, `chase.com`, `cit.com`, `citi.com`, `citibank.com`, `citigroup.com`, `citizensbank.com`, `comerica.com`, `dinersclub.com`, `discover.com`, `eastwestbank.com`, `firstcitizens.com`, `frostbank.com`, `goldmansachs.com`, `huntington.com`, `jpmorgan.com`, `jpmorganchase.com`, `key.com`, `marcus.com`, `morganstanley.com`, `mtb.com`, `navyfederal.org`, `northerntrust.com`, `penfed.org`, `pnc.com`, `regions.com`, `santanderbank.com`, `statestreet.com`, `svb.com`, `synchrony.com`, `synchronybank.com`, `tdbank.com`, `truist.com`, `usaa.com`, `usbank.com`, `valley.com`, `wellsfargo.com`, `zionsbank.com`

### Canada (note `Canada`, 16)

`atb.com`, `bmo.com`, `cibc.com`, `desjardins.com`, `eqbank.ca`, `hsbc.ca`, `laurentianbank.ca`, `nbc.ca`, `questrade.com`, `rbc.com`, `rbcroyalbank.com`, `scotiabank.com`, `simplii.com`, `tangerine.ca`, `td.com`, `tdcanadatrust.com`

### Latin America (note `Latin America`, 18)

`banamex.com`, `bancochile.cl`, `bancoestado.cl`, `bancogalicia.com`, `bancointer.com.br`, `bancolombia.com`, `banorte.com`, `bb.com.br`, `bbva.mx`, `bci.cl`, `bradesco.com.br`, `c6bank.com.br`, `caixa.gov.br`, `interbank.pe`, `itau.com.br`, `santander.com.br`, `santander.com.mx`, `viabcp.com`

### Africa and Middle East (note `Africa and Middle East`, 39)

`absa.co.za`, `accessbankplc.com`, `adcb.com`, `akbank.com`, `alahli.com`, `alrajhibank.com.sa`, `attijariwafabank.com`, `bankfab.com`, `bankhapoalim.co.il`, `bankmuscat.com`, `bankofafrica.ma`, `capitecbank.co.za`, `cihbank.ma`, `denizbank.com`, `discountbank.co.il`, `ecobank.com`, `emiratesnbd.com`, `enpara.com`, `firstbanknigeria.com`, `fnb.co.za`, `garantibbva.com.tr`, `gbp.ma`, `gtbank.com`, `halkbank.com.tr`, `investec.com`, `isbank.com.tr`, `kfh.com`, `leumi.co.il`, `mashreq.com`, `mizrahi-tefahot.co.il`, `nbk.com`, `nedbank.co.za`, `qnb.com`, `standardbank.co.za`, `ubagroup.com`, `vakifbank.com.tr`, `yapikredi.com.tr`, `zenithbank.com`, `ziraatbank.com.tr`

### Asia and Oceania (note `Asia and Oceania`, 70)

`abchina.com`, `anz.co.nz`, `anz.com`, `anz.com.au`, `asb.co.nz`, `axisbank.com`, `bangkokbank.com`, `bankcomm.com`, `bankmandiri.co.id`, `bankofbaroda.in`, `bankofchina.com`, `bankwest.com.au`, `bca.co.id`, `bdo.com.ph`, `bendigobank.com.au`, `bni.co.id`, `bnz.co.nz`, `boc.cn`, `bpi.com.ph`, `bri.co.id`, `canarabank.com`, `cathaybk.com.tw`, `ccb.com`, `cimb.com.my`, `cmbchina.com`, `commbank.com.au`, `ctbcbank.com`, `dbs.com`, `dbs.com.sg`, `hanabank.com`, `hangseng.com`, `hdfcbank.com`, `hsbc.com.hk`, `icbc.com.cn`, `icicibank.com`, `ing.com.au`, `jp-bank.japanpost.jp`, `kakaobank.com`, `kasikornbank.com`, `kbstar.com`, `kiwibank.co.nz`, `kotak.com`, `krungsri.com`, `macquarie.com`, `macquarie.com.au`, `maybank.com`, `maybank2u.com.my`, `metrobank.com.ph`, `mizuho-fg.co.jp`, `mizuhobank.co.jp`, `mufg.jp`, `nab.com.au`, `ocbc.com`, `onlinesbi.com`, `pnbindia.in`, `publicbank.com.my`, `rakuten-bank.co.jp`, `sbisec.co.jp`, `scb.co.th`, `shinhan.com`, `smbc.co.jp`, `stgeorge.com.au`, `suncorp.com.au`, `ubank.com.au`, `unionbankofindia.co.in`, `uob.com.sg`, `westpac.co.nz`, `westpac.com.au`, `wooribank.com`, `yesbank.in`

### International banks (note `International banks`, 3)

`hsbc.com`, `sc.com`, `standardchartered.com`

### Payments and money transfers (note `Payments and money transfers`, 54)

`adyen.com`, `affirm.com`, `afterpay.com`, `alipay.com`, `alma.eu`, `bancontact.com`, `bizum.es`, `cash.app`, `flutterwave.com`, `gcash.com`, `gocardless.com`, `ideal.nl`, `klarna.com`, `lemonway.com`, `mangopay.com`, `mercadopago.com`, `mobilepay.dk`, `mollie.com`, `moneygram.com`, `neteller.com`, `pay.weixin.qq.com`, `payconiq.com`, `paylib.fr`, `payoneer.com`, `paypal.com`, `paypal.fr`, `paypal.me`, `payplug.com`, `paysafecard.com`, `paystack.com`, `paytm.com`, `phonepe.com`, `picpay.com`, `razorpay.com`, `remitly.com`, `revolut.me`, `satispay.com`, `scalapay.com`, `skrill.com`, `squareup.com`, `stripe.com`, `sumup.com`, `sumup.fr`, `swish.nu`, `transferwise.com`, `twint.ch`, `venmo.com`, `vipps.no`, `wave.com`, `westernunion.com`, `westernunion.fr`, `wise.com`, `worldremit.com`, `zellepay.com`

### Brokers and investing (note `Brokers and investing`, 56)

`acorns.com`, `admirals.com`, `ameriprise.com`, `avanza.se`, `avatrade.com`, `betterment.com`, `boursedirect.fr`, `cmcmarkets.com`, `degiro.com`, `degiro.fr`, `edwardjones.com`, `etoro.com`, `etrade.com`, `fidelity.com`, `firstrade.com`, `flatex.de`, `freetrade.io`, `fxcm.com`, `goodvest.fr`, `ibkr.com`, `ig.com`, `interactivebrokers.co.uk`, `interactivebrokers.com`, `linxea.com`, `m1finance.com`, `merrilledge.com`, `nalo.fr`, `nordnet.dk`, `nordnet.fi`, `nordnet.no`, `nordnet.se`, `oanda.com`, `pepperstone.com`, `plus500.com`, `public.com`, `ramify.fr`, `robinhood.com`, `saxo.com`, `saxobank.com`, `scalable.capital`, `schwab.com`, `smartbroker.de`, `stash.com`, `swissquote.ch`, `swissquote.com`, `tastytrade.com`, `tdameritrade.com`, `traderepublic.com`, `trading212.com`, `troweprice.com`, `vanguard.com`, `wealthfront.com`, `webull.com`, `xm.com`, `xtb.com`, `yomoni.fr`

### Cryptocurrencies (note `Cryptocurrencies`, 34)

`binance.com`, `binance.us`, `bitfinex.com`, `bitflyer.com`, `bitget.com`, `bithumb.com`, `bitpanda.com`, `bitstack-app.com`, `bitstamp.net`, `bitvavo.com`, `blockchain.com`, `bybit.com`, `coinbase.com`, `coinhouse.com`, `coinmotion.com`, `crypto.com`, `exodus.com`, `gate.io`, `gemini.com`, `htx.com`, `huobi.com`, `kraken.com`, `kucoin.com`, `ledger.com`, `metamask.io`, `mexc.com`, `okx.com`, `paymium.com`, `phantom.app`, `stackinsat.com`, `trezor.io`, `trustwallet.com`, `upbit.com`, `uphold.com`

### Insurance (note `Insurance`, 45)

`abeille-assurances.fr`, `admiral.com`, `aflac.com`, `allianz.com`, `allianz.de`, `allianz.fr`, `allstate.com`, `amaguiz.com`, `april.fr`, `aviva.co.uk`, `aviva.fr`, `axa.com`, `axa.de`, `axa.fr`, `churchill.com`, `cnp.fr`, `devk.de`, `direct-assurance.fr`, `directline.com`, `ergo.de`, `farmers.com`, `gan.fr`, `geico.com`, `generali.com`, `generali.fr`, `gmf.fr`, `groupama.fr`, `hastingsdirect.com`, `hiscox.fr`, `huk.de`, `lemonade.com`, `libertymutual.com`, `lv.com`, `maaf.fr`, `macif.fr`, `maif.fr`, `matmut.fr`, `metlife.com`, `mma.fr`, `nationwide.com`, `progressive.com`, `prudential.com`, `statefarm.com`, `swisslife.fr`, `travelers.com`

### Credit bureaus (note `Credit bureaus`, 9)

`annualcreditreport.com`, `clearscore.com`, `creditkarma.com`, `equifax.co.uk`, `equifax.com`, `experian.co.uk`, `experian.com`, `myfico.com`, `transunion.com`

### Bank and insurance top-level domains (note `Bank and insurance top-level domains`, 25)

`.americanexpress`, `.amex`, `.axa`, `.bank`, `.barclaycard`, `.barclays`, `.bbva`, `.bnpparibas`, `.bradesco`, `.caixa`, `.capitalone`, `.chase`, `.citi`, `.creditunion`, `.fidelity`, `.hsbc`, `.insurance`, `.itau`, `.lacaixa`, `.natwest`, `.santander`, `.sbi`, `.schwab`, `.ubs`, `.vanguard`

## Personal data (`private`, 192)

Email, accounts, taxes, health, dating: the displayed page belongs to a person. No city, no publishing.

### Email (note `Email`, 37)

`app.tuta.com`, `e.mail.ru`, `email.ionos.fr`, `hotmail.com`, `icloud.com`, `laposte.net`, `live.com`, `mac.com`, `mail.163.com`, `mail.aol.com`, `mail.google.com`, `mail.infomaniak.com`, `mail.orange.fr`, `mail.ovh.net`, `mail.proton.me`, `mail.protonmail.com`, `mail.qq.com`, `mail.tutanota.com`, `mail.yahoo.com`, `mail.yandex.com`, `mail.yandex.ru`, `mail.zoho.com`, `mail.zoho.eu`, `me.com`, `messagerie.orange.fr`, `messagerie.sfr.fr`, `navigator.gmx.net`, `navigator.web.de`, `outlook.cloud.microsoft`, `outlook.com`, `outlook.office.com`, `outlook.office365.com`, `webmail.bbox.fr`, `webmail.free.fr`, `webmail.gandi.net`, `webmail.sfr.fr`, `zimbra.free.fr`

### Messaging (note `Messaging`, 10)

`app.slack.com`, `chat.google.com`, `messages.google.com`, `messenger.com`, `teams.cloud.microsoft`, `teams.microsoft.com`, `voice.google.com`, `web.skype.com`, `web.telegram.org`, `web.whatsapp.com`

### Accounts and sign-in (note `Accounts and sign-in`, 12)

`account.apple.com`, `account.microsoft.com`, `account.proton.me`, `accounts.google.com`, `appleid.apple.com`, `idmsa.apple.com`, `login.aol.com`, `login.microsoft.com`, `login.microsoftonline.com`, `login.yahoo.com`, `myaccount.google.com`, `mysignins.microsoft.com`

### Documents and cloud storage (note `Documents and cloud storage`, 31)

`admin.google.com`, `box.com`, `calendar.google.com`, `calendar.proton.me`, `classroom.google.com`, `contacts.google.com`, `docs.google.com`, `drive.google.com`, `drive.proton.me`, `dropbox.com`, `filemail.com`, `fromsmash.com`, `grosfichiers.com`, `keep.google.com`, `m365.cloud.microsoft`, `mega.io`, `mega.nz`, `one.google.com`, `onedrive.com`, `pay.google.com`, `payments.google.com`, `pcloud.com`, `photos.google.com`, `sendspace.com`, `swisstransfer.com`, `sync.com`, `takeout.google.com`, `transfernow.net`, `tresorit.com`, `we.tl`, `wetransfer.com`

### Password managers (note `Password managers`, 8)

`1password.com`, `bitwarden.com`, `bitwarden.eu`, `dashlane.com`, `keepersecurity.com`, `lastpass.com`, `nordpass.com`, `pass.proton.me`

### Taxes and government (note `Taxes and government`, 27)

`account.gov.uk`, `agenciatributaria.gob.es`, `agenziaentrate.gov.it`, `amendes.gouv.fr`, `antai.gouv.fr`, `ants.gouv.fr`, `demarches-simplifiees.fr`, `elster.de`, `franceconnect.gouv.fr`, `healthcare.gov`, `id.me`, `impots.gouv.fr`, `incometax.gov.in`, `inps.it`, `irs.gov`, `login.gov`, `moncompteformation.gouv.fr`, `my.gov.au`, `myminfin.be`, `net-entreprises.fr`, `payfip.gouv.fr`, `seg-social.gob.es`, `ssa.gov`, `studentaid.gov`, `tax.service.gov.uk`, `uidai.gov.in`, `universal-credit.service.gov.uk`

### Social security, jobs and pensions (note `Social security, jobs and pensions`, 10)

`agirc-arrco.fr`, `ameli.fr`, `caf.fr`, `francetravail.fr`, `info-retraite.fr`, `lassuranceretraite.fr`, `mesdroitssociaux.gouv.fr`, `msa.fr`, `pole-emploi.fr`, `urssaf.fr`

### Health (note `Health`, 14)

`ag2rlamondiale.fr`, `alan.com`, `doctolib.de`, `doctolib.fr`, `doctolib.it`, `harmonie-mutuelle.fr`, `keldoc.com`, `livi.fr`, `maiia.com`, `malakoffhumanis.com`, `medadom.com`, `mgen.fr`, `monespacesante.fr`, `qare.fr`

### School (note `School`, 7)

`ecoledirecte.com`, `educonnect.education.gouv.fr`, `index-education.net`, `messervices.etudiant.gouv.fr`, `monlycee.net`, `parcoursup.fr`, `skolengo.com`

### Telecom customer accounts (note `Telecom customer accounts`, 4)

`adsl.free.fr`, `espace-client.bouyguestelecom.fr`, `espace-client.orange.fr`, `espace-client.sfr.fr`

### Dating (note `Dating`, 32)

`adopte.app`, `adopteunmec.com`, `ashleymadison.com`, `attractiveworld.net`, `badoo.com`, `bumble.com`, `coffeemeetsbagel.com`, `disonsdemain.fr`, `edarling.fr`, `eharmony.com`, `elitesingles.com`, `fruitz.io`, `gleeden.com`, `gotinder.com`, `grindr.com`, `happn.com`, `hinge.co`, `jaumo.com`, `lovoo.com`, `mamba.ru`, `match.com`, `meetic.com`, `meetic.fr`, `okcupid.com`, `parship.com`, `parship.fr`, `plentyoffish.com`, `pof.com`, `romeo.com`, `scruff.com`, `tinder.com`, `zoosk.com`

## Gambling (`gambling`, 107)

Betting, casinos, lotteries: restricted to adults, like adult sites.

### Betting and poker in France (note `Betting and poker in France`, 16)

`barrierebet.fr`, `betclic.fr`, `bwin.fr`, `fdj.fr`, `feelingbet.fr`, `france-pari.fr`, `genybet.fr`, `netbet.fr`, `olybet.fr`, `partypoker.fr`, `pmu.fr`, `pokerstars.fr`, `unibet.fr`, `vbet.fr`, `winamax.fr`, `zebet.fr`

### Betting and poker worldwide (note `Betting and poker worldwide`, 56)

`188bet.com`, `1xbet.com`, `888.com`, `888casino.com`, `888poker.com`, `888sport.com`, `bet-at-home.com`, `bet365.com`, `bet9ja.com`, `betano.com`, `betclic.com`, `betfair.com`, `betfred.com`, `betika.com`, `betmgm.com`, `betonline.ag`, `betrivers.com`, `betsson.com`, `betvictor.com`, `betway.com`, `bovada.lv`, `boylesports.com`, `bwin.com`, `codere.es`, `coral.co.uk`, `dafabet.com`, `draftkings.com`, `fanduel.com`, `fun88.com`, `ggpoker.com`, `interwetten.com`, `ladbrokes.com`, `lottomatica.it`, `m88.com`, `melbet.com`, `mostbet.com`, `mybookie.ag`, `paddypower.com`, `parimatch.com`, `partypoker.com`, `pinnacle.com`, `pointsbet.com`, `pokerstars.com`, `pokerstars.eu`, `sbobet.com`, `sisal.it`, `skybet.com`, `snai.it`, `sportingbet.com`, `sportybet.com`, `tipico.com`, `tipico.de`, `unibet.com`, `w88.com`, `williamhill.com`, `winamax.es`

### Online casinos (note `Online casinos`, 21)

`bc.game`, `bitstarz.com`, `casino.com`, `casumo.com`, `chumbacasino.com`, `duelbits.com`, `gamdom.com`, `jackpotcity.com`, `leovegas.com`, `mrgreen.com`, `partycasino.com`, `rollbit.com`, `roobet.com`, `royalpanda.com`, `shuffle.com`, `slotomania.com`, `spincasino.com`, `stake.com`, `stake.us`, `vbet.com`, `wildz.com`

### Lotteries (note `Lotteries`, 9)

`loteriasyapuestas.es`, `loterie-nationale.be`, `loterie-romande.ch`, `lottery.com`, `lotto.de`, `lotto24.de`, `lottoland.com`, `national-lottery.co.uk`, `thelotter.com`

### Gambling top-level domains (note `Gambling top-level domains`, 5)

`.bet`, `.bingo`, `.casino`, `.lotto`, `.poker`

## Dangerous sites (`danger`, 94)

Tracking, spyware, pirated downloads: DOMCity does not show them and sends nobody there.

### IP loggers (note `IP loggers`, 46)

`02ip.ru`, `2no.co`, `blasze.com`, `blasze.tk`, `bmwforum.co`, `catsnthing.com`, `catsnthings.fun`, `crabrave.pw`, `curiouscat.club`, `datasig.io`, `datauth.io`, `dateing.club`, `ezstat.ru`, `fortnight.space`, `fortnitechat.site`, `freegiftcards.co`, `gaming-at-my.best`, `gamingfun.me`, `grabify.link`, `headshot.monster`, `imageshare.best`, `ipgrabber.ru`, `ipgraber.ru`, `iplis.ru`, `iplogger.co`, `iplogger.com`, `iplogger.info`, `iplogger.org`, `iplogger.ru`, `joinmy.site`, `leancoding.co`, `lovebird.guru`, `mypic.icu`, `otherhalf.life`, `progaming.monster`, `ps3cfw.com`, `quickmessage.us`, `screenshare.host`, `screenshot.best`, `shrekis.life`, `spottyfly.com`, `stopify.co`, `trulove.guru`, `yip.su`, `yourmy.monster`, `youshouldclick.us`

### Spyware (note `Spyware`, 24)

`clevguard.com`, `cocospy.com`, `copy9.com`, `eyezy.com`, `flexispy.com`, `guestspy.com`, `highstermobile.com`, `hoverwatch.com`, `ikeymonitor.com`, `minspy.com`, `mobistealth.com`, `mspy.com`, `mspy.fr`, `phonespector.com`, `retina-x.com`, `spyera.com`, `spyfone.com`, `spyhuman.com`, `spyic.com`, `spyine.com`, `spyzie.com`, `thetruthspy.com`, `umobix.com`, `xnspy.com`

### Piracy downloads (note `Piracy downloads`, 24)

`1337x.to`, `apunkagames.com`, `crackingpatching.com`, `crackstreams.biz`, `eztv.re`, `fitgirl-repacks.site`, `getintopc.com`, `igetintopc.com`, `igg-games.com`, `kickasstorrents.to`, `limetorrents.info`, `nyaa.si`, `oceanofapk.com`, `oceanofgames.com`, `ova-games.com`, `rarbg.to`, `rutracker.org`, `skidrowreloaded.com`, `steamunlocked.net`, `thepiratebay.org`, `torlock.com`, `torrentgalaxy.to`, `yggtorrent.top`, `yts.mx`

## What is not on the list

- Mixed sites (Reddit, X, Tumblr, Discord, general-purpose image hosts): they would be refused for
  everything legitimate they have. Reporting remains the remedy.
- Phishing and scam sites: they change address every day, a hand-maintained list would always
  lag behind.
- Hate or extremist sites: to be added case by case if needed (`danger` category).
- Very large public lists (the one from Université Toulouse 1 Capitole has millions of domains for
  adult sites alone): too heavy for Supabase's free database and for the browser.
