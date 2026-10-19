-- Vyhľadávanie jedál (v3 logika pod pôvodným menom search_foods_v2, aby appka nemusela nič meniť).
-- Poradie: moje jedlá, presná zhoda názvu, všetky slová, naša overená slovenská databáza, začiatok názvu, potom zvyšok.
-- Oprava preklepov sa použije len pre slovo, ktoré v databáze nie je vôbec (predtým sa „pagáč“ menilo na „pagar“).
create or replace function public.search_foods_v2(q text, lim integer default 30)
 returns table(id bigint, name text, brand text, barcode text, kcal numeric, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric, salt numeric, portions jsonb, is_recipe boolean, recipe jsonb, servings numeric, total_grams numeric, verified boolean, uses integer, mine boolean, is_public boolean, gluten text, lactose text, allergens text[], traces text[], gi smallint, img text)
 language plpgsql
 stable security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_nq text; v_words text[]; v_stems text[]; v_cond text := ''; v_all text := ''; v_where text; v_s text; v_n int;
  v_uid uuid := auth.uid(); v_coach boolean := coalesce(public.is_coach(), false);
  v_lim int := least(greatest(lim, 1), 50);
begin
  v_nq := regexp_replace(regexp_replace(regexp_replace(regexp_replace(public.f_norm(trim(q)),
      'chleb(a|u|e|om|y)( |$)', 'chlieb\2', 'g'),
      '(^| )rajc\w*', '\1paradajka', 'g'),
      '(^| )(lazan\w*|lasan\w*)', '\1lasagne', 'g'),
      '(^| )(kroasan\w*|croisan\w*|kruasan\w*)', '\1croissant', 'g');
  v_nq := btrim(regexp_replace(v_nq, '\s+', ' ', 'g'));
  if length(v_nq) < 1 then return; end if;

  -- krátke písanie (b, ba, ban): populárne jedlá cez index na začiatok názvu, naša databáza prvá
  if length(v_nq) <= 3 and v_nq ~ '^[a-z0-9]+$' then
    select count(*) into v_n from (select 1 from public.foods f where f.search like v_nq || '%' and (f.verified or f.pop >= 3 or f.uses > 0) and (f.is_public or f.created_by = v_uid or v_coach) limit 6) x;
    if v_n >= 6 then
      return query
      with c as (
        select f.* from public.foods f
        where f.search like v_nq || '%' and (f.verified or f.pop >= 3 or f.uses > 0) and (f.is_public or f.created_by = v_uid or v_coach)
        order by coalesce(f.created_by = v_uid, false) desc, (f.search = v_nq) desc, (f.verified or f.src is null or f.src in ('curated', 'chain')) desc, f.uses desc, (f.img is not null) desc, f.pop desc, length(f.name) asc
        limit v_lim * 4
      ), d as (
        select c.*, row_number() over (partition by c.search, lower(coalesce(c.brand, '')) order by c.verified desc, (c.img is not null) desc, c.pop desc) rn from c
      )
      select d.id, d.name, d.brand, d.barcode, d.kcal, d.protein, d.carbs, d.fat, d.fiber, d.sugar, d.salt, d.portions, d.is_recipe, d.recipe, d.servings, d.total_grams, d.verified, d.uses,
             coalesce(d.created_by = v_uid, false), d.is_public, d.gluten, d.lactose, d.allergens, d.traces, d.gi, d.img
      from d where d.rn = 1
      order by coalesce(d.created_by = v_uid, false) desc, (d.search = v_nq) desc, (d.verified or d.src is null or d.src in ('curated', 'chain')) desc, d.uses desc, (d.img is not null) desc, d.pop desc, length(d.name) asc
      limit v_lim;
      return;
    end if;
  end if;

  -- preklepy: nahradí sa len slovo, ktoré sa nenachádza na začiatku žiadneho známeho slova (pivko > pivo), nikdy existujúce
  v_nq := coalesce(nullif(array_to_string(array(
      select case
        when length(x) < 5
          or exists (select 1 from public.foodwords d where d.w like x || '%')
          or exists (select 1 from public.foodwords d where d.w like public.f_stem(x) || '%' and length(public.f_stem(x)) >= 4) then x
        else coalesce((select d.w from public.foodwords d where d.freq >= 3 and d.w % x and similarity(d.w, x) >= 0.4 order by similarity(d.w, x) + ln(d.freq + 1) * 0.05 desc limit 1), x) end
      from unnest(regexp_split_to_array(v_nq, '[^a-z0-9]+')) with ordinality t(x, o) where x <> '' order by o), ' '), ''), v_nq);
  v_words := array_remove(regexp_split_to_array(v_nq, '[^a-z0-9]+'), '');
  v_stems := array(select public.f_stem(x) from unnest(v_words) x);
  if cardinality(v_stems) > 0 then
    foreach v_s in array v_stems loop
      v_cond := v_cond || case when v_cond = '' then '' else ' and ' end || format('(('' '' || f.search || '' '' || f.kw) like %L)', '% ' || v_s || '%');
    end loop;
    foreach v_s in array v_words loop
      v_all := v_all || case when v_all = '' then '' else ' and ' end || format('(('' '' || f.search || '' '' || f.kw || '' '') like %L)', '% ' || v_s || '%');
    end loop;
  else
    v_cond := 'false'; v_all := 'false';
  end if;
  -- podobnosť (preklepy) sa pridá len vtedy, keď slová nájdu málo, inak je hľadanie zbytočne pomalé
  execute format('select count(*) from (select 1 from public.foods f where (%s) and (f.is_public or f.created_by = $1 or $2) limit %s) x', v_cond, v_lim) into v_n using v_uid, v_coach;
  perform set_config('pg_trgm.similarity_threshold', '0.4', true);
  v_where := case when v_n >= v_lim then '(' || v_cond || ')'
                  when v_n > 0 then '((' || v_cond || ') or (f.search % $1 and similarity(f.search, $1) > 0.55))'
                  else '((' || v_cond || ') or (f.search % $1 and similarity(f.search, $1) > 0.4))' end;

  return query execute format($f$
    with c as (
      select f.*,
             coalesce(f.created_by = $4, false) k_mine,
             (f.search = $1) k_exact,
             (%s) k_all,
             (f.verified or f.src is null or f.src in ('curated', 'chain')) k_core,
             (f.search like $1 || '%%') k_pre,
             ((' ' || f.search) like '%% ' || $1 || '%%') k_wpre,
             (f.name !~* '[ěřůõäöü]|^sýr|^máslo|^mléko|^kuřec|kuřec') k_loc
      from public.foods f
      where %s
        and (f.is_public or f.created_by = $4 or $5)
      order by k_mine desc, k_exact desc, k_all desc, k_core desc, k_pre desc, k_wpre desc, k_loc desc, f.uses desc, (f.img is not null) desc, f.pop desc, length(f.name) asc
      limit $3 * 4
    ), d as (
      select c.*, row_number() over (partition by c.search, lower(coalesce(c.brand, '')) order by c.verified desc, (c.img is not null) desc, c.pop desc) rn from c
    )
    select d.id, d.name, d.brand, d.barcode, d.kcal, d.protein, d.carbs, d.fat, d.fiber, d.sugar, d.salt, d.portions, d.is_recipe, d.recipe, d.servings, d.total_grams, d.verified, d.uses,
           d.k_mine, d.is_public, d.gluten, d.lactose, d.allergens, d.traces, d.gi, d.img
    from d where d.rn = 1 and (d.k_all or d.k_mine or not exists (select 1 from d d2 where d2.k_all))
    order by d.k_mine desc, d.k_exact desc, d.k_all desc, d.k_core desc, d.k_pre desc, d.k_wpre desc, d.k_loc desc, d.uses desc, (d.img is not null) desc, d.pop desc, length(d.name) asc
    limit $3
  $f$, v_all, v_where) using v_nq, v_words, v_lim, v_uid, v_coach;
end;
$function$;
