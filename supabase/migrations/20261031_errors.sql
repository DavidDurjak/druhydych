-- GainTrain: hlásenie chýb (v303).
-- Appka zapíše krátky záznam js_err, keď jej niečo spadne. Prihlásení ho posielajú ako každú inú udalosť.
-- Toto pravidlo dovolí poslať js_err aj pred prihlásením (kvíz, registrácia), s malým obsahom a bez user_id.
-- Čítať môže len admin (pravidlo app_events_admin_read ostáva).

drop policy if exists app_events_insert_anon on public.app_events;
create policy app_events_insert_anon on public.app_events for insert to anon
  with check (
    user_id is null
    and (name ~ '^fn_[a-z_]{2,30}$' or name in ('google_signin', 'js_err'))
    and did ~ '^[a-z0-9]{10,24}$'
    and (props is null or length(props::text) < 600)
  );
