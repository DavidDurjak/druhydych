-- GainTrain: predplatné a limity AI (v303). Pripravené, ale VYPNUTÉ: kým admin nenastaví billing.on = true,
-- appka aj AI funkcie fungujú presne ako doteraz (nič sa neobmedzuje, nikde sa neukáže platenie).
--
-- Ako to funguje po zapnutí:
--   * premium má: aktívne predplatné (Stripe) | skúšobná doba (7 dní od registrácie, starší účty 7 dní od zapnutia) | admin | schválený tréner
--   * bez premium: denné limity AI podľa billing.free (napr. 3 AI zápisy jedla denne), niektoré funkcie len s premium (limit 0)
--   * s premium: férové denné stropy podľa billing.premium (ochrana pred zneužitím, nie obmedzenie)
--   * ceny, plány a limity sú v tabuľke app_config, takže sa dajú meniť bez novej verzie appky
--
-- Tabuľky: app_config (nastavenia), subscriptions (stav predplatného zo Stripe, zapisuje len server), ai_usage (počet AI použití za deň).
-- Funkcie: my_entitlement() pre appku, ai_take(uid, feature) pre AI funkcie na serveri.

begin;

-- 1) nastavenia appky (čítať môže každý prihlásený, meniť len admin)
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists app_config_read on public.app_config;
create policy app_config_read on public.app_config for select to authenticated using (true);
drop policy if exists app_config_admin on public.app_config;
create policy app_config_admin on public.app_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.app_config (key, value) values ('billing', jsonb_build_object(
  'on', false,                 -- hlavný vypínač: false = nič sa neobmedzuje ani nezobrazuje
  'launch_at', null,           -- kedy sa zaplo (doplní sa pri zapnutí); starší účty majú skúšobnú dobu od tohto dňa
  'trial_days', 7,
  -- denné limity bez predplatného (0 = len s predplatným)
  'free', jsonb_build_object('ai_log', 3, 'coach_chat', 3, 'label_scan', 3, 'machine_scan', 2, 'coach_afterlog', 0, 'menu_scan', 0, 'fridge_scan', 0, 'physique_ai', 0, 'recipe_import', 0),
  -- férové denné stropy s predplatným
  'premium', jsonb_build_object('ai_log', 60, 'coach_chat', 80, 'label_scan', 40, 'machine_scan', 30, 'coach_afterlog', 40, 'menu_scan', 30, 'fridge_scan', 15, 'physique_ai', 6, 'recipe_import', 20),
  -- plány na obrazovke predplatného; price_id = cena v Stripe (doplní sa po založení účtu)
  'plans', jsonb_build_array(
    jsonb_build_object('id', 'year', 'name', 'Ročne', 'price', null, 'period', 'rok', 'price_id', null, 'badge', 'Najvýhodnejšie'),
    jsonb_build_object('id', 'month', 'name', 'Mesačne', 'price', null, 'period', 'mesiac', 'price_id', null, 'badge', null)
  )
)) on conflict (key) do nothing;

-- 2) predplatné (zapisuje len server cez Stripe webhook; človek vidí len svoje)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'none',          -- active | trialing | past_due | canceled | none (podľa Stripe)
  plan text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_own on public.subscriptions;
create policy subscriptions_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- 3) počítadlo AI za deň (slovenský čas); človek vidí len svoje, zapisuje len ai_take
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  feature text not null,
  n int not null default 0,
  primary key (user_id, day, feature)
);
alter table public.ai_usage enable row level security;
drop policy if exists ai_usage_own on public.ai_usage;
create policy ai_usage_own on public.ai_usage for select to authenticated using (user_id = (select auth.uid()));

