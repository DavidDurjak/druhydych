-- GainTrain: tréningy kamarátov a pochvala (v309).
-- Kamaráti (friendships) vidia odcvičené tréningy toho, kto si zdieľanie sám zapol (profiles.share_workouts = true).
-- Vidno len: dátum, názov tréningového dňa, trvanie, počet sérií a celkový objem (kg × opakovania). Nikdy jedlo, kalórie ani váhu.
-- Pochvala (💪) = jeden riadok na tréning a človeka. Všetko ide cez funkcie, priamy prístup k tabuľke nemá nikto.

begin;

alter table public.profiles add column if not exists share_workouts boolean; -- null = ešte sa nerozhodol, false = nie, true = áno

create table if not exists public.workout_kudos (
  log_id bigint not null references public.workout_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (log_id, user_id)
);
alter table public.workout_kudos enable row level security; -- bez politík: len cez funkcie nižšie
create index if not exists workout_kudos_user on public.workout_kudos (user_id);

-- sú dvaja ľudia kamaráti?
create or replace function public.are_friends(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.a = least(x, y) and f.b = greatest(x, y))
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- zoznam tréningov: moje (vždy, aby som videl pochvaly) a kamarátov, ktorí zdieľajú; posledných 14 dní
create or replace function public.friends_feed(p_limit int default 30)
returns json language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); res json; today date := (now() at time zone 'Europe/Bratislava')::date;
begin
  if me is null then return '[]'::json; end if;
  select coalesce(json_agg(x order by x.date desc, x.created_at desc), '[]'::json) into res from (
    select w.id, w.date, w.created_at, w.day_name, w.duration_min, p.name, p.sex, (w.user_id = me) as me,
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

-- pochváliť / zrušiť pochvalu; len tréning kamaráta, ktorý zdieľa (nie vlastný)
create or replace function public.give_kudos(p_log bigint, p_on boolean default true)
returns json language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); owner uuid; shares boolean; n int;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  select w.user_id, p.share_workouts into owner, shares from workout_logs w join profiles p on p.id = w.user_id where w.id = p_log and w.done;
  if owner is null or owner = me or shares is not true or not public.are_friends(me, owner) then raise exception 'Tento tréning nemôžeš pochváliť.'; end if;
  if p_on then insert into workout_kudos (log_id, user_id) values (p_log, me) on conflict do nothing;
  else delete from workout_kudos where log_id = p_log and user_id = me; end if;
  select count(*) into n from workout_kudos where log_id = p_log;
  return json_build_object('kudos', n, 'mine', p_on);
end $$;
revoke all on function public.give_kudos(bigint, boolean) from public, anon;
grant execute on function public.give_kudos(bigint, boolean) to authenticated;

commit;
