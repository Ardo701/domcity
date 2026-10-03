-- =============================================================================
-- DOMCity: the megalopolis (step 4)
--
--   known_sites  among some domains, those that have cities on DOMCity:
--                a megalopolis airport offers to go and see the linked sites.
--
-- Public (read only), like site_city.
-- =============================================================================

create function public.known_sites(p_domains text[])
returns table (
  domain      text,
  pages_count integer
)
language sql
stable
set search_path = ''
as $$
  select s.domain, s.pages_count
    from public.sites s
   where s.domain = any (p_domains[1:60])
     and s.pages_count > 0
   order by s.domain
$$;

grant execute on function public.known_sites(text[]) to anon, authenticated, service_role;
