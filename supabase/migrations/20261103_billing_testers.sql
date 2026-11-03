-- Testerský režim: platby vidia a môžu skúšať len používatelia z app_config.billing.testers (pole user id), aj keď je billing.on = false.
-- Tester sa správa ako bežný zákazník (bez admin/tréner/skúšobných výnimiek).
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
  tester boolean;
begin
  if p_uid is null then return jsonb_build_object('on', false, 'premium', false, 'reason', 'anon'); end if;
  tester := coalesce(cfg->'testers', '[]'::jsonb) ? p_uid::text;
  if not coalesce((cfg->>'on')::boolean, false) and not tester then return jsonb_build_object('on', false, 'premium', true, 'reason', 'off'); end if;
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
  if not tester and exists (select 1 from public.admins where user_id = p_uid) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'admin'); end if;
  if not tester and exists (select 1 from public.trainer_profiles where user_id = p_uid and approved) then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trainer'); end if;
  select u.created_at into created from auth.users u where u.id = p_uid;
  trial_end := greatest(created, coalesce((cfg->>'launch_at')::timestamptz, created)) + make_interval(days => coalesce((cfg->>'trial_days')::int, 0));
  if not tester and trial_end > now() then return jsonb_build_object('on', true, 'premium', true, 'reason', 'trial', 'trial_end', trial_end); end if;
  -- bez Plus: aká ponuka platí (nový zákazník = prvý rok so zľavou + skúšobná doba; po zrušení = zľava na návrat)
  extra := case
    when s.user_id is null or s.status = 'none' then jsonb_build_object('offer', 'first_year', 'trial_offer_days', coalesce((cfg->>'stripe_trial_days')::int, 0))
    when s.status = 'canceled' and s.updated_at < now() - make_interval(days => coalesce((cfg->'offers'->'winback'->>'after_days')::int, 7)) then jsonb_build_object('offer', 'winback', 'trial_offer_days', 0)
    else jsonb_build_object('offer', null, 'trial_offer_days', 0) end;
  return jsonb_build_object('on', true, 'premium', false, 'reason', 'free', 'had_sub', s.status is not null and s.status <> 'none', 'offers', cfg->'offers') || extra;
end $$;
revoke all on function public.entitlement(uuid) from public, anon, authenticated;
update public.app_config set value = jsonb_set(value, '{testers}', '["2ce32349-71b0-408c-aac4-48ba9c491dc5"]'::jsonb, true) where key = 'billing';
