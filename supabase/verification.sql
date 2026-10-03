-- =============================================================================
-- DOMCity: check the database after the migrations
--
-- Paste into the Supabase SQL Editor (postgres role), then Run.
-- Every line of the result must say "ok". This is not a migration: it can
-- be run again as many times as you like.
--
-- 1. The structure: extensions, tables, security, functions, visitor privileges.
-- 2. The list of refused sites: filled, and what it refuses or not.
-- 3. A trial share on verification.domcity.invalid, from start to finish
--    (create, publish, search, visit, refuse, report, delete), erased at the end.
--    If a step crashes, everything is rolled back: nothing stays in the database.
-- =============================================================================

create or replace function pg_temp.domcity_verification()
returns table (step text, status text, detail text)
language plpgsql
as $$
declare
  v_domain  constant text := 'verification.domcity.invalid';
  v_tables  constant text[] := array['sites', 'pages', 'captures', 'capture_secrets', 'reports', 'rate_events', 'blocked_domains'];
  v_funcs   constant text[] := array[
    'new_slug', 'refresh_counters', 'on_report', 'create_capture', 'publish_capture', 'delete_capture',
    'report_capture', 'hit_rate_limit', 'site_city', 'page_versions', 'record_view', 'get_capture',
    'get_site', 'site_pages', 'known_sites', 'search_sites', 'recent_sites', 'site_page_list',
    'domain_suffixes', 'is_blocked_domain', 'blocklist'];
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
    'public.site_page_list(text, integer, integer)',
    'public.is_blocked_domain(text)',
    'public.blocklist()'];
  v_token   constant bytea := extensions.digest('verification-token', 'sha256');
  v_missing text;
  v_slug    text;
  v_n       integer;
  v_ok      boolean;
