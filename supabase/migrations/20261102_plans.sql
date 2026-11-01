-- GainTrain Plus (v314): 5 plánov, skúšobná doba s kartou, zľavy, Duo a Rodina, reklamy.
-- Predplatné ostáva VYPNUTÉ (billing.on = false), kým ho admin nezapne.
--
--   * plány: Mesačne 9,99 €, 3 mesiace 24,99 €, Ročne 59,99 €, Duo ročne 89,99 € (2 ľudia), Rodina ročne 119,99 € (do 4 ľudí)
--     ceny sú v app_config, Stripe cenu vytvorí pri platbe (netreba zakladať ceny v Stripe)
--   * skúšobná doba: 7 dní cez Stripe s kartou, len kto ešte nemal predplatné; jedna karta = jedna skúšobná doba (webhook)
--     automatická skúšobná doba od registrácie bez karty sa vypína (trial_days = 0)
--   * zľavy: prvý rok ročného za 39,99 € pre nových, prvý rok za 29,99 € pre tých, čo zrušili (najskôr 7 dní po konci)
--   * Duo a Rodina: majiteľ predplatného pozve ľudí kódom, členovia majú Plus, kým má majiteľ aktívne predplatné
--   * reklamy: nastavenie app_config.ads (vypnuté), zobrazujú sa len ľuďom bez Plus

begin;

-- 1) plány, zľavy a skúšobná doba v nastaveniach (ostatné kľúče billing ostávajú)
update public.app_config set value = value || jsonb_build_object(
  'trial_days', 0,
  'stripe_trial_days', 7,
  'plans', jsonb_build_array(
    jsonb_build_object('id', 'year', 'name', 'Ročne', 'price', 59.99, 'period', 'rok', 'months', 12, 'interval', 'year', 'count', 1, 'seats', 1, 'badge', 'Najvýhodnejšie'),
    jsonb_build_object('id', 'quarter', 'name', '3 mesiace', 'price', 24.99, 'period', '3 mesiace', 'months', 3, 'interval', 'month', 'count', 3, 'seats', 1),
    jsonb_build_object('id', 'month', 'name', 'Mesačne', 'price', 9.99, 'period', 'mesiac', 'months', 1, 'interval', 'month', 'count', 1, 'seats', 1),
    jsonb_build_object('id', 'duo', 'name', 'Duo', 'price', 89.99, 'period', 'rok', 'months', 12, 'interval', 'year', 'count', 1, 'seats', 2, 'note', 'Pre teba a jedného človeka'),
    jsonb_build_object('id', 'family', 'name', 'Rodina', 'price', 119.99, 'period', 'rok', 'months', 12, 'interval', 'year', 'count', 1, 'seats', 4, 'note', 'Pre teba a troch ďalších')
  ),
  'offers', jsonb_build_object(
    'first_year', jsonb_build_object('plans', jsonb_build_array('year'), 'price', 39.99),
    'winback', jsonb_build_object('plans', jsonb_build_array('year'), 'price', 29.99, 'after_days', 7)
  )
), updated_at = now() where key = 'billing';

insert into public.app_config (key, value) values ('ads', jsonb_build_object(
  'on', false,          -- hlavný vypínač reklám
  'client', null,       -- ID vydavateľa z Google AdSense (ca-pub-...)
  'slots', jsonb_build_object('progress', null, 'recipes', null, 'friends', null)
)) on conflict (key) do nothing;

-- 2) členovia Duo a Rodiny
alter table public.subscriptions add column if not exists family_code text unique;
create table if not exists public.sub_members (
  member_id uuid primary key references auth.users (id) on delete cascade, -- jeden človek môže byť len v jednej rodine
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (member_id <> owner_id)
);
create index if not exists sub_members_owner on public.sub_members (owner_id);
alter table public.sub_members enable row level security;
drop policy if exists sub_members_read on public.sub_members;
create policy sub_members_read on public.sub_members for select to authenticated using (member_id = (select auth.uid()) or owner_id = (select auth.uid()));

