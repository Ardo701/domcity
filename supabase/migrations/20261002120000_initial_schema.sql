-- =============================================================================
-- DOMCity : schéma initial
--
--   sites     amazon.com                       (domaine normalisé, sans www.)
--   └ pages   amazon.com/livres                (chemin normalisé, sans ?query ni #ancre)
--     └ captures  une version datée de la page (le JSON de la ville est dans R2)
--
-- Sécurité :
--   - Lecture publique (anon) : sites, pages, versions visibles, fonctions de lecture.
--   - Toutes les écritures passent par l'API du site (clé service_role) :
--     create_capture, publish_capture, delete_capture, report_capture, hit_rate_limit.
--   - Le lien secret de suppression n'est jamais stocké en clair (sha256 uniquement).
--
-- Fichier R2 d'une version : c/<slug>.json.gz
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;


-- -----------------------------------------------------------------------------
-- Identifiant court pour les liens de partage (8 caractères, ex. "Xk3-q_9A")
-- -----------------------------------------------------------------------------
create function public.new_slug()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(6), 'base64'), '+/', '-_')
$$;


-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.sites (
  id              bigint generated always as identity primary key,
  domain          text not null unique
                  check (domain = lower(domain)
                         and domain !~ '^www\.'
                         and length(domain) between 3 and 253),
  created_at      timestamptz not null default now(),
  -- compteurs tenus à jour par trigger (versions visibles uniquement)
  pages_count     integer not null default 0,
  captures_count  integer not null default 0,
  last_capture_at timestamptz,
  views_count     bigint not null default 0
);

create table public.pages (
  id              bigint generated always as identity primary key,
  site_id         bigint not null references public.sites (id) on delete cascade,
  path            text not null check (path like '/%' and length(path) <= 1024),
  created_at      timestamptz not null default now(),
  -- recopiés depuis la dernière version visible, par trigger
  title           text,
  captures_count  integer not null default 0,
  last_capture_at timestamptz,
  unique (site_id, path)
);

create table public.captures (
  id             bigint generated always as identity primary key,
  slug           text not null unique default public.new_slug(),
  page_id        bigint not null references public.pages (id) on delete cascade,
  captured_at    timestamptz not null default now(),
  source         text not null check (source in ('wikipedia', 'bookmarklet')),
  format_version smallint not null default 1,
  title          text check (length(title) <= 300),
  size_bytes     integer not null check (size_bytes between 1 and 2097152),  -- .json.gz, 2 Mo max
  stats          jsonb not null default '{}'::jsonb,  -- {"buildings":840,"images":35,"trackers":4,...}
  -- pending : ligne créée, fichier pas encore envoyé dans R2
  -- visible : publiée
  -- hidden  : masquée (signalements ou modération)
  status         text not null default 'pending' check (status in ('pending', 'visible', 'hidden')),
  reports_count  integer not null default 0,
  views_count    bigint not null default 0
);

-- Le hash du lien secret vit à part : aucune policy, donc illisible côté public.
create table public.capture_secrets (
  capture_id        bigint primary key references public.captures (id) on delete cascade,
  delete_token_hash bytea not null
);

create table public.reports (
  id         bigint generated always as identity primary key,
  capture_id bigint not null references public.captures (id) on delete cascade,
  reason     text not null check (reason in ('offensive', 'spam', 'privacy', 'other')),
  details    text check (length(details) <= 500),
  reporter   bytea not null,  -- hash de l'IP : un seul signalement par personne et par version
  created_at timestamptz not null default now(),
  unique (capture_id, reporter)
);

