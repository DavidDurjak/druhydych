-- GainTrain: ochrana osobných údajov (GDPR), v301.
-- Doteraz mal starý účet s rolou „coach“ (z čias, keď appka bola pre jednu skupinu) prístup k údajom VŠETKÝCH používateľov:
-- profil, jedlá, váha, tréningy, fotky postavy. Odteraz:
--   * každý vidí len svoje údaje,
--   * tréner vidí len klientov, ktorí ho sami pridali a súhlasili (is_trainer_of, tabuľka trainer_clients),
--   * admin vidí len súhrnné čísla (admin_stats bez zoznamu ľudí) a správy, ktoré mu ľudia sami poslali,
--   * úpravy verejnej databázy potravín robí admin (predtým „coach“).
-- Plus: podrobné záznamy merania (app_events) sa po 90 dňoch mažú.

begin;

-- 1) stará rola „coach“ sa ruší
update public.profiles set role = 'participant' where role = 'coach';
create or replace function public.is_coach() returns boolean language sql stable security definer set search_path = public as $$ select false $$;

-- 2) osobné údaje: len vlastné (tréner má vlastné pravidlá „trainer sees client …“, tie ostávajú)
drop policy if exists "profiles own or coach" on public.profiles;
create policy "profiles own" on public.profiles for select using (id = (select auth.uid()));
drop policy if exists "weight own or coach" on public.weight_logs;
create policy "weight own" on public.weight_logs for select using (user_id = (select auth.uid()));
drop policy if exists "food own or coach" on public.food_logs;
create policy "food own" on public.food_logs for select using (user_id = (select auth.uid()));
drop policy if exists "checkins own or coach" on public.checkins;
create policy "checkins own" on public.checkins for select using (user_id = (select auth.uid()));
drop policy if exists "photos own or coach" on public.progress_photos;
create policy "photos own" on public.progress_photos for select using (user_id = (select auth.uid()));
drop policy if exists "plans own or coach" on public.workout_plans;
create policy "plans own" on public.workout_plans for select using (user_id = (select auth.uid()));
drop policy if exists "wlogs own or coach" on public.workout_logs;
create policy "wlogs own" on public.workout_logs for select using (user_id = (select auth.uid()));
drop policy if exists "targets own or coach" on public.target_history;
create policy "targets own" on public.target_history for select using (user_id = (select auth.uid()));
drop policy if exists hd_sel on public.health_daily;
create policy hd_sel on public.health_daily for select using (user_id = (select auth.uid()));
drop policy if exists ai_sel on public.ai_logs;
create policy ai_sel on public.ai_logs for select using (user_id = (select auth.uid()));
drop policy if exists wc_sel on public.weekly_checkins;
create policy wc_sel on public.weekly_checkins for select using (user_id = (select auth.uid()));

-- fotky postavy v úložisku: len vlastné (tréner klienta má pravidlo „photos read active trainer“)
drop policy if exists "photos read own or coach" on storage.objects;
create policy "photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (auth.uid())::text);

-- 3) databáza potravín a nahlásené chyby v nej: spravuje admin
drop policy if exists foods_sel on public.foods;
create policy foods_sel on public.foods for select to authenticated using (is_public or created_by = (select auth.uid()) or public.is_admin());
drop policy if exists foods_upd on public.foods;
create policy foods_upd on public.foods for update to authenticated using (created_by = (select auth.uid()) or public.is_admin()) with check (true);
drop policy if exists foods_del on public.foods;
create policy foods_del on public.foods for delete to authenticated using (created_by = (select auth.uid()) or public.is_admin());
drop policy if exists fr_sel on public.food_reports;
create policy fr_sel on public.food_reports for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

-- 4) staré správy „komukoľvek s rolou coach“ sa rušia; píše sa len prepojenému trénerovi („msg trainer link send“)
drop policy if exists "msg send" on public.messages;

-- 5) funkcie: kouča nahradí admin (potraviny), tréner klienta (aktivita, report) alebo nikto (report všetkých len pre server)
do $$
declare f record; src text;
begin
  for f in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and p.proname in ('foods_guard', 'search_foods_v2', 'search_foods_v3', 'weekly_report', 'weekly_reports_all', 'activity_days_for')
  loop
    src := pg_get_functiondef(f.oid);
    if f.proname in ('foods_guard', 'search_foods_v2', 'search_foods_v3') then
      src := replace(src, 'public.is_coach()', 'public.is_admin()');
    elsif f.proname = 'activity_days_for' then
      src := replace(src, 'or public.is_coach()', 'or public.is_trainer_of(p_user)');
    else
      src := replace(src, ' or public.is_coach()', '');
    end if;
    execute src;
  end loop;
end $$;

-- 6) admin prehľad bez zoznamu ľudí (mená, e-maily, aktivita jednotlivcov): len súhrnné čísla
do $$
declare src text;
begin
  src := pg_get_functiondef('public.admin_stats'::regproc);
  src := regexp_replace(src, ',\s*''people'',\s*\(select jsonb_agg\(x order by.*?from usr u\) s\)', '', 's');
  if src ~ '''people''' then raise exception 'admin_stats: zoznam ľudí sa nepodarilo odstrániť'; end if;
  execute src;
end $$;

-- 7) záznamy merania staršie ako 90 dní sa denne mažú (lievik a návratnosť stačia za 3 mesiace)
do $$ begin
  if exists (select 1 from cron.job where jobname = 'app-events-retention') then perform cron.unschedule('app-events-retention'); end if;
  perform cron.schedule('app-events-retention', '23 4 * * *', $c$delete from public.app_events where ts < now() - interval '90 days'$c$);
end $$;

commit;
