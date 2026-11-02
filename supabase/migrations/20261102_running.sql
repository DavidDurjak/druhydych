-- GainTrain: beh (v321). Behy s GPS trasou, bežecké trasy (vlastné aj zverejnené od iných), bežecké ciele a program Od gauča k 5 km.
-- Súkromie: zverejnená trasa sa ukladá bez prvých a posledných ~200 m (nikto nezistí, kde človek býva) a len keď ju autor sám zverejní.
-- Trasy v okolí hľadá funkcia run_routes_near podľa vzdialenosti štartu (bez rozšírenia PostGIS).

begin;

create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'outdoor' check (kind in ('outdoor', 'treadmill', 'track', 'runwalk', 'walk')),
  source text not null default 'app' check (source in ('app', 'manual', 'watch')),
  started_at timestamptz not null,
  duration_s int not null check (duration_s between 1 and 86400),
  elapsed_s int,
  distance_m numeric(9, 1) not null default 0 check (distance_m between 0 and 400000),
  elev_gain_m numeric(7, 1),
  kcal int,
  path jsonb,          -- [[lat, lng, sekunda od štartu], ...] zjednodušená trasa
  splits jsonb,        -- [{km, s}] čas každého kilometra
  laps jsonb,          -- kolá alebo intervaly [{n, s, m, type}]
  best jsonb,          -- najlepšie úseky v behu {"1000": s, "5000": s, ...}
  meta jsonb,          -- napr. sklon pásu, nastavenie intervalov, deň programu
  title text check (char_length(title) <= 80),
  note text check (char_length(note) <= 500),
  route_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists runs_user on public.runs (user_id, started_at desc);

create table if not exists public.run_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  distance_m numeric(9, 1) not null check (distance_m between 200 and 200000),
  path jsonb not null,             -- [[lat, lng], ...]
  start_lat double precision not null,
  start_lng double precision not null,
  place text check (char_length(place) <= 60),
  surface text check (surface in ('road', 'trail', 'park', 'track', 'mixed')),
  public boolean not null default false,
  from_run uuid references public.runs (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists run_routes_geo on public.run_routes (start_lat, start_lng) where public;
create index if not exists run_routes_user on public.run_routes (user_id);
alter table public.runs drop constraint if exists runs_route_fk;
alter table public.runs add constraint runs_route_fk foreign key (route_id) references public.run_routes (id) on delete set null;

create table if not exists public.run_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('week_km', 'month_km', 'week_runs', 'pr_5k', 'pr_10k', 'long_run')),
  target numeric not null check (target > 0 and target < 100000),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table if not exists public.run_program (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'c25k',
  done jsonb not null default '[]'::jsonb,  -- ["1-1", "1-2", ...] týždeň-deň
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.runs enable row level security;
alter table public.run_routes enable row level security;
alter table public.run_goals enable row level security;
alter table public.run_program enable row level security;

drop policy if exists runs_own on public.runs;
create policy runs_own on public.runs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists goals_own on public.run_goals;
create policy goals_own on public.run_goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists prog_own on public.run_program;
create policy prog_own on public.run_program for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- trasy: svoje všetky, cudzie len zverejnené; zapisovať len svoje
drop policy if exists routes_read on public.run_routes;
create policy routes_read on public.run_routes for select to authenticated using (user_id = auth.uid() or public);
drop policy if exists routes_write on public.run_routes;
create policy routes_write on public.run_routes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists routes_upd on public.run_routes;
create policy routes_upd on public.run_routes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists routes_del on public.run_routes;
create policy routes_del on public.run_routes for delete to authenticated using (user_id = auth.uid());
revoke all on public.runs, public.run_routes, public.run_goals, public.run_program from anon;

-- trasy v okolí: zverejnené (aj svoje) do p_km od bodu, s krstným menom autora a počtom behov po trase
create or replace function public.run_routes_near(p_lat double precision, p_lng double precision, p_km double precision default 15)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.km), '[]'::json) from (
    select r.id, r.name, r.distance_m, r.path, r.place, r.surface, r.start_lat, r.start_lng, r.user_id = auth.uid() as mine,
      split_part(coalesce(nullif(trim(p.name), ''), 'Bežec'), ' ', 1) as author,
      (select count(*) from runs where route_id = r.id) as runs,
      round((6371 * 2 * asin(sqrt(power(sin(radians(r.start_lat - p_lat) / 2), 2) + cos(radians(p_lat)) * cos(radians(r.start_lat)) * power(sin(radians(r.start_lng - p_lng) / 2), 2))))::numeric, 1) as km
    from run_routes r left join profiles p on p.id = r.user_id
    where r.public and auth.uid() is not null
      and r.start_lat between p_lat - least(p_km, 50) / 111.0 and p_lat + least(p_km, 50) / 111.0
      and r.start_lng between p_lng - least(p_km, 50) / (111.0 * greatest(cos(radians(p_lat)), 0.2)) and p_lng + least(p_km, 50) / (111.0 * greatest(cos(radians(p_lat)), 0.2))
    limit 60
  ) x where x.km <= least(p_km, 50)
$$;
revoke all on function public.run_routes_near(double precision, double precision, double precision) from public, anon;
grant execute on function public.run_routes_near(double precision, double precision, double precision) to authenticated;

commit;
