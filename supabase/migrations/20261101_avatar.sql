-- GainTrain: profilová fotka (v312). Fotka z galérie alebo portrét realistického 3D avatara (Avaturn), uložená v priečinku avatars.
-- profiles.avatar_url = adresa fotky.
-- Fotky: verejný priečinok avatars, každý môže nahrávať a mazať len vo svojom podpriečinku <id>/, súbory s náhodným názvom.
-- Vidia ich len ľudia, ktorí poznajú adresu (kamaráti cez rebríček, tréningy a profil).
-- Spúšťa sa PO súbore profil_kamarata.sql (rovnaké funkcie, navyše vracajú fotku/avatar).

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles drop constraint if exists profiles_avatar_url_ok;
alter table public.profiles add constraint profiles_avatar_url_ok check (avatar_url is null or avatar_url like 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/storage/v1/object/public/avatars/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

begin;

-- rebríček: pridaná profilová fotka
create or replace function public.friends_board()
returns json language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); res json; today date := (now() at time zone 'Europe/Bratislava')::date;
begin
  if me is null then return '[]'::json; end if;
  select coalesce(json_agg(r order by r.points desc, r.name), '[]'::json) into res from (
    select p.id, p.name, p.avatar_url, (p.id = me) as me,
      coalesce(s.logged, 0) as logged, coalesce(s.ontarget, 0) as ontarget, coalesce(s.prot, 0) as prot,
      coalesce(w.n, 0) as workouts,
      coalesce(s.logged, 0) * 10 + coalesce(s.ontarget, 0) * 10 + coalesce(s.prot, 0) * 10 + coalesce(w.n, 0) * 20 as points
    from profiles p
    left join lateral (
      select count(*) as logged,
        count(*) filter (where p.target_kcal > 0 and d.kcal between p.target_kcal * 0.85 and p.target_kcal * 1.1) as ontarget,
        count(*) filter (where p.target_protein > 0 and d.protein >= p.target_protein * 0.9) as prot
      from (select date, sum(kcal) kcal, sum(protein) protein from food_logs
            where user_id = p.id and date between today - 6 and today group by date) d
    ) s on true
    left join lateral (
      select count(distinct date) as n from workout_logs
      where user_id = p.id and done and date between today - 6 and today
    ) w on true
    where p.id = me or exists (select 1 from friendships f where f.a = least(me, p.id) and f.b = greatest(me, p.id))
  ) r;
  return res;
end $$;


-- feed: pridané user_id, aby sa dal otvoriť profil autora
create or replace function public.friends_feed(p_limit int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); res json; today date := (now() at time zone 'Europe/Bratislava')::date;
begin
  if me is null then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.date desc, x.created_at desc), '[]'::json) into res from (
    select w.id, w.user_id, w.date, w.created_at, w.day_name, w.duration_min, p.name, p.sex, p.avatar_url, (w.user_id = me) as me,
      (select count(*) from jsonb_array_elements(coalesce(w.sets, '[]'::jsonb)) s where (s->>'done')::boolean is true) as sets,
      (select coalesce(round(sum(
          case when (s->>'kg') ~ '^[0-9]+(\.[0-9]+)?$' and (s->>'reps') ~ '^[0-9]+$' then (s->>'kg')::numeric * (s->>'reps')::int else 0 end)), 0)
        from jsonb_array_elements(coalesce(w.sets, '[]'::jsonb)) s where (s->>'done')::boolean is true) as volume,
      (select count(*) from workout_kudos k where k.log_id = w.id) as kudos,
      exists (select 1 from workout_kudos k where k.log_id = w.id and k.user_id = me) as mine,
      case when w.user_id = me then (
        select coalesce(json_agg(q.name order by q.created_at desc), '[]'::json) from (
          select pp.name, k.created_at from workout_kudos k join profiles pp on pp.id = k.user_id where k.log_id = w.id order by k.created_at desc limit 3) q
      ) else null end as by,
      case when w.user_id = me then (select max(k.created_at) from workout_kudos k where k.log_id = w.id) else null end as last_kudo
    from workout_logs w join profiles p on p.id = w.user_id
    where w.done and w.date between today - 13 and today
      and (w.user_id = me or (p.share_workouts is true and public.are_friends(me, w.user_id)))
    order by w.date desc, w.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 60)
  ) x;
  return res;
end $$;
revoke all on function public.friends_feed(int) from public, anon;
grant execute on function public.friends_feed(int) to authenticated;

