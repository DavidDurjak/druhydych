-- Tréneri a koučing na diaľku (trhovisko). Nič z existujúcich tabuliek sa nemení ani neodoberá.
-- Rola profiles.role='coach' (vlastník appky) ostáva ako je. Noví tréneri NIE SÚ 'coach': nevidia všetkých, len klientov, ktorí ich prijali.
-- Vrátenie: drop tabuliek trainer_profiles, trainer_clients a funkcií nižšie, plus politiky "trainer sees client ..." (zoznam na konci).

create table if not exists public.trainer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  headline text check (char_length(headline) <= 90),
  bio text check (char_length(bio) <= 1200),
  city text check (char_length(city) <= 60),
  photo_url text,
  specialties text[] not null default '{}',
  languages text[] not null default '{sk}',
  credentials jsonb not null default '[]'::jsonb,   -- [{title, place, year}] škola, certifikáty
  achievements jsonb not null default '[]'::jsonb,  -- [{title, year}] súťaže, tituly
  experience_years int check (experience_years between 0 and 60),
  online boolean not null default true,
  in_person boolean not null default false,
  price_from numeric(8,2) check (price_from >= 0),
  price_note text check (char_length(price_note) <= 120),
  invite_code text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  status text not null default 'draft' check (status in ('draft','published','hidden')),
  verified boolean not null default false,          -- nastavuje len admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trainer_profiles_status_idx on public.trainer_profiles(status);

create table if not exists public.trainer_clients (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested','invited','active','ended','declined')),
  source text not null default 'catalog' check (source in ('catalog','invite')),   -- 'invite' = klient trénera z vlastnej siete, bez provízie
  client_name text check (char_length(client_name) <= 60),
  client_goal text,
  message text check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  unique (trainer_id, client_id),
  check (trainer_id <> client_id)
);
create index if not exists trainer_clients_client_idx on public.trainer_clients(client_id);

alter table public.trainer_profiles enable row level security;
alter table public.trainer_clients enable row level security;

-- ochrana: overenie a stav schvaľuje len admin
create or replace function public.trainer_profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if not public.is_admin() then new.verified := false; end if;
  else
    if not public.is_admin() then new.verified := old.verified; new.invite_code := old.invite_code; end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists trainer_profiles_guard on public.trainer_profiles;
create trigger trainer_profiles_guard before insert or update on public.trainer_profiles for each row execute function public.trainer_profiles_guard();

-- katalóg vidia prihlásení používatelia (len zverejnené profily); vlastník vidí a upravuje svoj
drop policy if exists "trainer profiles read" on public.trainer_profiles;
create policy "trainer profiles read" on public.trainer_profiles for select to authenticated
  using (status = 'published' or user_id = (select auth.uid()));
drop policy if exists "trainer profiles write own" on public.trainer_profiles;
create policy "trainer profiles write own" on public.trainer_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- vzťahy: vidí ich tréner aj klient; klient žiada, tréner prijíma, ktokoľvek z nich môže skončiť
drop policy if exists "trainer clients read" on public.trainer_clients;
create policy "trainer clients read" on public.trainer_clients for select to authenticated
  using (trainer_id = (select auth.uid()) or client_id = (select auth.uid()));
drop policy if exists "trainer clients request" on public.trainer_clients;
create policy "trainer clients request" on public.trainer_clients for insert to authenticated
  with check (client_id = (select auth.uid()) and status = 'requested');
drop policy if exists "trainer clients update" on public.trainer_clients;
create policy "trainer clients update" on public.trainer_clients for update to authenticated
  using (trainer_id = (select auth.uid()) or client_id = (select auth.uid()))
  with check (trainer_id = (select auth.uid()) or client_id = (select auth.uid()));


