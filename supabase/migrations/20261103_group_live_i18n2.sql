-- GainTrain: notifikácie a správy k tréningom naživo v jazyku príjemcu (profiles.lang).
-- Slovenčina, čeština, angličtina, nemčina, maďarčina, poľština a ukrajinčina majú texty napísané ručne (aj formát dátumu).
-- Ostatné jazyky: push dostane slovenský text a send-push ho preloží (názov tréningu a meno trénera sú v ⟦⟧, tie sa neprekladajú),
-- správu v chate preloží appka. push_queue.localized = text je už v jazyku príjemcu, send-push ho neprekladá.

begin;

alter table public.push_queue add column if not exists localized boolean not null default false;

-- jazyk príjemcu: kód, ak má ručné texty, inak 'sk' (a preklad zariadi send-push / appka)
create or replace function public.gs_lang(u uuid) returns text language sql stable security definer set search_path = public as $$
  select case when l in ('sk','cs','en','de','hu','pl','uk','es','fr','it','ru','pt','nl','ro','tr','hr') then l else 'sk' end
  from (select split_part(lower(coalesce((select lang from profiles where id = u), 'sk')), '-', 1) l) x
$$;
revoke all on function public.gs_lang(uuid) from public, anon, authenticated;

-- má príjemca jazyk s ručnými textami (alebo slovenčinu)?
create or replace function public.gs_native(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select split_part(lower(coalesce((select lang from profiles where id = u), 'sk')), '-', 1) in ('sk','cs','en','de','hu','pl','uk','es','fr','it','ru','pt','nl','ro','tr','hr')
$$;
revoke all on function public.gs_native(uuid) from public, anon, authenticated;

-- dátum a čas v jazyku (čas trénera: Europe/Bratislava)
create or replace function public.gs_when(t timestamptz, l text) returns text language sql immutable set search_path = public as $$
  with x as (select t at time zone 'Europe/Bratislava' lt),
  y as (select extract(dow from lt)::int + 1 w, extract(day from lt)::int d, extract(month from lt)::int m, to_char(lt, 'HH24:MI') hm from x)
  select case l
    when 'cs' then (array['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'])[w] || ' ' || d || '. ' || m || '. v ' || hm
    when 'en' then (array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[w] || ', ' || d || ' '
                   || (array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])[m] || ' at ' || hm
    when 'de' then (array['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'])[w] || ', ' || d || '. ' || m || '. um ' || hm
    when 'hu' then (array['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'])[m]
                   || ' ' || d || '., ' || (array['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'])[w] || ' ' || hm
    when 'pl' then (array['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'])[w] || ', ' || d || '.' || lpad(m::text, 2, '0') || ', ' || hm
    when 'uk' then (array['неділя','понеділок','вівторок','середа','четвер','пʼятниця','субота'])[w] || ', ' || lpad(d::text, 2, '0') || '.' || lpad(m::text, 2, '0') || ' о ' || hm
    when 'es' then (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[w] || ', ' || d || ' de ' || (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[m] || ' a las ' || hm
    when 'fr' then (array['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'])[w] || ' ' || d || ' ' || (array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'])[m] || ' à ' || hm
    when 'it' then (array['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'])[w] || ' ' || d || ' ' || (array['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'])[m] || ' alle ' || hm
    when 'ru' then (array['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'])[w] || ', ' || d || ' ' || (array['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'])[m] || ' в ' || hm
    when 'pt' then (array['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'])[w] || ', ' || d || ' de ' || (array['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[m] || ' às ' || hm
    when 'nl' then (array['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag'])[w] || ' ' || d || ' ' || (array['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'])[m] || ' om ' || hm
    when 'ro' then (array['duminică','luni','marți','miercuri','joi','vineri','sâmbătă'])[w] || ', ' || d || ' ' || (array['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'])[m] || ', ora ' || hm
    when 'tr' then d || ' ' || (array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'])[m] || ' ' || (array['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'])[w] || ', ' || hm
    when 'hr' then (array['nedjelja','ponedjeljak','utorak','srijeda','četvrtak','petak','subota'])[w] || ', ' || d || '. ' || (array['siječnja','veljače','ožujka','travnja','svibnja','lipnja','srpnja','kolovoza','rujna','listopada','studenoga','prosinca'])[m] || ' u ' || hm
    else (array['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota'])[w] || ' ' || d || '. ' || m || '. o ' || hm
  end from y
$$;

-- texty: {n} meno trénera, {t} názov, {w} kedy, {W} kedy s veľkým písmenom, {d} minúty, {c} počet prihlásených
create or replace function public.gs_tx(l text, k text) returns text language sql immutable set search_path = public as $$
  select coalesce(j -> l ->> k, j -> 'sk' ->> k) from (select $j${
  "sk": {
    "inv_t": "🎥 {n} ťa pozýva na tréning naživo", "inv_b": "{t}, {w}. Klikni a daj vedieť, či prídeš.", "inv_m": "🎥 Pozvánka na tréning naživo: {t}\n{W}, {d} min",
    "mov_t": "🕒 Tréning naživo má nový čas", "mov_b": "{t} je teraz {w}.", "mov_m": "🕒 Zmena času: {t} je teraz {w}.",
    "can_t": "❌ Tréning naživo je zrušený", "can_b": "{t} ({w}) sa nekoná.", "can_m": "❌ Ruším tréning naživo {t} ({w}). Prepáč, dám vedieť nový termín.",
    "rc_t": "🔴 {t} začína o pár minút", "rc_b": "{n} čoskoro začne. Klikni a pripoj sa.",
    "rt_t": "🎬 Tvoj tréning naživo začína o pár minút", "rt_b": "{t}: prihlásených {c}. Klikni a spusti ho."
  },
  "cs": {
    "inv_t": "🎥 {n} tě zve na živý trénink", "inv_b": "{t}, {w}. Klikni a dej vědět, jestli přijdeš.", "inv_m": "🎥 Pozvánka na živý trénink: {t}\n{W}, {d} min",
    "mov_t": "🕒 Živý trénink má nový čas", "mov_b": "{t} je nově {w}.", "mov_m": "🕒 Změna času: {t} je nově {w}.",
    "can_t": "❌ Živý trénink je zrušený", "can_b": "{t} ({w}) se nekoná.", "can_m": "❌ Ruším živý trénink {t} ({w}). Promiň, dám vědět nový termín.",
    "rc_t": "🔴 {t} začíná za pár minut", "rc_b": "{n} brzy začne. Klikni a připoj se.",
    "rt_t": "🎬 Tvůj živý trénink začíná za pár minut", "rt_b": "{t}: přihlášeno {c}. Klikni a spusť ho."
  },
  "en": {
    "inv_t": "🎥 {n} invited you to a live workout", "inv_b": "{t}, {w}. Tap to let them know if you're coming.", "inv_m": "🎥 Live workout invite: {t}\n{W}, {d} min",
    "mov_t": "🕒 Your live workout has a new time", "mov_b": "{t} is now {w}.", "mov_m": "🕒 Time change: {t} is now {w}.",
    "can_t": "❌ Live workout canceled", "can_b": "{t} ({w}) is canceled.", "can_m": "❌ I'm canceling the live workout {t} ({w}). Sorry, I'll let you know the new date.",
    "rc_t": "🔴 {t} starts in a few minutes", "rc_b": "{n} is starting soon. Tap to join.",
    "rt_t": "🎬 Your live workout starts in a few minutes", "rt_b": "{t}: {c} signed up. Tap to start it."
  },
  "de": {
    "inv_t": "🎥 {n} lädt dich zum Live-Training ein", "inv_b": "{t}, {w}. Tippe und sag Bescheid, ob du kommst.", "inv_m": "🎥 Einladung zum Live-Training: {t}\n{W}, {d} Min.",
    "mov_t": "🕒 Neue Zeit für dein Live-Training", "mov_b": "{t} ist jetzt am {w}.", "mov_m": "🕒 Zeitänderung: {t} ist jetzt am {w}.",
    "can_t": "❌ Live-Training abgesagt", "can_b": "{t} ({w}) findet nicht statt.", "can_m": "❌ Ich sage das Live-Training {t} ({w}) ab. Sorry, ich melde mich mit einem neuen Termin.",
    "rc_t": "🔴 {t} beginnt in wenigen Minuten", "rc_b": "{n} startet gleich. Tippe, um beizutreten.",
    "rt_t": "🎬 Dein Live-Training beginnt in wenigen Minuten", "rt_b": "{t}: {c} angemeldet. Tippe, um es zu starten."
  },
  "hu": {
    "inv_t": "🎥 {n} meghívott egy élő edzésre", "inv_b": "{t}, {w}. Koppints, és jelezd, hogy jössz-e.", "inv_m": "🎥 Meghívó élő edzésre: {t}\n{W}, {d} perc",
    "mov_t": "🕒 Az élő edzésed időpontja változott", "mov_b": "{t} új időpontja: {w}.", "mov_m": "🕒 Időpontváltozás: {t} új időpontja {w}.",
    "can_t": "❌ Az élő edzés elmarad", "can_b": "{t} ({w}) elmarad.", "can_m": "❌ Lemondom az élő edzést: {t} ({w}). Bocsi, szólok az új időpontról.",
    "rc_t": "🔴 {t} pár perc múlva kezdődik", "rc_b": "{n} hamarosan kezd. Koppints és csatlakozz.",
    "rt_t": "🎬 Az élő edzésed pár perc múlva kezdődik", "rt_b": "{t}: {c} jelentkező. Koppints és indítsd el."
  },
  "pl": {
    "inv_t": "🎥 {n} zaprasza cię na trening na żywo", "inv_b": "{t}, {w}. Kliknij i daj znać, czy będziesz.", "inv_m": "🎥 Zaproszenie na trening na żywo: {t}\n{W}, {d} min",
    "mov_t": "🕒 Trening na żywo ma nowy termin", "mov_b": "{t}: nowy termin {w}.", "mov_m": "🕒 Zmiana terminu: {t}, teraz {w}.",
    "can_t": "❌ Trening na żywo odwołany", "can_b": "{t} ({w}) się nie odbędzie.", "can_m": "❌ Odwołuję trening na żywo {t} ({w}). Przepraszam, dam znać o nowym terminie.",
    "rc_t": "🔴 {t} zaczyna się za kilka minut", "rc_b": "{n} zaraz zaczyna. Kliknij i dołącz.",
    "rt_t": "🎬 Twój trening na żywo zaczyna się za kilka minut", "rt_b": "{t}: zapisanych {c}. Kliknij i zacznij."
  },
  "uk": {
    "inv_t": "🎥 {n} запрошує тебе на тренування наживо", "inv_b": "{t}, {w}. Натисни й дай знати, чи прийдеш.", "inv_m": "🎥 Запрошення на тренування наживо: {t}\n{W}, {d} хв",
    "mov_t": "🕒 Тренування наживо перенесено", "mov_b": "{t} тепер {w}.", "mov_m": "🕒 Зміна часу: {t} тепер {w}.",
    "can_t": "❌ Тренування наживо скасовано", "can_b": "{t} ({w}) не відбудеться.", "can_m": "❌ Скасовую тренування наживо {t} ({w}). Вибач, повідомлю нову дату.",
    "rc_t": "🔴 {t} починається за кілька хвилин", "rc_b": "{n} скоро почне. Натисни й приєднуйся.",
    "rt_t": "🎬 Твоє тренування наживо починається за кілька хвилин", "rt_b": "{t}: записалося {c}. Натисни й почни."
  },
  "es": {
    "inv_t": "🎥 {n} te invita a un entrenamiento en directo", "inv_b": "{t}, {w}. Toca y avísale si vienes.", "inv_m": "🎥 Invitación a entrenamiento en directo: {t}\n{W}, {d} min",
    "mov_t": "🕒 Tu entrenamiento en directo tiene nueva hora", "mov_b": "{t} es ahora {w}.", "mov_m": "🕒 Cambio de hora: {t} es ahora {w}.",
    "can_t": "❌ Entrenamiento en directo cancelado", "can_b": "{t} ({w}) queda cancelado.", "can_m": "❌ Cancelo el entrenamiento en directo {t} ({w}). Perdona, te aviso de la nueva fecha.",
    "rc_t": "🔴 {t} empieza en unos minutos", "rc_b": "{n} empieza enseguida. Toca para unirte.",
    "rt_t": "🎬 Tu entrenamiento en directo empieza en unos minutos", "rt_b": "{t}: {c} apuntados. Toca para empezar."
  },
  "fr": {
    "inv_t": "🎥 {n} t'invite à une séance en direct", "inv_b": "{t}, {w}. Appuie et dis si tu viens.", "inv_m": "🎥 Invitation à une séance en direct : {t}\n{W}, {d} min",
    "mov_t": "🕒 Ta séance en direct a un nouvel horaire", "mov_b": "{t} a maintenant lieu {w}.", "mov_m": "🕒 Changement d'horaire : {t} a maintenant lieu {w}.",
    "can_t": "❌ Séance en direct annulée", "can_b": "{t} ({w}) n'aura pas lieu.", "can_m": "❌ J'annule la séance en direct {t} ({w}). Désolé, je te donne la nouvelle date bientôt.",
    "rc_t": "🔴 {t} commence dans quelques minutes", "rc_b": "{n} va bientôt commencer. Appuie pour rejoindre.",
    "rt_t": "🎬 Ta séance en direct commence dans quelques minutes", "rt_b": "{t} : {c} inscrits. Appuie pour la lancer."
  },
  "it": {
    "inv_t": "🎥 {n} ti invita a un allenamento live", "inv_b": "{t}, {w}. Tocca e fai sapere se vieni.", "inv_m": "🎥 Invito all'allenamento live: {t}\n{W}, {d} min",
    "mov_t": "🕒 Il tuo allenamento live ha un nuovo orario", "mov_b": "{t} ora è {w}.", "mov_m": "🕒 Cambio di orario: {t} ora è {w}.",
    "can_t": "❌ Allenamento live annullato", "can_b": "{t} ({w}) non si terrà.", "can_m": "❌ Annullo l'allenamento live {t} ({w}). Scusa, ti faccio sapere la nuova data.",
    "rc_t": "🔴 {t} inizia tra pochi minuti", "rc_b": "{n} sta per iniziare. Tocca per unirti.",
    "rt_t": "🎬 Il tuo allenamento live inizia tra pochi minuti", "rt_b": "{t}: {c} iscritti. Tocca per avviarlo."
  },
  "ru": {
    "inv_t": "🎥 {n} приглашает тебя на тренировку в прямом эфире", "inv_b": "{t}, {w}. Нажми и сообщи, придёшь ли.", "inv_m": "🎥 Приглашение на тренировку в прямом эфире: {t}\n{W}, {d} мин",
    "mov_t": "🕒 У тренировки в прямом эфире новое время", "mov_b": "{t} теперь {w}.", "mov_m": "🕒 Изменение времени: {t} теперь {w}.",
    "can_t": "❌ Тренировка в прямом эфире отменена", "can_b": "{t} ({w}) не состоится.", "can_m": "❌ Отменяю тренировку в прямом эфире {t} ({w}). Прости, сообщу новую дату.",
    "rc_t": "🔴 {t} начинается через несколько минут", "rc_b": "{n} скоро начнётся. Нажми и присоединяйся.",
    "rt_t": "🎬 Твоя тренировка в прямом эфире начнётся через несколько минут", "rt_b": "{t}: записались {c}. Нажми, чтобы начать."
  },
  "pt": {
    "inv_t": "🎥 {n} convida-te para um treino em direto", "inv_b": "{t}, {w}. Toca e diz se vens.", "inv_m": "🎥 Convite para treino em direto: {t}\n{W}, {d} min",
    "mov_t": "🕒 O teu treino em direto tem novo horário", "mov_b": "{t} é agora {w}.", "mov_m": "🕒 Mudança de horário: {t} é agora {w}.",
    "can_t": "❌ Treino em direto cancelado", "can_b": "{t} ({w}) não se realiza.", "can_m": "❌ Cancelo o treino em direto {t} ({w}). Desculpa, aviso-te da nova data.",
    "rc_t": "🔴 {t} começa dentro de alguns minutos", "rc_b": "{n} vai começar já. Toca para entrar.",
    "rt_t": "🎬 O teu treino em direto começa dentro de alguns minutos", "rt_b": "{t}: {c} inscritos. Toca para começar."
  },
  "nl": {
    "inv_t": "🎥 {n} nodigt je uit voor een livetraining", "inv_b": "{t}, {w}. Tik en laat weten of je komt.", "inv_m": "🎥 Uitnodiging voor livetraining: {t}\n{W}, {d} min",
    "mov_t": "🕒 Je livetraining heeft een nieuwe tijd", "mov_b": "{t} is nu {w}.", "mov_m": "🕒 Tijdwijziging: {t} is nu {w}.",
    "can_t": "❌ Livetraining geannuleerd", "can_b": "{t} ({w}) gaat niet door.", "can_m": "❌ Ik annuleer de livetraining {t} ({w}). Sorry, ik laat de nieuwe datum weten.",
    "rc_t": "🔴 {t} begint over een paar minuten", "rc_b": "{n} begint zo. Tik om mee te doen.",
    "rt_t": "🎬 Je livetraining begint over een paar minuten", "rt_b": "{t}: {c} aangemeld. Tik om te starten."
  },
  "ro": {
    "inv_t": "🎥 {n} te invită la un antrenament live", "inv_b": "{t}, {w}. Atinge și spune-i dacă vii.", "inv_m": "🎥 Invitație la antrenament live: {t}\n{W}, {d} min",
    "mov_t": "🕒 Antrenamentul tău live are o oră nouă", "mov_b": "{t} este acum {w}.", "mov_m": "🕒 Schimbare de oră: {t} este acum {w}.",
    "can_t": "❌ Antrenament live anulat", "can_b": "{t} ({w}) nu va avea loc.", "can_m": "❌ Anulez antrenamentul live {t} ({w}). Scuze, îți dau de veste când avem data nouă.",
    "rc_t": "🔴 {t} începe în câteva minute", "rc_b": "{n} începe curând. Atinge pentru a intra.",
    "rt_t": "🎬 Antrenamentul tău live începe în câteva minute", "rt_b": "{t}: {c} înscriși. Atinge pentru a-l porni."
  },
  "tr": {
    "inv_t": "🎥 {n} seni canlı antrenmana davet ediyor", "inv_b": "{t}, {w}. Dokun ve gelip gelmeyeceğini bildir.", "inv_m": "🎥 Canlı antrenman daveti: {t}\n{W}, {d} dk",
    "mov_t": "🕒 Canlı antrenmanının saati değişti", "mov_b": "{t} artık {w}.", "mov_m": "🕒 Saat değişikliği: {t} artık {w}.",
    "can_t": "❌ Canlı antrenman iptal edildi", "can_b": "{t} ({w}) yapılmayacak.", "can_m": "❌ {t} ({w}) canlı antrenmanını iptal ediyorum. Kusura bakma, yeni tarihi haber veririm.",
    "rc_t": "🔴 {t} birkaç dakika sonra başlıyor", "rc_b": "{n} birazdan başlıyor. Katılmak için dokun.",
    "rt_t": "🎬 Canlı antrenmanın birkaç dakika sonra başlıyor", "rt_b": "{t}: {c} kişi katıldı. Başlatmak için dokun."
  },
  "hr": {
    "inv_t": "🎥 {n} te poziva na trening uživo", "inv_b": "{t}, {w}. Dodirni i javi dolaziš li.", "inv_m": "🎥 Poziv na trening uživo: {t}\n{W}, {d} min",
    "mov_t": "🕒 Tvoj trening uživo ima novo vrijeme", "mov_b": "{t} je sada {w}.", "mov_m": "🕒 Promjena vremena: {t} je sada {w}.",
    "can_t": "❌ Trening uživo je otkazan", "can_b": "{t} ({w}) se ne održava.", "can_m": "❌ Otkazujem trening uživo {t} ({w}). Oprosti, javit ću novi termin.",
    "rc_t": "🔴 {t} počinje za nekoliko minuta", "rc_b": "{n} uskoro počinje. Dodirni i pridruži se.",
    "rt_t": "🎬 Tvoj trening uživo počinje za nekoliko minuta", "rt_b": "{t}: prijavljeno {c}. Dodirni i pokreni."
  }
}$j$::jsonb j) x
$$;

-- dosadí hodnoty; lit = názov a meno do ⟦⟧ (push, ktorý ešte prekladá send-push)
create or replace function public.gs_fill(tpl text, n text, t text, w text, d int default null, c int default null, lit boolean default false)
returns text language sql immutable set search_path = public as $$
  select replace(replace(replace(replace(replace(replace(tpl,
    '{n}', case when lit then '⟦' || coalesce(n, '') || '⟧' else coalesce(n, '') end),
    '{W}', upper(left(coalesce(w, ''), 1)) || substr(coalesce(w, ''), 2)),
    '{w}', coalesce(w, '')),
    '{d}', coalesce(d::text, '')),
    '{c}', coalesce(c::text, '')),
    '{t}', case when lit then '⟦' || coalesce(t, '') || '⟧' else coalesce(t, '') end)
$$;

create or replace function public.gs_notify(p_session uuid, p_clients uuid[], p_kind text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare s record; tname text; c uuid; l text; nat boolean; w text; k text;
begin
  select * into s from group_sessions where id = p_session;
  if s.id is null then return; end if;
  k := case p_kind when 'invite' then 'inv' when 'moved' then 'mov' when 'cancel' then 'can' else null end;
  if k is null then return; end if;
  select split_part(nullif(trim(display_name), ''), ' ', 1) into tname from trainer_profiles where user_id = s.trainer_id;
  foreach c in array coalesce(p_clients, '{}') loop
    l := gs_lang(c); nat := gs_native(c); w := gs_when(s.starts_at, l);
    insert into messages (from_user, to_user, body)
      values (s.trainer_id, c, gs_fill(gs_tx(l, k || '_m'), tname, s.title, w, s.duration_min) || E'\n#/zive/' || s.id);
    if coalesce((select enabled from reminder_settings where user_id = c), true) and exists (select 1 from push_subscriptions where user_id = c) then
      insert into push_queue (user_id, title, body, url, tag, localized)
        values (c, gs_fill(gs_tx(l, k || '_t'), coalesce(tname, case l when 'en' then 'Your trainer' when 'de' then 'Dein Trainer' when 'cs' then 'Tvůj trenér'
                  when 'hu' then 'Az edződ' when 'pl' then 'Twój trener' when 'uk' then 'Твій тренер' else 'Tvoj tréner' end), s.title, w, s.duration_min, null, not nat),
                gs_fill(gs_tx(l, k || '_b'), tname, s.title, w, s.duration_min, null, not nat),
                '#/zive/' || s.id, 'gs-' || s.id, nat and l <> 'sk');
    end if;
  end loop;
end $$;
revoke all on function public.gs_notify(uuid, uuid[], text) from public, anon, authenticated;

create or replace function public.gs_remind() returns void
language plpgsql volatile security definer set search_path = public as $$
declare s record; n int := 0; r record; l text; nat boolean; going int;
begin
  for s in select g.*, split_part(coalesce(nullif(trim(tp.display_name), ''), 'Tréner'), ' ', 1) tname from group_sessions g left join trainer_profiles tp on tp.user_id = g.trainer_id
           where g.status = 'scheduled' and not g.reminded and g.starts_at between now() and now() + interval '11 minutes' for update of g skip locked loop
    update group_sessions set reminded = true where id = s.id;
    for r in select i.client_id from group_invites i where i.session_id = s.id and i.rsvp <> 'declined'
               and coalesce((select enabled from reminder_settings where user_id = i.client_id), true)
               and exists (select 1 from push_subscriptions where user_id = i.client_id) loop
      l := gs_lang(r.client_id); nat := gs_native(r.client_id);
      insert into push_queue (user_id, title, body, url, tag, localized)
        values (r.client_id, gs_fill(gs_tx(l, 'rc_t'), s.tname, s.title, null, null, null, not nat), gs_fill(gs_tx(l, 'rc_b'), s.tname, s.title, null, null, null, not nat),
                '#/zive/' || s.id, 'gs-' || s.id, nat and l <> 'sk');
    end loop;
    if exists (select 1 from push_subscriptions where user_id = s.trainer_id) then
      l := gs_lang(s.trainer_id); nat := gs_native(s.trainer_id);
      select count(*) into going from group_invites where session_id = s.id and rsvp = 'going';
      insert into push_queue (user_id, title, body, url, tag, localized)
        values (s.trainer_id, gs_fill(gs_tx(l, 'rt_t'), s.tname, s.title, null, null, going, not nat), gs_fill(gs_tx(l, 'rt_b'), s.tname, s.title, null, null, going, not nat),
                '#/zive/' || s.id, 'gs-' || s.id, nat and l <> 'sk');
    end if;
    n := n + 1;
  end loop;
  if n > 0 then perform gs_flush_push(); end if;
end $$;
revoke all on function public.gs_remind() from public, anon, authenticated;

commit;
