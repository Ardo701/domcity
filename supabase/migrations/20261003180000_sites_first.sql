-- =============================================================================
-- DOMCity: sites first
--
-- Search and the gallery show sites (amazon.com, fr.wikipedia.org),
-- no longer cities one by one; a site's page lists its pages.
--
--   search_sites    the search, one result per site; the pages whose title
--                   matches are listed under their site, with their latest version
--   recent_sites    the most recently updated sites, with their thumbnail
--   site_page_list  a site's pages, in chunks, with their latest version
--
-- They replace search_cities and recent_captures, which are removed.
-- Public (read only), like site_city.
-- =============================================================================

drop function public.search_cities(text, integer);
drop function public.recent_captures(integer);

-- Search by domain ("amzon") or by page title ("croissant"), typo-tolerant.
-- A site matches by its domain or by one of its pages; it takes the best score of the two.
create function public.search_sites(p_query text, p_limit integer default 12)
returns table (
  domain          text,
  pages_count     integer,
  last_capture_at timestamptz,
  score           real,
  pages           jsonb,    -- [{ path, title, slug }]: the 3 best-matching pages
  pages_matched   integer   -- all the pages of the site that match
)
language sql
stable
set search_path = ''
-- 0.6 by default: too strict for "amzon" (score 0.44 against amazon.com)
set pg_trgm.word_similarity_threshold = 0.4
as $$
  with q as (
    select lower(trim(p_query)) as v
     where length(trim(p_query)) >= 2
  ),
  site_hits as (
    select s.id as site_id,
           greatest(
             extensions.word_similarity(q.v, s.domain),
             case when s.domain like q.v || '%' then 1.0 else 0 end
           )::real as score
      from public.sites s, q
     where s.pages_count > 0
       and (s.domain ilike '%' || q.v || '%' or q.v operator(extensions.<%) s.domain)
  ),
  page_hits as (
    select p.site_id, p.id as page_id, p.path, p.title, p.last_capture_at,
           greatest(
             extensions.word_similarity(q.v, lower(p.title)),
             case when lower(p.title) like q.v || '%' then 1.0 else 0 end
           )::real as score
      from public.pages p, q
     where p.captures_count > 0
       and (p.title ilike '%' || q.v || '%' or q.v operator(extensions.<%) p.title)
  ),
  scored as (
    select x.site_id, max(x.score) as score
      from (
        select site_id, score from site_hits
        union all
        select site_id, score from page_hits
      ) x
     group by x.site_id
  )
  select s.domain, s.pages_count, s.last_capture_at, sc.score,
         coalesce(best.pages, '[]'::jsonb),
         (select count(*)::integer from page_hits ph where ph.site_id = s.id)
    from scored sc
    join public.sites s on s.id = sc.site_id
    left join lateral (
      select jsonb_agg(
               jsonb_build_object('path', top.path, 'title', top.title, 'slug', top.slug)
               order by top.score desc, top.last_capture_at desc nulls last
             ) as pages
        from (
          select ph.path, ph.title, ph.score, ph.last_capture_at,
                 (select c.slug
                    from public.captures c
                   where c.page_id = ph.page_id and c.status = 'visible'
                   order by c.captured_at desc
                   limit 1) as slug
            from page_hits ph
           where ph.site_id = s.id
           order by ph.score desc, ph.last_capture_at desc nulls last
           limit 3
        ) top
    ) best on true
   order by sc.score desc, s.last_capture_at desc nulls last
   limit least(greatest(p_limit, 1), 50)
$$;

-- The gallery: the most recently updated sites.
-- Their thumbnail is that of their home page when it is captured,
-- otherwise that of their most recently captured page (a version that has one, if possible).
create function public.recent_sites(p_limit integer default 24, p_offset integer default 0)
returns table (
  domain          text,
  pages_count     integer,
  captures_count  integer,
  last_capture_at timestamptz,
  views_count     bigint,
  cover_slug      text,
  cover_stats     jsonb
)
language sql
stable
set search_path = ''
as $$
  select s.domain, s.pages_count, s.captures_count, s.last_capture_at, s.views_count,
         cover.slug, cover.stats
    from public.sites s
    cross join lateral (
      select c.slug, c.stats
        from public.pages p
        join public.captures c on c.page_id = p.id
       where p.site_id = s.id
         and c.status = 'visible'
       order by (c.stats ->> 'thumbnail') is distinct from 'false' desc,
                p.path = '/' desc,
                c.captured_at desc
       limit 1
    ) cover
   where s.pages_count > 0
   order by s.last_capture_at desc nulls last, s.domain
   limit least(greatest(p_limit, 1), 60)
  offset greatest(p_offset, 0)
$$;

-- A site's pages, in address order, with their latest visible version.
-- In chunks: a site like fr.wikipedia.org can have thousands.
create function public.site_page_list(p_domain text, p_limit integer default 60, p_offset integer default 0)
returns table (
  path            text,
  title           text,
  captures_count  integer,
  last_capture_at timestamptz,
  latest_slug     text,
  latest_stats    jsonb
)
language sql
stable
set search_path = ''
as $$
  select p.path, p.title, p.captures_count, p.last_capture_at, latest.slug, latest.stats
    from public.sites s
    join public.pages p on p.site_id = s.id
    cross join lateral (
      select c.slug, c.stats
        from public.captures c
       where c.page_id = p.id and c.status = 'visible'
       order by c.captured_at desc
       limit 1
    ) latest
   where s.domain = p_domain
     and p.captures_count > 0
   order by p.path
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0)
$$;

grant execute on function
  public.search_sites(text, integer),
  public.recent_sites(integer, integer),
  public.site_page_list(text, integer, integer)
  to anon, authenticated, service_role;
