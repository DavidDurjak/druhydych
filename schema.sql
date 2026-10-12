-- Druhý dych: databázová schéma (Supabase / Postgres)
-- Už aplikované na projekte druhydych (12. 10. 2026). Tu je pre dokumentáciu a prípadnú obnovu.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'participant' check (role in ('participant','coach')),
  sex text check (sex in ('m','f')),
  birth_year int,
  height_cm numeric,
  start_weight numeric,
  goal text check (goal in ('lose','maintain','gain')),
  activity text check (activity in ('low','light','moderate','high')),
  training_days int default 3,
  target_kcal int,
  target_protein int,
  target_carbs int,
  target_fat int,
  start_date date default current_date,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  weight_kg numeric not null,
  waist_cm numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.food_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  meal text not null default 'snack' check (meal in ('breakfast','lunch','dinner','snack')),
  name text not null,
  brand text,
  grams numeric not null default 100,
  kcal numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  source text default 'manual',
  barcode text,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date on public.food_logs(user_id, date);

create table if not exists public.checkins (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  sleep_h numeric,
  steps int,
  mood int check (mood between 1 and 5),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Automatické vytvorenie profilu po registrácii
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Je prihlásený používateľ kouč?
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coach');
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.is_coach() from anon, public;

-- Zabezpečenie: každý vidí len svoje dáta, kouč vidí všetkých
alter table public.profiles    enable row level security;
alter table public.weight_logs enable row level security;
alter table public.food_logs   enable row level security;
alter table public.checkins    enable row level security;

create policy "profiles own or coach" on public.profiles for select using (id = auth.uid() or public.is_coach());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
create policy "weight own or coach" on public.weight_logs for select using (user_id = auth.uid() or public.is_coach());
create policy "weight write own" on public.weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "food own or coach" on public.food_logs for select using (user_id = auth.uid() or public.is_coach());
create policy "food write own" on public.food_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "checkins own or coach" on public.checkins for select using (user_id = auth.uid() or public.is_coach());
create policy "checkins write own" on public.checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Koučovia (po ich registrácii):
-- update public.profiles set role = 'coach' where email in ('tvoj@email.sk', 'spoluziak@email.sk');