-- 3) karty, ktoré už mali skúšobnú dobu (odtlačok karty zo Stripe, nie číslo karty); zapisuje a číta len server
create table if not exists public.trial_cards (
  fingerprint text primary key,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.trial_cards enable row level security;

-- 4) nárok: pribudli členovia rodiny, ponuky zliav a informácia o skúšobnej dobe
create or replace function public.entitlement(p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  s public.subscriptions;
  o public.subscriptions;
  created timestamptz;
  trial_end timestamptz;
  live constant text[] := array['active', 'trialing'];
  extra jsonb;
begin
  if p_uid is null then return jsonb_build_object('on', false, 'premium', false, 'reason', 'anon'); end if;
  if not coalesce((cfg->>'on')::boolean, false) then return jsonb_build_object('on', false, 'premium', true, 'reason', 'off'); end if;
  select * into s from public.subscriptions where user_id = p_uid;
  if s.status = any(live) or (s.status = 'past_due' and s.current_period_end > now() - interval '3 days') then
    return jsonb_build_object('on', true, 'premium', true, 'reason', 'sub', 'plan', s.plan, 'period_end', s.current_period_end, 'cancel', s.cancel_at_period_end,
      'trialing', s.status = 'trialing',
      'seats', coalesce((select (p->>'seats')::int from jsonb_array_elements(cfg->'plans') p where p->>'id' = s.plan), 1));
  end if;
  -- člen Duo alebo Rodiny: Plus, kým má majiteľ aktívne predplatné
  select os.* into o from public.sub_members m join public.subscriptions os on os.user_id = m.owner_id where m.member_id = p_uid;
  if o.user_id is not null and (o.status = any(live) or (o.status = 'past_due' and o.current_period_end > now() - interval '3 days')) then
    return jsonb_build_object('on', true, 'premium', true, 'reason', 'member', 'plan', o.plan,
      'owner', (select name from public.profiles where id = o.user_id));
  end if;
  if exists (select 1 from public.admins where user_id = p_uid) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'admin'); end if;
  if exists (select 1 from public.trainer_profiles where user_id = p_uid and approved) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trainer'); end if;
  select u.created_at into created from auth.users u where u.id = p_uid;
  trial_end := greatest(created, coalesce((cfg->>'launch_at')::timestamptz, created)) + make_interval(days => coalesce((cfg->>'trial_days')::int, 0));
  if trial_end > now() then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trial', 'trial_end', trial_end); end if;
  -- bez Plus: aká ponuka platí (nový zákazník = prvý rok so zľavou + skúšobná doba; po zrušení = zľava na návrat)
  extra := case
    when s.user_id is null or s.status = 'none' then jsonb_build_object('offer', 'first_year', 'trial_offer_days', coalesce((cfg->>'stripe_trial_days')::int, 0))
    when s.status = 'canceled' and s.updated_at < now() - make_interval(days => coalesce((cfg->'offers'->'winback'->>'after_days')::int, 7)) then jsonb_build_object('offer', 'winback', 'trial_offer_days', 0)
    else jsonb_build_object('offer', null, 'trial_offer_days', 0) end;
  return jsonb_build_object('on', true, 'premium', false, 'reason', 'free', 'had_sub', s.status is not null and s.status <> 'none', 'offers', cfg->'offers') || extra;
end $$;
revoke all on function public.entitlement(uuid) from public, anon, authenticated;

-- 5) Duo a Rodina: prehľad, pozvánka, pridanie a odobratie
create or replace function public.family_info()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  s public.subscriptions;
  seats int;
  m public.sub_members;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  select * into s from public.subscriptions where user_id = me;
  seats := coalesce((select (p->>'seats')::int from jsonb_array_elements(cfg->'plans') p where p->>'id' = s.plan), 1);
  if s.user_id is not null and seats > 1 and s.status in ('active', 'trialing', 'past_due') then
    if s.family_code is null then
      update public.subscriptions set family_code = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where user_id = me returning * into s;
    end if;
    return jsonb_build_object('role', 'owner', 'plan', s.plan, 'seats', seats, 'code', s.family_code,
      'members', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by sm.created_at) from public.sub_members sm join public.profiles p on p.id = sm.member_id where sm.owner_id = me), '[]'::jsonb));
  end if;
  select * into m from public.sub_members where member_id = me;
  if m.member_id is not null then
    return jsonb_build_object('role', 'member', 'owner', (select name from public.profiles where id = m.owner_id),
      'plan', (select plan from public.subscriptions where user_id = m.owner_id));
  end if;
  return jsonb_build_object('role', 'none');
end $$;
revoke all on function public.family_info() from public, anon;
grant execute on function public.family_info() to authenticated;

create or replace function public.family_join(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cfg jsonb := coalesce((select value from public.app_config where key = 'billing'), '{}'::jsonb);
  s public.subscriptions;
  seats int;
  used int;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  select * into s from public.subscriptions where family_code = upper(trim(coalesce(p_code, ''))) and status in ('active', 'trialing', 'past_due');
  if s.user_id is null then raise exception 'Tento kód nepoznáme alebo predplatné už neplatí.'; end if;
  if s.user_id = me then raise exception 'Toto je tvoj vlastný kód. Pošli ho človeku, ktorého chceš pozvať.'; end if;
  if exists (select 1 from public.subscriptions where user_id = me and status in ('active', 'trialing')) then raise exception 'Máš vlastné predplatné. Najprv ho zruš, potom sa pridaj.'; end if;
  if exists (select 1 from public.sub_members where member_id = me) then raise exception 'Už si v inom Duo alebo Rodine. Najprv z neho odíď.'; end if;
  seats := coalesce((select (p->>'seats')::int from jsonb_array_elements(cfg->'plans') p where p->>'id' = s.plan), 1);
  select count(*) into used from public.sub_members where owner_id = s.user_id;
  if used + 1 >= seats then raise exception 'Toto predplatné je už plné.'; end if;
  insert into public.sub_members (member_id, owner_id) values (me, s.user_id);
  return jsonb_build_object('ok', true, 'owner', (select name from public.profiles where id = s.user_id));
end $$;
revoke all on function public.family_join(text) from public, anon;
grant execute on function public.family_join(text) to authenticated;

-- majiteľ odoberie člena, alebo člen odíde sám (p_member = null)
create or replace function public.family_remove(p_member uuid default null)
returns void language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  if p_member is null then delete from public.sub_members where member_id = me;
  else delete from public.sub_members where member_id = p_member and owner_id = me; end if;
end $$;
revoke all on function public.family_remove(uuid) from public, anon;
grant execute on function public.family_remove(uuid) to authenticated;

-- nový kód pozvánky (starý prestane platiť; pridaní členovia ostávajú)
create or replace function public.family_new_code()
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); c text;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  update public.subscriptions set family_code = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where user_id = me and family_code is not null returning family_code into c;
  return c;
end $$;
revoke all on function public.family_new_code() from public, anon;
grant execute on function public.family_new_code() to authenticated;

commit;
