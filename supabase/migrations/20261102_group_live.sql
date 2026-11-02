-- GainTrain: skupinové živé tréningy (v320).
-- Schválený tréner naplánuje tréning naživo (názov, čas, dĺžka, kapacita až 50), pozve vybraných alebo všetkých aktívnych klientov.
-- Klient dostane notifikáciu a správu s pozvánkou, potvrdí Idem / Nejdem a 15 minút pred začiatkom sa pripojí cez Daily (edge funkcia gs-room).
-- Pripomienka 10 minút pred začiatkom chodí cronom každú minútu. Do miestnosti pustí server len trénera a pozvaných klientov s aktívnou spoluprácou.

begin;

create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  note text check (char_length(note) <= 400),
  kind text not null default 'other' check (kind in ('hiit', 'strength', 'mobility', 'yoga', 'core', 'cardio', 'other')),
  starts_at timestamptz not null,
  duration_min int not null default 45 check (duration_min between 15 and 180),
  capacity int not null default 20 check (capacity between 2 and 50),
  status text not null default 'scheduled' check (status in ('scheduled', 'canceled')),
  series uuid,
  reminded boolean not null default false,
  started_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists group_sessions_trainer on public.group_sessions (trainer_id, starts_at);
create index if not exists group_sessions_remind on public.group_sessions (starts_at) where status = 'scheduled' and not reminded;

