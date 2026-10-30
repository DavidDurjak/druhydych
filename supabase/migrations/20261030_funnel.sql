-- GainTrain: meranie, kde ľudia odchádzajú (v300).
-- 1) Každé zariadenie má náhodné anonymné ID (did). Kroky kvízu sa merajú aj pred registráciou, bez mena, e-mailu či odpovedí.
-- 2) Anonymne sa dá zapísať len udalosť kvízu (fn_…) alebo kliknutie na Google, s malým obsahom. Čítať môže len admin.
-- 3) admin_funnel(dni) vráti lievik: kvíz krok po kroku, registrácia, onboarding, prvé jedlo, návrat na 2. deň a po týždni.

alter table public.app_events add column if not exists did text;
create index if not exists app_events_did_idx on public.app_events (did) where did is not null;

drop policy if exists app_events_insert_anon on public.app_events;
create policy app_events_insert_anon on public.app_events for insert to anon
  with check (
    user_id is null
    and (name ~ '^fn_[a-z_]{2,30}$' or name = 'google_signin')
    and did ~ '^[a-z0-9]{10,24}$'
    and (props is null or length(props::text) < 600)
  );

create or replace function public.admin_funnel(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
  d int := greatest(1, least(coalesce(p_days, 30), 365));
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  t date := (now() at time zone 'Europe/Bratislava')::date;
begin
  if not public.is_admin() then raise exception 'Len pre admina'; end if;
  with fe as (
    select did, name, props, ts from public.app_events
    where ts >= since and did is not null and (name like 'fn\_%' or name = 'google_signin')
  ),
  usr as (
    select u.id, (u.created_at at time zone 'Europe/Bratislava')::date as d0, p.onboarded, p.intake
    from auth.users u join public.profiles p on p.id = u.id
    where u.created_at >= since and coalesce(p.role, '') <> 'coach'
  ),
  act as (
    select user_id, date from public.food_logs where date >= (since at time zone 'Europe/Bratislava')::date
    union select user_id, date from public.weight_logs where date >= (since at time zone 'Europe/Bratislava')::date
    union select user_id, date from public.workout_logs where done and date >= (since at time zone 'Europe/Bratislava')::date
    union select user_id, date from public.checkins where date >= (since at time zone 'Europe/Bratislava')::date
    union select user_id, (ts at time zone 'Europe/Bratislava')::date from public.app_events where name = 'open' and user_id is not null and ts >= since
  ),
  fa as (
    select (props->>'taps')::numeric taps, (props->>'ms')::numeric ms, props->>'src' src from public.app_events
    where name = 'food_add' and ts >= since and coalesce((props->>'n')::int, 1) = 1 and (props->>'ms')::numeric between 500 and 600000
  )
  select jsonb_build_object(
    'days', d,
    'devices', (select count(distinct did) from fe),
    'steps', coalesce((select jsonb_object_agg(s, n) from (select props->>'s' s, count(distinct did) n from fe where name = 'fn_step' group by 1) x), '{}'::jsonb),
    'login_tap', (select count(distinct did) from fe where name = 'fn_login'),
    'signup_try', (select count(distinct did) from fe where name = 'fn_signup'),
    'signup_ok', (select count(distinct did) from fe where name = 'fn_signup' and props->>'ok' = 'true'),
    'signup_err', coalesce((select jsonb_object_agg(e, n) from (select props->>'e' e, count(*) n from fe where name = 'fn_signup' and props->>'ok' = 'false' group by 1) x), '{}'::jsonb),
    'google', (select count(distinct did) from fe where name = 'google_signin' and props->>'act' = 'click'),
    'sources', coalesce((select jsonb_agg(x order by x.n desc) from (
       select coalesce(nullif(props->>'utm', ''), nullif(props->>'ref', ''), 'priamo') src, count(distinct did) n
       from fe where name = 'fn_land' group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'acc', (select count(*) from usr),
    'onb', (select count(*) from usr where onboarded),
    'log24', (select count(*) from usr u where exists (select 1 from public.food_logs f where f.user_id = u.id and f.date <= u.d0 + 1)),
    'logany', (select count(*) from usr u where exists (select 1 from public.food_logs f where f.user_id = u.id)),
    'd1', jsonb_build_object('n', (select count(*) from usr where d0 <= t - 1),
                             'ok', (select count(*) from usr u where d0 <= t - 1 and exists (select 1 from act a where a.user_id = u.id and a.date = u.d0 + 1))),
    'd7', jsonb_build_object('n', (select count(*) from usr where d0 <= t - 8),
                             'ok', (select count(*) from usr u where d0 <= t - 8 and exists (select 1 from act a where a.user_id = u.id and a.date between u.d0 + 6 and u.d0 + 8))),
    'intake_src', coalesce((select jsonb_object_agg(s, n) from (select coalesce(intake->>'src', 'nevyplnil') s, count(*) n from usr group by 1) x), '{}'::jsonb),
    'log_speed', (select jsonb_build_object('n', count(*), 'taps', percentile_cont(0.5) within group (order by taps), 'sec', round((percentile_cont(0.5) within group (order by ms) / 1000)::numeric, 1)) from fa),
    'log_src', coalesce((select jsonb_agg(x order by x.n desc) from (
       select src, count(*) n, round((percentile_cont(0.5) within group (order by ms) / 1000)::numeric, 1) sec from fa group by 1 order by 2 desc limit 6) x), '[]'::jsonb),
    'screens', coalesce((select jsonb_agg(x order by x.u desc) from (
       select props->>'s' s, count(distinct user_id) u, count(*) n from public.app_events
       where name = 'screen' and ts >= since and user_id is not null group by 1 order by 2 desc, 3 desc limit 14) x), '[]'::jsonb),
    'features', coalesce((select jsonb_agg(x order by x.u desc) from (
       select name, count(distinct user_id) u, count(*) n from public.app_events
       where ts >= since and user_id is not null and name not in ('open', 'screen', 'food_add', 'diag', 'audit_probe') and name not like 'fn\_%'
       group by 1 order by 2 desc, 3 desc limit 14) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;

revoke all on function public.admin_funnel(int) from public, anon;
grant execute on function public.admin_funnel(int) to authenticated;