begin
  -- An interrupted previous attempt must not skew this one.
  delete from public.sites where domain in (v_domain, 'pirate.domcity.invalid', 'sub.refused.domcity.invalid');
  delete from public.rate_events where action = 'verification-domcity';
  delete from public.blocked_domains where domain in (v_domain, 'refused.domcity.invalid');

  -- 1. Structure ---------------------------------------------------------------

  step := 'Extensions pg_trgm and pgcrypto';
  select string_agg(e, ', ') into v_missing
    from unnest(array['pg_trgm', 'pgcrypto']) e
   where not exists (select 1 from pg_extension x where x.extname = e);
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('missing: ' || v_missing, '');
  return next;

  step := 'The 7 tables';
  select string_agg(t, ', ') into v_missing
    from unnest(v_tables) t
   where to_regclass('public.' || t) is null;
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('missing: ' || v_missing, '');
  return next;

  step := 'Row level security (RLS) on every table';
  select string_agg(c.relname, ', ') into v_missing
    from pg_class c
   where c.relnamespace = 'public'::regnamespace
     and c.relname = any (v_tables)
     and not c.relrowsecurity;
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('disabled on: ' || v_missing, '');
  return next;

  step := 'The 21 functions';
  select string_agg(f, ', ') into v_missing
    from unnest(v_funcs) f
   where not exists (select 1 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = f);
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('missing: ' || v_missing, '');
  return next;

  step := 'Old functions removed';
  select string_agg(p.proname, ', ') into v_missing
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname in ('search_cities', 'recent_captures');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('still there: ' || v_missing, '');
  return next;

  step := 'Visitors: no writes to the tables';
  select string_agg(t, ', ') into v_missing
    from unnest(v_tables) t
   where has_table_privilege('anon', 'public.' || t, 'insert')
      or has_table_privilege('anon', 'public.' || t, 'update')
      or has_table_privilege('anon', 'public.' || t, 'delete');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('writable by anon: ' || v_missing, '');
  return next;

  step := 'Visitors: secrets, reports, limits, refused sites unreadable';
  select string_agg(t, ', ') into v_missing
    from unnest(array['capture_secrets', 'reports', 'rate_events', 'blocked_domains']) t
   where has_table_privilege('anon', 'public.' || t, 'select');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('readable by anon: ' || v_missing, '');
  return next;

  step := 'Visitors: no write function';
  select string_agg(f, ', ') into v_missing
    from unnest(v_writes) f
   where has_function_privilege('anon', f, 'execute');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('allowed to anon: ' || v_missing, '');
  return next;

  step := 'Visitors: the read functions';
  select string_agg(f, ', ') into v_missing
    from unnest(v_reads) f
   where not has_function_privilege('anon', f, 'execute');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('denied to anon: ' || v_missing, '');
  return next;

  step := 'The API (service_role): the write functions';
  select string_agg(f, ', ') into v_missing
    from unnest(v_writes) f
   where not has_function_privilege('service_role', f, 'execute');
  status := case when v_missing is null then 'ok' else 'FAIL' end;
  detail := coalesce('denied: ' || v_missing, '');
  return next;

  -- What a visitor's browser would really do, with the anon role.
  step := 'Visitors: a direct write is refused';
  begin
    set local role anon;
    insert into public.sites (domain) values ('pirate.domcity.invalid');
    reset role;
    status := 'FAIL';
    detail := 'anon could add a site';
  exception when insufficient_privilege then
    status := 'ok';
    detail := '';
  end;
  return next;

  -- 2. Refused sites ---------------------------------------------------------------

  step := 'Refused sites: the list is filled';
  select count(*) into v_n from public.blocked_domains;
  select string_agg(c, ', ') into v_missing
    from unnest(array['adult', 'violence', 'bank', 'private', 'gambling', 'danger']) c
   where not exists (select 1 from public.blocked_domains b where b.category = c);
  status := case when v_n >= 1000 and v_missing is null then 'ok' else 'FAIL' end;
  detail := v_n || ' entries' || coalesce(', empty category: ' || v_missing, '');
  return next;

  step := 'Refused sites: subdomains, extensions, precise entries';
  select string_agg(h, ', ') into v_missing
    from unnest(array['fr.pornhub.com', 'rule34.xxx', 'mabanque.bnpparibas', 'mail.google.com', 'www.betclic.fr']) h
   where not public.is_blocked_domain(h);
  select string_agg(h, ', ') into detail
    from unnest(array['google.com', 'www.google.com', 'pornic.fr', 'essex.ac.uk', 'fr.wikipedia.org']) h
   where public.is_blocked_domain(h);
  status := case when v_missing is null and detail is null then 'ok' else 'FAIL' end;
  detail := concat_ws('; ', 'not refused: ' || v_missing, 'wrongly refused: ' || detail);
  return next;

  step := 'Refused sites: the database refuses to create their city';
  insert into public.blocked_domains (domain, category, note) values ('refused.domcity.invalid', 'danger', 'verification');
  begin
    perform public.create_capture('sub.refused.domcity.invalid', '/', 'bookmarklet', 'Refused', 1000,
                                  '{}'::jsonb, v_token, 1::smallint);
    status := 'FAIL';
    detail := 'the city was created';
  exception when others then
    status := case when sqlerrm like 'blocked_domain%' then 'ok' else 'FAIL' end;
    detail := case when status = 'ok' then '' else sqlerrm end;
  end;
  delete from public.blocked_domains where domain = 'refused.domcity.invalid';
  return next;

  step := 'Visitors: the whole list, through its function';
  set local role anon;
  select count(*) into v_n from public.blocklist();
  reset role;
  status := case when v_n = (select count(*) from public.blocked_domains) then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  -- 3. A trial share ------------------------------------------------------------

  step := 'Sharing: create a version';
  v_slug := public.create_capture(v_domain, '/trial', 'bookmarklet', 'DOMCity verification page', 1000,
                                  '{"thumbnail": false}'::jsonb, v_token, 1::smallint);
  status := case when length(v_slug) = 8 then 'ok' else 'FAIL' end;
  detail := 'link /city/' || coalesce(v_slug, '?');
  return next;

  step := 'Sharing: hidden until it is published';
  set local role anon;
  select count(*) into v_n from public.captures where slug = v_slug;
  reset role;
  status := case when v_n = 0 and not exists (select 1 from public.get_capture(v_slug)) then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Sharing: publish';
  v_ok := public.publish_capture(v_slug);
  set local role anon;
  select count(*) into v_n from public.get_capture(v_slug);
  reset role;
  status := case when v_ok and v_n = 1 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Typo-tolerant search ("verificaton")';
  select count(*) into v_n from public.search_sites('verificaton') s where s.domain = v_domain;
  status := case when v_n = 1 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Gallery and site page';
  select count(*) into v_n from public.recent_sites(60) s where s.domain = v_domain;
  select v_n + count(*) into v_n from public.site_page_list(v_domain) p where p.latest_slug = v_slug;
  status := case when v_n = 2 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Refused sites: a site added to the list disappears from reads, then comes back';
  insert into public.blocked_domains (domain, category, note) values (v_domain, 'danger', 'verification');
  select count(*) into v_n from public.get_capture(v_slug);
  select v_n + count(*) into v_n from public.recent_sites(60) s where s.domain = v_domain;
  select v_n + count(*) into v_n from public.search_sites('verificaton') s where s.domain = v_domain;
  select v_n + count(*) into v_n from public.site_page_list(v_domain);
  select v_n + count(*) into v_n from public.site_city(v_domain);
  select v_n + count(*) into v_n from public.known_sites(array[v_domain]);
  delete from public.blocked_domains where domain = v_domain;
  status := case when v_n = 0 and exists (select 1 from public.get_capture(v_slug)) then 'ok' else 'FAIL' end;
  detail := case when v_n = 0 then '' else v_n || ' reads still show it' end;
  return next;

  step := 'Visit counted';
  perform public.record_view(v_slug);
  select g.views_count into v_n from public.get_capture(v_slug) g;
  status := case when v_n = 1 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Upload limit (2 allowed, the 3rd refused)';
  v_ok := not public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour')
      and not public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour')
      and public.hit_rate_limit('\x01'::bytea, 'verification-domcity', 2, interval '1 hour');
  status := case when v_ok then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Reports: hidden at the 3rd';
  perform public.report_capture(v_slug, 'spam', null, '\x0a'::bytea);
  perform public.report_capture(v_slug, 'spam', null, '\x0a'::bytea); -- the same person: does not count
  perform public.report_capture(v_slug, 'spam', null, '\x0b'::bytea);
  select count(*) into v_n from public.get_capture(v_slug);
  v_ok := v_n = 1;
  perform public.report_capture(v_slug, 'spam', null, '\x0c'::bytea);
  select count(*) into v_n from public.get_capture(v_slug);
  status := case when v_ok and v_n = 0 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Deletion: refused with a wrong secret link';
  v_ok := public.delete_capture(v_slug, extensions.digest('wrong-token', 'sha256'));
  status := case when not v_ok then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  step := 'Deletion: with the right secret link';
  v_ok := public.delete_capture(v_slug, v_token);
  select count(*) into v_n from public.captures where slug = v_slug;
  status := case when v_ok and v_n = 0 then 'ok' else 'FAIL' end;
  detail := '';
  return next;

  -- Cleanup: the trial site and page (and a visitor's or a refused site's, if the write went through),
  -- the counted uploads, the trial entries of the list.
  delete from public.sites where domain in (v_domain, 'pirate.domcity.invalid', 'sub.refused.domcity.invalid');
  delete from public.rate_events where action = 'verification-domcity';
  delete from public.blocked_domains where domain in (v_domain, 'refused.domcity.invalid');

  step := 'Cleanup: nothing is left of the trial';
  select count(*) into v_n from public.sites where domain in (v_domain, 'pirate.domcity.invalid', 'sub.refused.domcity.invalid');
  select v_n + count(*) into v_n from public.blocked_domains where domain in (v_domain, 'refused.domcity.invalid');
  status := case when v_n = 0 then 'ok' else 'FAIL' end;
  detail := '';
  return next;
end;
$$;

select * from pg_temp.domcity_verification();