create table if not exists public.group_invites (
  session_id uuid not null references public.group_sessions (id) on delete cascade,
  client_id uuid not null references auth.users (id) on delete cascade,
  rsvp text not null default 'invited' check (rsvp in ('invited', 'going', 'declined')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (session_id, client_id)
);
create index if not exists group_invites_client on public.group_invites (client_id);

alter table public.group_sessions enable row level security;
alter table public.group_invites enable row level security;
-- čítanie: tréner svoje, klient tie, na ktoré je pozvaný (pomocné funkcie bránia zacykleniu pravidiel); zápis len cez funkcie nižšie
create or replace function public.gs_invited(p_session uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_invites where session_id = p_session and client_id = auth.uid())
$$;
create or replace function public.gs_owns(p_session uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_sessions where id = p_session and trainer_id = auth.uid())
$$;
revoke all on function public.gs_invited(uuid) from public, anon;
revoke all on function public.gs_owns(uuid) from public, anon;
grant execute on function public.gs_invited(uuid) to authenticated;
grant execute on function public.gs_owns(uuid) to authenticated;
drop policy if exists gs_read on public.group_sessions;
create policy gs_read on public.group_sessions for select to authenticated using (trainer_id = auth.uid() or public.gs_invited(id));
drop policy if exists gi_read on public.group_invites;
create policy gi_read on public.group_invites for select to authenticated using (client_id = auth.uid() or public.gs_owns(session_id));
revoke insert, update, delete on public.group_sessions, public.group_invites from anon, authenticated;

-- „pondelok 3. 11. o 18:00“ v slovenskom čase
create or replace function public.gs_when(t timestamptz) returns text language sql immutable set search_path = public as $$
  select (array['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota'])[extract(dow from t at time zone 'Europe/Bratislava')::int + 1]
    || ' ' || extract(day from t at time zone 'Europe/Bratislava')::int || '. ' || extract(month from t at time zone 'Europe/Bratislava')::int || '. o '
    || to_char(t at time zone 'Europe/Bratislava', 'HH24:MI')
$$;

-- odošle frontu notifikácií hneď (inak ju pošle cron do 5 minút)
create or replace function public.gs_flush_push() returns void language plpgsql volatile security definer set search_path = public, vault as $$
begin
  perform net.http_post(
    url := 'https://uxzwqyjbzkcveoxsdqdv.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 30000);
exception when others then null;
end $$;
revoke all on function public.gs_flush_push() from public, anon, authenticated;

create or replace function public.gs_is_trainer(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from trainer_profiles where user_id = u and approved)
$$;
revoke all on function public.gs_is_trainer(uuid) from public, anon;

-- pozvánka: správa v chate + notifikácia (ak má zapnuté notifikácie)
create or replace function public.gs_notify(p_session uuid, p_clients uuid[], p_kind text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare s record; tname text; c uuid; ttl text; bdy text; msg text;
begin
  select * into s from group_sessions where id = p_session;
  select coalesce(nullif(trim(display_name), ''), 'Tvoj tréner') into tname from trainer_profiles where user_id = s.trainer_id;
  tname := coalesce(tname, 'Tvoj tréner');
  if p_kind = 'invite' then
    ttl := '🎥 ' || split_part(tname, ' ', 1) || ' ťa pozýva na tréning naživo';
    bdy := s.title || ', ' || gs_when(s.starts_at) || '. Klikni a daj vedieť, či prídeš.';
    msg := '🎥 Pozvánka na tréning naživo: ' || s.title || E'\n' || upper(left(gs_when(s.starts_at), 1)) || substr(gs_when(s.starts_at), 2) || ', ' || s.duration_min || ' min' || E'\n#/zive/' || s.id;
  elsif p_kind = 'moved' then
    ttl := '🕒 Tréning naživo má nový čas';
    bdy := s.title || ' je teraz ' || gs_when(s.starts_at) || '.';
    msg := '🕒 Zmena času: ' || s.title || ' je teraz ' || gs_when(s.starts_at) || E'.\n#/zive/' || s.id;
  elsif p_kind = 'cancel' then
    ttl := '❌ Tréning naživo je zrušený';
    bdy := s.title || ' (' || gs_when(s.starts_at) || ') sa nekoná.';
    msg := '❌ Ruším tréning naživo ' || s.title || ' (' || gs_when(s.starts_at) || '). Prepáč, dám vedieť nový termín.';
  else
    return;
  end if;
  foreach c in array coalesce(p_clients, '{}') loop
    insert into messages (from_user, to_user, body) values (s.trainer_id, c, msg);
    if coalesce((select enabled from reminder_settings where user_id = c), true) and exists (select 1 from push_subscriptions where user_id = c) then
      insert into push_queue (user_id, title, body, url, tag) values (c, ttl, bdy, '#/zive/' || s.id, 'gs-' || s.id);
    end if;
  end loop;
end $$;
revoke all on function public.gs_notify(uuid, uuid[], text) from public, anon, authenticated;

-- naplánovanie (p_weeks > 1 = rovnaký tréning každý týždeň)
create or replace function public.gs_create(p_title text, p_starts timestamptz, p_duration int default 45, p_capacity int default 20,
  p_clients uuid[] default null, p_note text default null, p_kind text default 'other', p_weeks int default 1)
returns json language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); ids uuid[]; sid uuid; first_id uuid; ser uuid := null; w int;
begin
  if me is null then raise exception 'Prihlás sa znova.'; end if;
  if not gs_is_trainer(me) then raise exception 'Tréningy naživo môže plánovať len schválený tréner.'; end if;
  p_title := trim(coalesce(p_title, ''));
  if char_length(p_title) < 2 then raise exception 'Daj tréningu názov.'; end if;
  if p_starts is null or p_starts < now() - interval '5 minutes' then raise exception 'Vyber čas v budúcnosti.'; end if;
  if p_starts > now() + interval '90 days' then raise exception 'Naplánovať sa dá najviac 90 dní dopredu.'; end if;
  p_weeks := least(greatest(coalesce(p_weeks, 1), 1), 12);
  if (select count(*) from group_sessions where trainer_id = me and status = 'scheduled' and starts_at > now()) + p_weeks > 60 then
    raise exception 'Máš naplánovaných priveľa tréningov. Niektoré najprv zruš.';
  end if;
  select coalesce(array_agg(distinct client_id), '{}') into ids from trainer_clients
    where trainer_id = me and status = 'active' and (p_clients is null or client_id = any (p_clients));
  if cardinality(ids) = 0 then raise exception 'Vyber aspoň jedného klienta.'; end if;
  if p_weeks > 1 then ser := gen_random_uuid(); end if;
  for w in 0 .. p_weeks - 1 loop
    insert into group_sessions (trainer_id, title, note, kind, starts_at, duration_min, capacity, series)
      values (me, left(p_title, 60), nullif(left(trim(coalesce(p_note, '')), 400), ''), coalesce(nullif(p_kind, ''), 'other'),
              p_starts + make_interval(weeks => w), least(greatest(coalesce(p_duration, 45), 15), 180), least(greatest(coalesce(p_capacity, 20), 2), 50), ser)
      returning id into sid;
    insert into group_invites (session_id, client_id) select sid, unnest(ids);
    if w = 0 then first_id := sid; end if;
  end loop;
  perform gs_notify(first_id, ids, 'invite'); -- pri sérii jedna pozvánka, ďalšie termíny klient vidí v appke
  perform gs_flush_push();
  return json_build_object('id', first_id, 'invited', cardinality(ids), 'weeks', p_weeks);
end $$;

-- dopozvanie ďalších klientov
create or replace function public.gs_invite(p_session uuid, p_clients uuid[]) returns json
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); ids uuid[];
begin
  if not exists (select 1 from group_sessions where id = p_session and trainer_id = me and status = 'scheduled' and starts_at + make_interval(mins => duration_min) > now()) then
    raise exception 'Tento tréning už nemôžeš upraviť.'; end if;
  with ins as (
    insert into group_invites (session_id, client_id)
    select p_session, client_id from trainer_clients where trainer_id = me and status = 'active' and client_id = any (coalesce(p_clients, '{}'))
    on conflict do nothing returning client_id)
  select coalesce(array_agg(client_id), '{}') into ids from ins;
  perform gs_notify(p_session, ids, 'invite');
  perform gs_flush_push();
  return json_build_object('invited', cardinality(ids));
end $$;

-- úprava (názov, popis, čas, dĺžka, kapacita); pri zmene času dostanú pozvaní správu
create or replace function public.gs_update(p_session uuid, p_title text, p_starts timestamptz, p_duration int, p_capacity int, p_note text default null)
returns json language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); s record; ids uuid[]; going int;
begin
  select * into s from group_sessions where id = p_session and trainer_id = me and status = 'scheduled';
  if s.id is null or s.starts_at + make_interval(mins => s.duration_min) < now() then raise exception 'Tento tréning už nemôžeš upraviť.'; end if;
  if char_length(trim(coalesce(p_title, ''))) < 2 then raise exception 'Daj tréningu názov.'; end if;
  if p_starts is distinct from s.starts_at and (p_starts < now() - interval '5 minutes' or p_starts > now() + interval '90 days') then raise exception 'Vyber čas v budúcnosti.'; end if;
  select count(*) into going from group_invites where session_id = p_session and rsvp = 'going';
  if coalesce(p_capacity, s.capacity) < going then raise exception 'Prihlásených je už %. Kapacita nemôže byť menšia.', going; end if;
  update group_sessions set title = left(trim(p_title), 60), note = nullif(left(trim(coalesce(p_note, '')), 400), ''),
    starts_at = coalesce(p_starts, starts_at), duration_min = least(greatest(coalesce(p_duration, duration_min), 15), 180),
    capacity = least(greatest(coalesce(p_capacity, capacity), 2), 50),
    reminded = case when p_starts is distinct from s.starts_at then false else reminded end
  where id = p_session;
  if p_starts is distinct from s.starts_at then
    select coalesce(array_agg(client_id), '{}') into ids from group_invites where session_id = p_session and rsvp <> 'declined';
    perform gs_notify(p_session, ids, 'moved');
    perform gs_flush_push();
  end if;
  return json_build_object('ok', true);
