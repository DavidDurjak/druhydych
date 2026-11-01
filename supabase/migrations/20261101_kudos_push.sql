-- GainTrain: notifikácia „Daniel ťa pochválil“ (v310).
-- Keď niekto prvýkrát pochváli tvoj tréning, príde ti push (ak máš notifikácie zapnuté v Pripomienkach a nevypol si „Pochvaly od kamarátov“).
-- Ochrana pred spamom: najviac jedna notifikácia o pochvale za 10 minút na človeka; zrušenie a nové pochválenie toho istého tréningu nič nepošle.

begin;

alter table public.reminder_settings add column if not exists friends_on boolean not null default true;

create table if not exists public.kudos_sent (
  log_id bigint not null references public.workout_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (log_id, user_id)
);
alter table public.kudos_sent enable row level security; -- len pre server: kto už za daný tréning raz notifikáciu vyvolal

create or replace function public.give_kudos(p_log bigint, p_on boolean default true)
returns json language plpgsql volatile security definer set search_path = public, vault as $$
declare me uuid := auth.uid(); owner uuid; shares boolean; n int; added int := 0; first_time int := 0;
  my_name text; my_sex text; day text; wants boolean;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  select w.user_id, p.share_workouts, w.day_name into owner, shares, day from workout_logs w join profiles p on p.id = w.user_id where w.id = p_log and w.done;
  if owner is null or owner = me or shares is not true or not public.are_friends(me, owner) then raise exception 'Tento tréning nemôžeš pochváliť.'; end if;
  if p_on then
    insert into workout_kudos (log_id, user_id) values (p_log, me) on conflict do nothing;
    get diagnostics added = row_count;
  else
    delete from workout_kudos where log_id = p_log and user_id = me;
  end if;
  select count(*) into n from workout_kudos where log_id = p_log;

  if added > 0 then
    insert into kudos_sent (log_id, user_id) values (p_log, me) on conflict do nothing;
    get diagnostics first_time = row_count;
  end if;
  if first_time > 0 then
    select coalesce(rs.enabled, true) and coalesce(rs.friends_on, true) into wants from (select 1) x left join reminder_settings rs on rs.user_id = owner;
    if wants and exists (select 1 from push_subscriptions where user_id = owner)
       and not exists (select 1 from push_queue where user_id = owner and tag = 'kudos' and created_at > now() - interval '10 minutes') then
      select split_part(coalesce(nullif(trim(name), ''), 'Kamarát'), ' ', 1), sex into my_name, my_sex from profiles where id = me;
      insert into push_queue (user_id, title, body, url, tag) values (
        owner,
        '💪 ' || my_name || case when my_sex = 'f' then ' ťa pochválila' else ' ťa pochválil' end,
        'Za tréning ' || coalesce(nullif(day, ''), 'z tohto týždňa') || '. Pozri, čo trénujú kamaráti.',
        '#/kamarati', 'kudos');
      begin
        perform net.http_post(
          url := 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/send-push',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
          body := '{}'::jsonb, timeout_milliseconds := 30000);
      exception when others then null; -- odošle ju aj pravidelný cron do 5 minút
      end;
    end if;
  end if;
  return json_build_object('kudos', n, 'mine', p_on);
end $$;
revoke all on function public.give_kudos(bigint, boolean) from public, anon;
grant execute on function public.give_kudos(bigint, boolean) to authenticated;

commit;