-- stavové prechody: tréner nikdy nemôže aktivovať vzťah bez klientovej žiadosti
create or replace function public.trainer_clients_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null or public.is_admin() or current_setting('app.link_by_code', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'requested'; new.accepted_at := null; new.ended_at := null; new.source := 'catalog';
    return new;
  end if;
  new.trainer_id := old.trainer_id; new.client_id := old.client_id; new.source := old.source; new.created_at := old.created_at;
  if new.status = old.status then return new; end if;
  if me = old.trainer_id then
    if old.status = 'requested' and new.status in ('active','declined') then null;
    elsif old.status = 'active' and new.status = 'ended' then null;
    else raise exception 'Tento krok nie je povolený'; end if;
  elsif me = old.client_id then
    if old.status in ('ended','declined') and new.status = 'requested' then null;
    elsif old.status in ('active','requested') and new.status = 'ended' then null;
    else raise exception 'Tento krok nie je povolený'; end if;
  else raise exception 'Tento krok nie je povolený'; end if;
  if new.status = 'active' then new.accepted_at := now(); new.ended_at := null; end if;
  if new.status = 'ended' then new.ended_at := now(); end if;
  return new;
end $$;
drop trigger if exists trainer_clients_guard on public.trainer_clients;
create trigger trainer_clients_guard before insert or update on public.trainer_clients for each row execute function public.trainer_clients_guard();

-- tréner "vidí" klienta len ak je vzťah aktívny (klient súhlasil)
create or replace function public.is_trainer_of(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trainer_clients where trainer_id = auth.uid() and client_id = cid and status = 'active');
$$;

-- klient sa pripojí k trénerovi kódom: okamžite aktívny (súhlas = zadanie kódu), bez provízie
create or replace function public.link_trainer_by_code(code text) returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid; cid uuid := auth.uid();
begin
  if cid is null then raise exception 'Nie si prihlásený'; end if;
  select user_id into tid from public.trainer_profiles where invite_code = upper(trim(code)) and status <> 'hidden';
  if tid is null then raise exception 'Kód sa nenašiel'; end if;
  if tid = cid then raise exception 'Vlastný kód nemôžeš použiť'; end if;
  perform set_config('app.link_by_code', '1', true);
  insert into public.trainer_clients(trainer_id, client_id, status, source, accepted_at, client_name, client_goal)
    select tid, cid, 'active', 'invite', now(), p.name, p.goal from public.profiles p where p.id = cid
  on conflict (trainer_id, client_id) do update set status = 'active', accepted_at = now(), ended_at = null;
  perform set_config('app.link_by_code', '0', true);
  return tid;
end $$;
revoke all on function public.link_trainer_by_code(text) from public, anon;
grant execute on function public.link_trainer_by_code(text) to authenticated;

-- dodatočné čítacie politiky pre trénera (pridávajú sa k existujúcim, nič neprepisujú)
do $$
declare t text; col text;
begin
  for t, col in select * from (values ('food_logs','user_id'),('weight_logs','user_id'),('workout_logs','user_id'),('workout_plans','user_id'),('checkins','user_id'),('profiles','id')) v(t,col)
  loop
    execute format('drop policy if exists "trainer sees client %1$s" on public.%1$I', t);
    execute format('create policy "trainer sees client %1$s" on public.%1$I for select to authenticated using (public.is_trainer_of(%2$I))', t, col);
  end loop;
end $$;
-- správy medzi trénerom a klientom
drop policy if exists "msg trainer link send" on public.messages;
create policy "msg trainer link send" on public.messages for insert to authenticated
  with check (from_user = (select auth.uid()) and exists (
    select 1 from public.trainer_clients tc where tc.status = 'active'
      and ((tc.trainer_id = messages.from_user and tc.client_id = messages.to_user) or (tc.client_id = messages.from_user and tc.trainer_id = messages.to_user))));
-- Vrátenie politík: drop policy "trainer sees client food_logs|weight_logs|workout_logs|workout_plans|checkins|profiles", "msg trainer link send".

-- fotky trénerov: verejné čítanie, zápis len do vlastného priečinka
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('trainer-photos', 'trainer-photos', true, 2097152, array['image/jpeg','image/png','image/webp'])
  on conflict (id) do nothing;
drop policy if exists "trainer photos write own" on storage.objects;
create policy "trainer photos write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'trainer-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "trainer photos update own" on storage.objects;
create policy "trainer photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'trainer-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "trainer photos delete own" on storage.objects;
create policy "trainer photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'trainer-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