end $$;

create or replace function public.gs_cancel(p_session uuid) returns json
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); ids uuid[];
begin
  update group_sessions set status = 'canceled' where id = p_session and trainer_id = me and status = 'scheduled' and starts_at + make_interval(mins => duration_min) > now();
  if not found then raise exception 'Tento tréning už nemôžeš zrušiť.'; end if;
  select coalesce(array_agg(client_id), '{}') into ids from group_invites where session_id = p_session and rsvp <> 'declined';
  perform gs_notify(p_session, ids, 'cancel');
  perform gs_flush_push();
  return json_build_object('ok', true);
end $$;

-- klient: Idem / Nejdem
create or replace function public.gs_rsvp(p_session uuid, p_going boolean) returns json
language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); s record; going int;
begin
  select g.* into s from group_sessions g join group_invites i on i.session_id = g.id and i.client_id = me where g.id = p_session;
  if s.id is null then raise exception 'Na tento tréning nie si pozvaný.'; end if;
  if s.status <> 'scheduled' then raise exception 'Tréning je zrušený.'; end if;
  if s.starts_at + make_interval(mins => s.duration_min) < now() then raise exception 'Tréning už skončil.'; end if;
  if p_going then
    perform 1 from group_sessions where id = p_session for update; -- naraz sa neprihlási viac ľudí, než je miest
    select count(*) into going from group_invites where session_id = p_session and rsvp = 'going' and client_id <> me;
    if going >= s.capacity then raise exception 'Tréning je plný.'; end if;
  end if;
  update group_invites set rsvp = case when p_going then 'going' else 'declined' end where session_id = p_session and client_id = me;
  select count(*) into going from group_invites where session_id = p_session and rsvp = 'going';
  return json_build_object('rsvp', case when p_going then 'going' else 'declined' end, 'going', going);
end $$;