create or replace function public.friend_profile(p_user uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Europe/Bratislava')::date;
  pr profiles; since timestamptz; shares boolean; streak int := 0; d date; logged date[];
  res json;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  if p_user is distinct from me and not public.are_friends(me, p_user) then raise exception 'Tento profil vidia len kamaráti.'; end if;
  select * into pr from profiles where id = p_user;
  if pr.id is null then raise exception 'Profil sa nenašiel.'; end if;
  select f.created_at into since from friendships f where f.a = least(me, p_user) and f.b = greatest(me, p_user);
  shares := (p_user = me and coalesce(pr.share_workouts, false)) or (pr.share_workouts is true);

  -- séria: po sebe idúce dni so zápisom jedla, končí dnes alebo včera
  select array_agg(distinct date order by date desc) into logged from food_logs where user_id = p_user and date between today - 400 and today;
  if logged is not null and array_length(logged, 1) > 0 then
    d := case when logged[1] = today then today when logged[1] = today - 1 then today - 1 else null end;
    if d is not null then
      while d = any(logged) loop streak := streak + 1; d := d - 1; end loop;
    end if;
  end if;

  select json_build_object(
    'id', pr.id, 'name', pr.name, 'sex', pr.sex, 'avatar_url', pr.avatar_url, 'me', p_user = me, 'since', since, 'joined', pr.created_at, 'shares', shares,
    'streak', streak,
    'week', (select json_build_object(
        'logged', count(*),
        'ontarget', count(*) filter (where pr.target_kcal > 0 and x.kcal between pr.target_kcal * 0.85 and pr.target_kcal * 1.1),
        'workouts', (select count(distinct date) from workout_logs where user_id = p_user and done and date between today - 6 and today))
      from (select date, sum(kcal) kcal from food_logs where user_id = p_user and date between today - 6 and today group by date) x),
    'month_workouts', (select count(distinct date) from workout_logs where user_id = p_user and done and date between today - 29 and today), -- tréningy za 30 dní
    'days', case when shares then (select coalesce(json_agg(distinct date order by date), '[]'::json) from workout_logs where user_id = p_user and done and date between today - 83 and today) else null end,
    'total', case when shares then (select count(*) from workout_logs where user_id = p_user and done) else null end,
    'workouts', case when shares then (select coalesce(json_agg(y order by y.date desc, y.created_at desc), '[]'::json) from (
        select w.id, w.user_id, w.date, w.created_at, w.day_name, w.duration_min, pr.name as name, pr.sex as sex, (w.user_id = me) as me,
          (select count(*) from jsonb_array_elements(coalesce(w.sets, '[]'::jsonb)) s where (s->>'done')::boolean is true) as sets,
          (select coalesce(round(sum(case when (s->>'kg') ~ '^[0-9]+(\.[0-9]+)?$' and (s->>'reps') ~ '^[0-9]+$' then (s->>'kg')::numeric * (s->>'reps')::int else 0 end)), 0)
            from jsonb_array_elements(coalesce(w.sets, '[]'::jsonb)) s where (s->>'done')::boolean is true) as volume,
          (select count(*) from workout_kudos k where k.log_id = w.id) as kudos,
          exists (select 1 from workout_kudos k where k.log_id = w.id and k.user_id = me) as mine,
          case when w.user_id = me then (select coalesce(json_agg(q.name order by q.created_at desc), '[]'::json) from (
              select pp.name, k.created_at from workout_kudos k join profiles pp on pp.id = k.user_id where k.log_id = w.id order by k.created_at desc limit 3) q) else null end as by
        from workout_logs w where w.user_id = p_user and w.done and w.date between today - 29 and today
        order by w.date desc, w.created_at desc limit 20) y) else null end,
    'bests', case when shares then (select coalesce(json_agg(b order by b.kg desc), '[]'::json) from (select * from (
        select distinct on (ex) ex, kg, reps, date from (
          select s->>'ex' as ex, (s->>'kg')::numeric as kg, (s->>'reps')::int as reps, w.date
          from workout_logs w, jsonb_array_elements(coalesce(w.sets, '[]'::jsonb)) s
          where w.user_id = p_user and w.done and w.date between today - 179 and today
            and (s->>'done')::boolean is true and (s->>'kg') ~ '^[0-9]+(\.[0-9]+)?$' and (s->>'reps') ~ '^[0-9]+$'
            and (s->>'kg')::numeric > 0 and (s->>'kg')::numeric < 500 and (s->>'reps')::int between 1 and 50 and coalesce(s->>'ex', '') <> ''
        ) t order by ex, kg desc, reps desc, date desc
      ) u order by kg desc limit 6) b) else null end
  ) into res;
  return res;
end $$;
revoke all on function public.friend_profile(uuid) from public, anon;
grant execute on function public.friend_profile(uuid) to authenticated;

-- odobrať kamaráta (obojstranne; tréningy sa prestanú zobrazovať obom)
create or replace function public.remove_friend(p_user uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  delete from friendships where a = least(me, p_user) and b = greatest(me, p_user);
end $$;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;


commit;
