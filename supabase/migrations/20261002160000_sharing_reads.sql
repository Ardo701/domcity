-- =============================================================================
-- DOMCity: reads for sharing (step 2)
--
--   get_capture      a shared version, with its site and page
--   recent_captures  the gallery of the latest cities
--   get_site         a site's summary
--   site_pages       a site's pages, with their latest version
--
-- All public (read only), like site_city and page_versions.
-- =============================================================================

create function public.get_capture(p_slug text)
returns table (
  slug           text,
  title          text,
  captured_at    timestamptz,
  source         text,
  format_version smallint,
  size_bytes     integer,
  stats          jsonb,
  views_count    bigint,
  domain         text,
  path           text,
  page_title     text,
  page_versions  integer
)
language sql
stable
set search_path = ''
as $$
  select c.slug, c.title, c.captured_at, c.source, c.format_version, c.size_bytes, c.stats,
         c.views_count, s.domain, p.path, p.title, p.captures_count
    from public.captures c
    join public.pages p on p.id = c.page_id
    join public.sites s on s.id = p.site_id
   where c.slug = p_slug
     and c.status = 'visible'
$$;

create function public.recent_captures(p_limit integer default 24)
returns table (
  slug        text,
  title       text,
  captured_at timestamptz,
  source      text,
  stats       jsonb,
  views_count bigint,
  domain      text,
  path        text
)
language sql
stable
set search_path = ''
as $$
  select c.slug, c.title, c.captured_at, c.source, c.stats, c.views_count, s.domain, p.path
    from public.captures c
    join public.pages p on p.id = c.page_id
    join public.sites s on s.id = p.site_id
   where c.status = 'visible'
   order by c.captured_at desc
   limit least(greatest(p_limit, 1), 60)
$$;

create function public.get_site(p_domain text)
returns table (
  domain          text,
  pages_count     integer,
  captures_count  integer,
  last_capture_at timestamptz,
  views_count     bigint
)
language sql
stable
set search_path = ''
as $$
  select s.domain, s.pages_count, s.captures_count, s.last_capture_at, s.views_count
    from public.sites s
   where s.domain = p_domain
     and s.pages_count > 0
$$;

create function public.site_pages(p_domain text)
returns table (
  path            text,
  title           text,
  captures_count  integer,
  last_capture_at timestamptz,
  latest_slug     text
)
language sql
stable
set search_path = ''
as $$
  select p.path, p.title, p.captures_count, p.last_capture_at,
         (select c.slug
            from public.captures c
           where c.page_id = p.id and c.status = 'visible'
           order by c.captured_at desc
           limit 1)
    from public.pages p
    join public.sites s on s.id = p.site_id
   where s.domain = p_domain
     and p.captures_count > 0
   order by p.path
$$;

grant execute on function
  public.get_capture(text),
  public.recent_captures(integer),
  public.get_site(text),
  public.site_pages(text)
  to anon, authenticated, service_role;