-- zoznam: tréner svoje tréningy (aj s pozvanými), klient svoje pozvánky; od včera do budúcnosti
create or replace function public.gs_list(p_session uuid default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return '[]'::json; end if;
  return coalesce((
    select json_agg(x order by x.starts_at) from (
      select s.id, s.title, s.note, s.kind, s.starts_at, s.duration_min, s.capacity, s.status, s.series, s.started_at,
        s.trainer_id = me as mine,
        s.trainer_id,
        coalesce(tp.display_name, 'Tréner') as trainer_name, tp.photo_url as trainer_photo,
        (select rsvp from group_invites where session_id = s.id and client_id = me) as my_rsvp,
        (select count(*) from group_invites where session_id = s.id and rsvp = 'going') as going,
        (select count(*) from group_invites where session_id = s.id) as invited,
        -- ľudia: tréner vidí všetkých so stavom, klient len tých, čo idú (meno a avatar)
        (select coalesce(json_agg(json_build_object('id', i.client_id, 'name', coalesce(nullif(tc.client_name, ''), nullif(p.name, ''), 'Klient'), 'avatar', p.avatar_url,
            'rsvp', case when s.trainer_id = me then i.rsvp else null end, 'joined', i.joined_at is not null) order by (i.rsvp = 'going') desc, coalesce(tc.client_name, p.name)), '[]'::json)
          from group_invites i left join profiles p on p.id = i.client_id
          left join trainer_clients tc on tc.trainer_id = s.trainer_id and tc.client_id = i.client_id and tc.status = 'active'
          where i.session_id = s.id and (s.trainer_id = me or i.rsvp = 'going')) as people
      from group_sessions s left join trainer_profiles tp on tp.user_id = s.trainer_id
      where (s.trainer_id = me or exists (select 1 from group_invites i where i.session_id = s.id and i.client_id = me))
        and (case when p_session is not null then s.id = p_session
                  else s.starts_at + make_interval(mins => s.duration_min) > now() - interval '7 days' and (s.status = 'scheduled' or s.starts_at > now() - interval '1 day') end)
      order by s.starts_at limit 80
    ) x), '[]'::json);
end $$;

-- pripomienka 10 minút pred začiatkom (cron každú minútu)
create or replace function public.gs_remind() returns void
language plpgsql volatile security definer set search_path = public as $$
declare s record; n int := 0;
begin
  for s in select g.*, coalesce(tp.display_name, 'Tréner') tname from group_sessions g left join trainer_profiles tp on tp.user_id = g.trainer_id
           where g.status = 'scheduled' and not g.reminded and g.starts_at between now() and now() + interval '11 minutes' for update of g skip locked loop
    update group_sessions set reminded = true where id = s.id;
    insert into push_queue (user_id, title, body, url, tag)
    select i.client_id, '🔴 ' || s.title || ' začína o pár minút', split_part(s.tname, ' ', 1) || ' čoskoro začne. Klikni a pripoj sa.', '#/zive/' || s.id, 'gs-' || s.id
    from group_invites i where i.session_id = s.id and i.rsvp <> 'declined'
      and coalesce((select enabled from reminder_settings where user_id = i.client_id), true)
      and exists (select 1 from push_subscriptions where user_id = i.client_id);
    insert into push_queue (user_id, title, body, url, tag)
    select s.trainer_id, '🎬 Tvoj tréning naživo začína o pár minút', s.title || ': prihlásených ' || (select count(*) from group_invites where session_id = s.id and rsvp = 'going') || '. Klikni a spusti ho.', '#/zive/' || s.id, 'gs-' || s.id
    where exists (select 1 from push_subscriptions where user_id = s.trainer_id);
    n := n + 1;
  end loop;
  if n > 0 then perform gs_flush_push(); end if;
end $$;
revoke all on function public.gs_remind() from public, anon, authenticated;

revoke all on function public.gs_create(text, timestamptz, int, int, uuid[], text, text, int) from public, anon;
revoke all on function public.gs_invite(uuid, uuid[]) from public, anon;
revoke all on function public.gs_update(uuid, text, timestamptz, int, int, text) from public, anon;
revoke all on function public.gs_cancel(uuid) from public, anon;
revoke all on function public.gs_rsvp(uuid, boolean) from public, anon;
revoke all on function public.gs_list(uuid) from public, anon;
grant execute on function public.gs_create(text, timestamptz, int, int, uuid[], text, text, int) to authenticated;
grant execute on function public.gs_invite(uuid, uuid[]) to authenticated;
grant execute on function public.gs_update(uuid, text, timestamptz, int, int, text) to authenticated;
grant execute on function public.gs_cancel(uuid) to authenticated;
grant execute on function public.gs_rsvp(uuid, boolean) to authenticated;
grant execute on function public.gs_list(uuid) to authenticated;

do $$ begin
  perform cron.unschedule('group-live-remind') where exists (select 1 from cron.job where jobname = 'group-live-remind');
  perform cron.schedule('group-live-remind', '* * * * *', $c$select public.gs_remind()$c$);
end $$;

commit;
