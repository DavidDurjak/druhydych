-- GainTrain: pohyb (v328). Zápis športu a aktivít so spálenými kalóriami (MET × hmotnosť × čas). Behy sú v tabuľke runs.
begin;
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  act text not null check (char_length(act) <= 40),
  name text not null check (char_length(name) <= 80),
  met numeric(4, 1) not null check (met between 1 and 20),
  minutes int not null check (minutes between 1 and 900),
  kcal int not null check (kcal between 0 and 10000),
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_user_date on public.activity_logs (user_id, date);
alter table public.activity_logs enable row level security;
drop policy if exists activity_own on public.activity_logs;
create policy activity_own on public.activity_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.activity_logs from anon;
commit;
