-- =============================================================================
-- DOMCity : vérifier la base après les migrations
--
-- À coller dans le SQL Editor de Supabase (rôle postgres), puis Run.
-- Chaque ligne du résultat doit dire « ok ». Ce n'est pas une migration : on peut
-- le relancer autant de fois qu'on veut.
--
-- 1. La structure : extensions, tables, sécurité, fonctions, droits des visiteurs.
-- 2. Un partage d'essai sur verification.domcity.invalid, de bout en bout
--    (créer, publier, chercher, visiter, signaler, supprimer), effacé à la fin.
--    Si une étape plante, tout est annulé : rien ne reste dans la base.
-- =============================================================================

create or replace function pg_temp.domcity_verification()
returns table (etape text, statut text, detail text)
language plpgsql
as $$
declare
  v_domain  constant text := 'verification.domcity.invalid';
  v_tables  constant text[] := array['sites', 'pages', 'captures', 'capture_secrets', 'reports', 'rate_events'];
  v_funcs   constant text[] := array[
    'new_slug', 'refresh_counters', 'on_report', 'create_capture', 'publish_capture', 'delete_capture',
    'report_capture', 'hit_rate_limit', 'site_city', 'page_versions', 'record_view', 'get_capture',
    'get_site', 'site_pages', 'known_sites', 'search_sites', 'recent_sites', 'site_page_list'];
  v_writes  constant text[] := array[
    'public.create_capture(text, text, text, text, integer, jsonb, bytea, smallint)',
    'public.publish_capture(text)',
    'public.delete_capture(text, bytea)',
    'public.report_capture(text, text, text, bytea)',
    'public.hit_rate_limit(bytea, text, integer, interval)'];
  v_reads   constant text[] := array[
    'public.site_city(text, timestamptz)',
    'public.page_versions(text, text)',
    'public.record_view(text)',
    'public.get_capture(text)',
    'public.get_site(text)',
    'public.site_pages(text)',
    'public.known_sites(text[])',
    'public.search_sites(text, integer)',
    'public.recent_sites(integer, integer)',
    'public.site_page_list(text, integer, integer)'];
  v_token   constant bytea := extensions.digest('jeton-de-verification', 'sha256');
  v_missing text;
  v_slug    text;
  v_n       integer;
  v_ok      boolean;