create table public.rate_events (
  id         bigint generated always as identity primary key,
  actor      bytea not null,  -- hash de l'IP
  action     text not null,   -- 'share', 'report', 'delete'…
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------
-- Dernière version visible de chaque page (mégalopole, machine à remonter le temps)
create index captures_page_latest_idx on public.captures (page_id, captured_at desc)
  where status = 'visible';
-- Galerie « dernières villes »
create index captures_recent_idx on public.captures (captured_at desc)
  where status = 'visible';
create index sites_last_capture_idx on public.sites (last_capture_at desc nulls last);
create index sites_views_idx on public.sites (views_count desc);
-- Recherche tolérante aux fautes (« amzon » → amazon.com)
create index sites_domain_trgm_idx on public.sites using gin (domain extensions.gin_trgm_ops);
create index pages_title_trgm_idx on public.pages using gin (title extensions.gin_trgm_ops);
create index reports_capture_idx on public.reports (capture_id);
create index rate_events_lookup_idx on public.rate_events (actor, action, created_at desc);
create index rate_events_created_idx on public.rate_events (created_at);


-- -----------------------------------------------------------------------------
-- Compteurs des pages et des sites (ne comptent que les versions visibles)
-- -----------------------------------------------------------------------------
create function public.refresh_counters()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_page bigint;
  v_site bigint;
begin
  if tg_op = 'DELETE' then
    v_page := old.page_id;
  else
    v_page := new.page_id;
  end if;

  update public.pages p
     set captures_count  = x.n,
         last_capture_at = x.last_at,
         title           = x.last_title
    from (
      select count(*)::integer as n,
             max(c.captured_at) as last_at,
             (select c2.title
                from public.captures c2
               where c2.page_id = v_page and c2.status = 'visible'
               order by c2.captured_at desc
               limit 1) as last_title
        from public.captures c
       where c.page_id = v_page and c.status = 'visible'
    ) x
   where p.id = v_page
  returning p.site_id into v_site;

  -- page supprimée en cascade : rien à recompter
  if v_site is not null then
    update public.sites s
       set pages_count     = x.pages,
           captures_count  = x.caps,
           last_capture_at = x.last_at
      from (
        select (count(*) filter (where p.captures_count > 0))::integer as pages,
               coalesce(sum(p.captures_count), 0)::integer as caps,
               max(p.last_capture_at) as last_at
          from public.pages p
         where p.site_id = v_site
      ) x
     where s.id = v_site;
  end if;

  return null;
end;
$$;

create trigger captures_refresh_counters
  after insert or delete or update of status on public.captures
  for each row execute function public.refresh_counters();


-- -----------------------------------------------------------------------------
-- Signalements : 3 signalements masquent la version.
-- La page retombe alors automatiquement sur sa version visible précédente.
-- -----------------------------------------------------------------------------
create function public.on_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.captures
     set reports_count = reports_count + 1,
         status = case
                    when reports_count + 1 >= 3 and status = 'visible' then 'hidden'
                    else status
                  end
   where id = new.capture_id;
  return null;
end;
$$;

create trigger reports_on_insert
  after insert on public.reports
  for each row execute function public.on_report();


-- -----------------------------------------------------------------------------
-- Écriture (API uniquement, clé service_role)
-- -----------------------------------------------------------------------------

-- Crée le site et la page si besoin, puis une version « pending ».
-- L'API envoie ensuite le fichier dans R2 sous c/<slug>.json.gz, puis appelle publish_capture.
create function public.create_capture(
  p_domain            text,
  p_path              text,
  p_source            text,
  p_title             text,
  p_size_bytes        integer,
  p_stats             jsonb,
  p_delete_token_hash bytea,
  p_format_version    smallint default 1
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_site    bigint;
  v_page    bigint;
  v_capture bigint;
  v_slug    text;
begin
  insert into public.sites (domain) values (p_domain)
    on conflict (domain) do nothing;
  select s.id into v_site from public.sites s where s.domain = p_domain;

  insert into public.pages (site_id, path) values (v_site, p_path)
    on conflict (site_id, path) do nothing;
  select p.id into v_page from public.pages p where p.site_id = v_site and p.path = p_path;

  insert into public.captures (page_id, source, title, size_bytes, stats, format_version)
  values (v_page, p_source, p_title, p_size_bytes, coalesce(p_stats, '{}'::jsonb), p_format_version)
  returning id, slug into v_capture, v_slug;

  insert into public.capture_secrets (capture_id, delete_token_hash)
  values (v_capture, p_delete_token_hash);

  return v_slug;
end;
$$;

-- Le fichier est bien dans R2 : la version devient visible.
create function public.publish_capture(p_slug text)
returns boolean
language sql
set search_path = ''
as $$
  with updated as (
    update public.captures
       set status = 'visible'
     where slug = p_slug and status = 'pending'
    returning 1
  )
  select exists (select 1 from updated)
$$;

-- Vérifie le lien secret et supprime la version (l'API supprime ensuite le fichier R2).
create function public.delete_capture(p_slug text, p_delete_token_hash bytea)
returns boolean
language sql
set search_path = ''
as $$
  with deleted as (
    delete from public.captures c
     using public.capture_secrets cs
     where cs.capture_id = c.id
       and c.slug = p_slug
       and cs.delete_token_hash = p_delete_token_hash
    returning 1
  )
  select exists (select 1 from deleted)
$$;

-- Signale une version. Renvoie false si cette personne l'a déjà signalée.
create function public.report_capture(
  p_slug     text,
  p_reason   text,
  p_details  text,
  p_reporter bytea
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_capture bigint;
begin
  select c.id into v_capture from public.captures c where c.slug = p_slug;
  if v_capture is null then
    return false;
  end if;

  insert into public.reports (capture_id, reason, details, reporter)
  values (v_capture, p_reason, p_details, p_reporter)
  on conflict (capture_id, reporter) do nothing;

  return found;
end;
$$;

-- Limite d'envois : renvoie true si la limite est atteinte (et n'enregistre rien).
-- Ex. : hit_rate_limit(hash_ip, 'share', 10, '1 hour')
create function public.hit_rate_limit(
  p_actor  bytea,
  p_action text,
  p_max    integer,
  p_window interval
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  -- ménage de temps en temps
  if random() < 0.01 then
    delete from public.rate_events where created_at < now() - interval '1 day';
  end if;

  select count(*) into v_count
    from public.rate_events e
   where e.actor = p_actor
     and e.action = p_action
     and e.created_at > now() - p_window;

  if v_count >= p_max then
    return true;
  end if;

  insert into public.rate_events (actor, action) values (p_actor, p_action);
  return false;
end;
$$;


-- -----------------------------------------------------------------------------
-- Lecture (publique)
-- -----------------------------------------------------------------------------

-- La mégalopole : dernière version visible de chaque page d'un site.
-- Avec p_as_of, c'est la machine à remonter le temps (dernière version avant cette date).
create function public.site_city(
  p_domain text,
  p_as_of  timestamptz default now()
)
returns table (
  path           text,
  title          text,
  slug           text,
  captured_at    timestamptz,
  source         text,
  format_version smallint,
  size_bytes     integer,
  stats          jsonb
)
language sql
stable
set search_path = ''
as $$
  select t.*
    from (
      select distinct on (p.id)
             p.path, c.title, c.slug, c.captured_at, c.source,
             c.format_version, c.size_bytes, c.stats
        from public.sites s
        join public.pages p on p.site_id = s.id
        join public.captures c on c.page_id = p.id
       where s.domain = p_domain
         and c.status = 'visible'
         and c.captured_at <= p_as_of
       order by p.id, c.captured_at desc
    ) t
   order by t.path
$$;

-- Historique d'une page : toutes ses versions visibles, de la plus récente à la plus ancienne.
create function public.page_versions(p_domain text, p_path text)
returns table (
  slug           text,
  title          text,
  captured_at    timestamptz,
  source         text,
  format_version smallint,
  size_bytes     integer,
  stats          jsonb
)
language sql
stable
set search_path = ''
as $$
  select c.slug, c.title, c.captured_at, c.source, c.format_version, c.size_bytes, c.stats
    from public.sites s
    join public.pages p on p.site_id = s.id
    join public.captures c on c.page_id = p.id
   where s.domain = p_domain
     and p.path = p_path
     and c.status = 'visible'
   order by c.captured_at desc
$$;

-- Recherche par domaine (« amazon ») ou par titre de page (« croissant »), tolérante aux fautes.
create function public.search_cities(p_query text, p_limit integer default 20)
returns table (
  kind            text,         -- 'site' ou 'page'
  domain          text,
  path            text,         -- null pour un site
  title           text,
  last_capture_at timestamptz,
  score           real
)
language sql
stable
set search_path = ''
-- 0.6 par défaut : trop strict pour « amzon » (score 0.44 avec amazon.com)
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with q as (
    select lower(trim(p_query)) as v
  ),
  matches as (
    select 'site'::text as kind, s.domain, null::text as path, null::text as title,
           s.last_capture_at,
           greatest(
             extensions.word_similarity(q.v, s.domain),
             case when s.domain like q.v || '%' then 1.0 else 0 end
           )::real as score
      from public.sites s, q
     where s.pages_count > 0
       and (s.domain ilike '%' || q.v || '%' or q.v operator(extensions.<%) s.domain)
    union all
    select 'page', s.domain, p.path, p.title, p.last_capture_at,
           extensions.word_similarity(q.v, lower(p.title))::real
      from public.pages p
      join public.sites s on s.id = p.site_id, q
     where p.captures_count > 0
       and (p.title ilike '%' || q.v || '%' or q.v operator(extensions.<%) p.title)
  )
  select m.kind, m.domain, m.path, m.title, m.last_capture_at, m.score
    from matches m
   where length((select v from q)) >= 2
   order by m.score desc, m.last_capture_at desc nulls last
   limit least(greatest(p_limit, 1), 50)
$$;

-- Compte une vue (sur la version et sur son site).
create function public.record_view(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_page bigint;
begin
  update public.captures
     set views_count = views_count + 1
   where slug = p_slug and status = 'visible'
  returning page_id into v_page;

  if v_page is not null then
    update public.sites s
       set views_count = s.views_count + 1
      from public.pages p
     where p.id = v_page and s.id = p.site_id;
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- Droits et RLS
-- -----------------------------------------------------------------------------
alter table public.sites           enable row level security;
alter table public.pages           enable row level security;
alter table public.captures        enable row level security;
alter table public.capture_secrets enable row level security;
alter table public.reports         enable row level security;
alter table public.rate_events     enable row level security;

create policy "Sites lisibles par tous"
  on public.sites for select to anon, authenticated using (true);
create policy "Pages lisibles par tous"
  on public.pages for select to anon, authenticated using (true);
create policy "Versions visibles lisibles par tous"
  on public.captures for select to anon, authenticated using (status = 'visible');
-- capture_secrets, reports, rate_events : aucune policy → réservées à service_role.

-- Pas d'écriture directe depuis le navigateur, même si une policy était ajoutée par erreur.
revoke insert, update, delete, truncate
  on public.sites, public.pages, public.captures,
     public.capture_secrets, public.reports, public.rate_events
  from anon, authenticated;
revoke select on public.capture_secrets, public.reports, public.rate_events
  from anon, authenticated;

-- Fonctions réservées à l'API
revoke execute on function
  public.new_slug(),
  public.refresh_counters(),
  public.on_report(),
  public.create_capture(text, text, text, text, integer, jsonb, bytea, smallint),
  public.publish_capture(text),
  public.delete_capture(text, bytea),
  public.report_capture(text, text, text, bytea),
  public.hit_rate_limit(bytea, text, integer, interval)
  from public, anon, authenticated;

grant execute on function
  public.new_slug(),
  public.create_capture(text, text, text, text, integer, jsonb, bytea, smallint),
  public.publish_capture(text),
  public.delete_capture(text, bytea),
  public.report_capture(text, text, text, bytea),
  public.hit_rate_limit(bytea, text, integer, interval)
  to service_role;

-- Fonctions publiques
grant execute on function
  public.site_city(text, timestamptz),
  public.page_versions(text, text),
  public.search_cities(text, integer),
  public.record_view(text)
  to anon, authenticated, service_role;
