-- =============================================================================
-- DOMCity : la mégalopole (étape 4)
--
--   known_sites  parmi des domaines, ceux qui ont des villes sur DOMCity :
--                l'aéroport d'une mégalopole propose d'aller voir les sites liés.
--
-- Publique (lecture seule), comme site_city.
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