-- 4) nárok na premium pre konkrétneho človeka
create or replace function public.entitlement(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  s public.subscriptions;
  created timestamptz;
  trial_end timestamptz;
begin
  if p_uid is null then return jsonb_build_object('on', false, 'premium', false, 'reason', 'anon'); end if;
  if not coalesce((cfg->>'on')::boolean, false) then return jsonb_build_object('on', false, 'premium', true, 'reason', 'off'); end if;
  select * into s from public.subscriptions where user_id = p_uid;
  if s.status in ('active', 'trialing') or (s.status = 'past_due' and s.current_period_end > now() - interval '3 days') then
    return jsonb_build_object('on', true, 'premium', true, 'reason', 'sub', 'plan', s.plan, 'period_end', s.current_period_end, 'cancel', s.cancel_at_period_end);
  end if;
  if exists (select 1 from public.admins where user_id = p_uid) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'admin'); end if;
  if exists (select 1 from public.trainer_profiles where user_id = p_uid and approved) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trainer'); end if;
  select u.created_at into created from auth.users u where u.id = p_uid;
  trial_end := greatest(created, coalesce((cfg->>'launch_at')::timestamptz, created)) + make_interval(days => coalesce((cfg->>'trial_days')::int, 7));
  if trial_end > now() then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trial', 'trial_end', trial_end); end if;
  return jsonb_build_object('on', true, 'premium', false, 'reason', 'free', 'trial_end', trial_end, 'had_sub', s.status is not null and s.status <> 'none');
end $$;
revoke all on function public.entitlement(uuid) from public, anon, authenticated;

-- pre appku: môj nárok + dnešné využitie AI a limity
create or replace function public.my_entitlement()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  e jsonb := public.entitlement(uid);
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  d date := (now() at time zone 'Europe/Bratislava')::date;
begin
  return e || jsonb_build_object(
    'limits', case when (e->>'premium')::boolean then cfg->'premium' else cfg->'free' end,
    'used', coalesce((select jsonb_object_agg(feature, n) from public.ai_usage where user_id = uid and day = d), '{}'::jsonb),
    'plans', case when (e->>'on')::boolean then cfg->'plans' else '[]'::jsonb end,
    'trial_days', cfg->'trial_days'
  );
end $$;
revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

-- 5) AI funkcia na serveri: „smiem?“ + započítanie. Vráti ok, koľko zostáva a či má premium.
-- Pri vypnutom predplatnom vždy ok (len sa počíta). Volá ju len server (service_role).
create or replace function public.ai_take(p_uid uuid, p_feature text, p_n int default 1)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  e jsonb := public.entitlement(p_uid);
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  d date := (now() at time zone 'Europe/Bratislava')::date;
  prem boolean := coalesce((e->>'premium')::boolean, false);
  lim int;
  used int;
begin
  if p_uid is null or p_feature !~ '^[a-z_]{2,30}$' then return jsonb_build_object('ok', false, 'reason', 'bad'); end if;
  lim := nullif(case when prem then cfg->'premium'->>p_feature else cfg->'free'->>p_feature end, '')::int;
  select n into used from public.ai_usage where user_id = p_uid and day = d and feature = p_feature;
  used := coalesce(used, 0);
  if coalesce((e->>'on')::boolean, false) and lim is not null and used + greatest(p_n, 1) > lim then
    return jsonb_build_object('ok', false, 'premium', prem, 'limit', lim, 'used', used, 'left', greatest(lim - used, 0), 'reason', case when prem then 'cap' when lim = 0 then 'premium_only' else 'free_limit' end);
  end if;
  insert into public.ai_usage (user_id, day, feature, n) values (p_uid, d, p_feature, greatest(p_n, 1))
    on conflict (user_id, day, feature) do update set n = public.ai_usage.n + excluded.n;
  return jsonb_build_object('ok', true, 'premium', prem, 'limit', lim, 'used', used + greatest(p_n, 1), 'left', case when lim is null then null else greatest(lim - used - greatest(p_n, 1), 0) end);
end $$;
revoke all on function public.ai_take(uuid, text, int) from public, anon, authenticated;
grant execute on function public.ai_take(uuid, text, int) to service_role;

-- keď AI zlyhá (preťaženie, nečitateľná fotka), použitie sa vráti, aby to človeka nestálo limit
create or replace function public.ai_refund(p_uid uuid, p_feature text)
returns void language sql volatile security definer set search_path = public as $$
  update public.ai_usage set n = greatest(n - 1, 0)
  where user_id = p_uid and feature = p_feature and day = (now() at time zone 'Europe/Bratislava')::date
$$;
revoke all on function public.ai_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.ai_refund(uuid, text) to service_role;

-- staré počítadlá AI sa čistia (stačí 60 dní)
do $$ begin
  if exists (select 1 from cron.job where jobname = 'ai-usage-retention') then perform cron.unschedule('ai-usage-retention'); end if;
  perform cron.schedule('ai-usage-retention', '29 4 * * *', $c$delete from public.ai_usage where day < current_date - 60$c$);
end $$;

commit;