begin
  -- Un essai précédent interrompu ne doit pas fausser celui-ci.
  delete from public.sites where domain in (v_domain, 'pirate.domcity.invalid');
  delete from public.rate_events where action = 'verification-domcity';

  -- 1. Structure ---------------------------------------------------------------

  etape := 'Extensions pg_trgm et pgcrypto';
  select string_agg(e, ', ') into v_missing
    from unnest(array['pg_trgm', 'pgcrypto']) e
   where not exists (select 1 from pg_extension x where x.extname = e);
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('manquante : ' || v_missing, '');
  return next;

  etape := 'Les 6 tables';
  select string_agg(t, ', ') into v_missing
    from unnest(v_tables) t
   where to_regclass('public.' || t) is null;
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('manquante : ' || v_missing, '');
  return next;

  etape := 'Sécurité des lignes (RLS) sur chaque table';
  select string_agg(c.relname, ', ') into v_missing
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relname = any (v_tables)
     and not c.relrowsecurity;
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('désactivée sur : ' || v_missing, '');
  return next;

  etape := 'Les 18 fonctions';
  select string_agg(f, ', ') into v_missing
    from unnest(v_funcs) f
   where not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f);
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('manquante : ' || v_missing, '');
  return next;

  etape := 'Anciennes fonctions retirées';
  select string_agg(p.proname, ', ') into v_missing
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('search_cities', 'recent_captures');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('encore là : ' || v_missing, '');
  return next;

  etape := 'Visiteurs : aucune écriture dans les tables';
  select string_agg(t, ', ') into v_missing
    from unnest(v_tables) t
   where has_table_privilege('anon', 'public.' || t, 'insert')
      or has_table_privilege('anon', 'public.' || t, 'update')
      or has_table_privilege('anon', 'public.' || t, 'delete');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('modifiable par anon : ' || v_missing, '');
  return next;

  etape := 'Visiteurs : secrets, signalements, limites illisibles';
  select string_agg(t, ', ') into v_missing
    from unnest(array['capture_secrets', 'reports', 'rate_events']) t
   where has_table_privilege('anon', 'public.' || t, 'select');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('lisible par anon : ' || v_missing, '');
  return next;

  etape := 'Visiteurs : pas de fonction d''écriture';
  select string_agg(f, ', ') into v_missing
    from unnest(v_writes) f
   where has_function_privilege('anon', f, 'execute');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('permise à anon : ' || v_missing, '');
  return next;

  etape := 'Visiteurs : les fonctions de lecture';
  select string_agg(f, ', ') into v_missing
    from unnest(v_reads) f
   where not has_function_privilege('anon', f, 'execute');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('refusée à anon : ' || v_missing, '');
  return next;

  etape := 'L''API (service_role) : les fonctions d''écriture';
  select string_agg(f, ', ') into v_missing
    from unnest(v_writes) f
   where not has_function_privilege('service_role', f, 'execute');
  statut := case when v_missing is null then 'ok' else 'ÉCHEC' end;
  detail := coalesce('refusée : ' || v_missing, '');
  return next;

  -- Ce que le navigateur d'un visiteur ferait vraiment, avec le rôle anon.
  etape := 'Visiteurs : une écriture directe est refusée';
  begin
    set local role anon;
    insert into public.sites (domain) values ('pirate.domcity.invalid');
    reset role;
    statut := 'ÉCHEC';
    detail := 'anon a pu ajouter un site';
  exception when insufficient_privilege then
    statut := 'ok';
    detail := '';
  end;
  return next;

  -- 2. Un partage d'essai -------------------------------------------------------

  etape := 'Partage : créer une version';
  v_slug := public.create_capture(v_domain, '/essai', 'bookmarklet', 'Page de vérification DOMCity', 1000,
                                  '{"thumbnail": false}'::jsonb, v_token, 1::smallint);
  statut := case when length(v_slug) = 8 then 'ok' else 'ÉCHEC' end;
  detail := 'lien /c/' || coalesce(v_slug, '?');
  return next;

  etape := 'Partage : cachée tant qu''elle n''est pas publiée';
  set local role anon;
  select count(*) into v_n from public.captures where slug = v_slug;
  reset role;
  statut := case when v_n = 0 and not exists (select 1 from public.get_capture(v_slug)) then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Partage : publier';
  v_ok := public.publish_capture(v_slug);
  set local role anon;
  select count(*) into v_n from public.get_capture(v_slug);
  reset role;
  statut := case when v_ok and v_n = 1 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Recherche tolérante aux fautes (« verificaton »)';
  select count(*) into v_n from public.search_sites('verificaton') s where s.domain = v_domain;
  statut := case when v_n = 1 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Galerie et page du site';
  select count(*) into v_n from public.recent_sites(60) s where s.domain = v_domain;
  select v_n + count(*) into v_n from public.site_page_list(v_domain) p where p.latest_slug = v_slug;
  statut := case when v_n = 2 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Visite comptée';
  perform public.record_view(v_slug);
  select g.views_count into v_n from public.get_capture(v_slug) g;
  statut := case when v_n = 1 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Limite d''envois (2 permis, le 3e refusé)';
  v_ok := not public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour')
      and not public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour')
      and public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour');
  statut := case when v_ok then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Signalements : masquée au 3e';
  perform public.report_capture(v_slug, 'spam', null, '\x0a'::bytea);
  perform public.report_capture(v_slug, 'spam', null, '\x0a'::bytea); -- la même personne : ne compte pas
  perform public.report_capture(v_slug, 'spam', null, '\x0b'::bytea);
  select count(*) into v_n from public.get_capture(v_slug);
  v_ok := v_n = 1;
  perform public.report_capture(v_slug, 'spam', null, '\x0c'::bytea);
  select count(*) into v_n from public.get_capture(v_slug);
  statut := case when v_ok and v_n = 0 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Suppression : refusée avec un mauvais lien secret';
  v_ok := public.delete_capture(v_slug, extensions.digest('mauvais-jeton', 'sha256'));
  statut := case when not v_ok then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  etape := 'Suppression : avec le bon lien secret';
  v_ok := public.delete_capture(v_slug, v_token);
  select count(*) into v_n from public.captures where slug = v_slug;
  statut := case when v_ok and v_n = 0 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;

  -- Ménage : le site et la page d'essai (et celui d'un visiteur, si l'écriture est passée), les envois comptés.
  delete from public.sites where domain in (v_domain, 'pirate.domcity.invalid');
  delete from public.rate_events where action = 'verification-domcity';

  etape := 'Ménage : rien ne reste de l''essai';
  select count(*) into v_n from public.sites where domain in (v_domain, 'pirate.domcity.invalid');
  statut := case when v_n = 0 then 'ok' else 'ÉCHEC' end;
  detail := '';
  return next;
end;
$$;

select * from pg_temp.domcity_verification();
