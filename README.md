# Druhý dych

Druhý dych nie je dar. Dá sa naučiť.

Webová aplikácia (PWA) pre 12-týždňovú premenu: jedlo, váha, check-in a koučovský dashboard.
Beží bez inštalácie z App Storu, otvorí sa z odkazu a dá sa pridať na plochu mobilu.

## Technológie
- Frontend: HTML, CSS, JavaScript (ES moduly), bez frameworku
- Databáza a prihlásenie: Supabase (Postgres + Auth, Row Level Security)
- Hosting: Vercel
- Jedlá: vstavaná databáza základných potravín + Open Food Facts API

## Súbory
- `index.html` vstupná stránka
- `app.js` obrazovky a logika aplikácie
- `data.js` komunikácia so Supabase
- `calc.js` výpočty (kalórie, makrá, trend váhy)
- `food.js` vyhľadávanie jedál
- `config.js` URL a verejný kľúč Supabase
- `schema.sql` databázové tabuľky a bezpečnostné pravidlá
- `manifest.json`, `sw.js`, `icon.svg` aby sa dala appka pridať na plochu

## Stav
- Databáza v Supabase: hotová (tabuľky, RLS, trigger)
- Kód: tento repozitár
- Hosting: Vercel -> Add New Project -> Import `druhydych` -> Framework Preset: Other -> Deploy

## Kouč
Po registrácii Davida a spolužiaka spusti v Supabase SQL Editore:
```sql
update public.profiles set role = 'coach' where email in ('tvoj@email.sk', 'spoluziak@email.sk');
```
Po odhlásení a prihlásení sa im objaví záložka Kouč.

## Aktualizácia
Zmena súboru v tomto repozitári sa do minúty sama nasadí na Vercel.
