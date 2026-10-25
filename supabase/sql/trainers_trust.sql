-- Dôvera v trhovisku trénerov: bez ručného schvaľovania. Všetko beží automaticky.
-- 1) Zverejniť sa dá len kompletný profil (fotka, popis, špecializácia) bez odkazov, e-mailov a telefónov.
-- 2) Hodnotenia píšu len klienti, ktorí s trénerom reálne spolupracovali aspoň 7 dní.
-- 3) Nahlásenia: 3 rôzni ľudia a profil sa sám skryje (do kontroly vlastníkom appky).
-- 4) Limit 5 žiadostí o koučing za 24 hodín na klienta.
-- Vrátenie: drop tabuliek trainer_reviews, trainer_reports, funkcie trainer_stats, triggerov nižšie a stĺpca auto_hidden (guard funkciu vrátiť zo súboru trainers.sql).

alter table public.trainer_profiles add column if not exists auto_hidden boolean not null default false;

create or replace function public.trainer_profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare bad text := '(https?://|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\+?\d(?:[\s.-]?\d){8,})';
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.auto_hidden := false;
  else
    new.verified := old.verified; new.invite_code := old.invite_code; new.auto_hidden := old.auto_hidden;
    new.updated_at := now();
  end if;
  if coalesce(new.headline,'') ~* bad or coalesce(new.bio,'') ~* bad or coalesce(new.price_note,'') ~* bad then
    raise exception 'V popise nepoužívaj odkazy, e-maily ani telefónne čísla. Klienti ťa kontaktujú cez appku.';
  end if;
  if new.status = 'published' then
    if tg_op = 'UPDATE' and old.auto_hidden then
      raise exception 'Tvoj profil je dočasne pozastavený po nahlásení. Napíš nám a pozrieme sa na to.';
    end if;
    if new.photo_url is null then raise exception 'Pred zverejnením nahraj svoju fotku'; end if;
    if char_length(coalesce(new.headline,'')) < 8 then raise exception 'Pred zverejnením dopíš krátky popis (aspoň 8 znakov)'; end if;
    if char_length(coalesce(new.bio,'')) < 40 then raise exception 'Pred zverejnením napíš o sebe aspoň 40 znakov'; end if;
    if coalesce(array_length(new.specialties,1),0) < 1 then raise exception 'Pred zverejnením vyber aspoň jednu špecializáciu'; end if;
  end if;
  return new;
end $$;

-- hodnotenia
create table if not exists public.trainer_reviews (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (char_length(body) <= 500),
  client_name text check (char_length(client_name) <= 60),
  created_at timestamptz not null default now(),
  unique (trainer_id, client_id)
);
alter table public.trainer_reviews enable row level security;
drop policy if exists "reviews read" on public.trainer_reviews;
create policy "reviews read" on public.trainer_reviews for select to authenticated using (true);
drop policy if exists "reviews write" on public.trainer_reviews;
create policy "reviews write" on public.trainer_reviews for insert to authenticated
  with check (client_id = (select auth.uid()) and exists (
    select 1 from public.trainer_clients tc where tc.trainer_id = trainer_reviews.trainer_id and tc.client_id = (select auth.uid())
      and tc.accepted_at is not null and tc.accepted_at <= now() - interval '7 days'));
drop policy if exists "reviews edit own" on public.trainer_reviews;
create policy "reviews edit own" on public.trainer_reviews for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
drop policy if exists "reviews delete own" on public.trainer_reviews;
create policy "reviews delete own" on public.trainer_reviews for delete to authenticated using (client_id = (select auth.uid()));

-- nahlásenia
create table if not exists public.trainer_reports (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainer_profiles(user_id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake','spam','unsafe','other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (trainer_id, reporter_id),
  check (trainer_id <> reporter_id)
);
alter table public.trainer_reports enable row level security;
drop policy if exists "reports insert" on public.trainer_reports;
create policy "reports insert" on public.trainer_reports for insert to authenticated with check (reporter_id = (select auth.uid()));
drop policy if exists "reports read own" on public.trainer_reports;
create policy "reports read own" on public.trainer_reports for select to authenticated using (reporter_id = (select auth.uid()));

create or replace function public.trainer_reports_after() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.trainer_reports where trainer_id = new.trainer_id) >= 3 then
    update public.trainer_profiles set status = 'hidden', auto_hidden = true where user_id = new.trainer_id and not auto_hidden;
  end if;
  return new;
end $$;
drop trigger if exists trainer_reports_after on public.trainer_reports;
create trigger trainer_reports_after after insert on public.trainer_reports for each row execute function public.trainer_reports_after();

-- limit žiadostí
create or replace function public.trainer_requests_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() and current_setting('app.link_by_code', true) is distinct from '1'
     and (select count(*) from public.trainer_clients where client_id = new.client_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Dnes si poslal veľa žiadostí. Skús to zajtra.';
  end if;
  return new;
end $$;
drop trigger if exists trainer_requests_limit on public.trainer_clients;
create trigger trainer_requests_limit before insert on public.trainer_clients for each row execute function public.trainer_requests_limit();

-- štatistiky pre katalóg
create or replace function public.trainer_stats() returns table(trainer_id uuid, reviews int, avg_rating numeric)
language sql stable security definer set search_path = public as $$
  select trainer_id, count(*)::int, round(avg(rating)::numeric, 2) from public.trainer_reviews group by trainer_id;
$$;
revoke all on function public.trainer_stats() from public, anon;
grant execute on function public.trainer_stats() to authenticated;
