-- ============================================================================
-- SEC-03 · LANGKAH 1b · FUNGSI AMAN  (USULAN. BELUM DIJALANKAN.)
--
-- Perubahan terhadap draft migrasi repo (lihat SEVNQUEST_SEC03_PLAN.md §2):
--   * identitas selalu auth.uid()::text (kolom user_id production = TEXT)
--   * EXP dibatasi LEAKY BUCKET (400 EXP/menit, kapasitas 60 menit = 24.000 EXP): kredit dikonsumsi oleh
--     kenaikan yang diterima, jadi memanggil RPC berulang TIDAK memberi buffer baru (cacat draft #1)
--   * level & tier dihitung server dari EXP (formula = klien: data/rpg/tiers.ts)
--   * week_id dari server (UTC); tier & nama untuk skor mingguan diambil dari baris leaderboard
--   * avatar = emoji (dirender sebagai teks): dibatasi 16 karakter, karakter kontrol dibuang
--   * semua fungsi SET search_path = public; tidak ada DELETE/UPDATE tanpa WHERE (safeupdate aktif)
--
-- Tag dollar-quote $fn$ dipakai. Bila editor Supabase menolak file utuh, jalankan per bagian
-- "FUNGSI 1..5" satu per satu (tiap bagian berdiri sendiri), urut dari atas.
-- Tidak mengunci apa pun: klien lama tetap berjalan sampai SEC-03_2_lock.
-- ============================================================================

-- ===== FUNGSI 1: tier dari EXP (ambang sama dengan klien) ==================
create or replace function public.nq_tier_for_exp(p_exp bigint) returns integer
language sql immutable set search_path = public as $fn$
  select case
    when p_exp >= 320000 then 9 when p_exp >= 210000 then 8 when p_exp >= 135000 then 7
    when p_exp >= 80000  then 6 when p_exp >= 45000  then 5 when p_exp >= 22000  then 4
    when p_exp >= 10000  then 3 when p_exp >= 4000   then 2 when p_exp >= 1200   then 1
    else 0 end
$fn$;

-- ===== FUNGSI 2: level dari EXP (formula klien: floor((-1+sqrt(9+0.16*exp))/2), minimal 1) =====
create or replace function public.nq_level_for_exp(p_exp bigint) returns integer
language sql immutable set search_path = public as $fn$
  select greatest(1, floor((-1 + sqrt(9 + 0.16 * greatest(p_exp, 0))) / 2))::integer
$fn$;

-- ===== FUNGSI 3: sinkron profil + EXP ke leaderboard (nama RPC & parameter SAMA dengan klien) =====
create or replace function public.upsert_leaderboard_entry(
  p_player_name    text,
  p_level          integer,          -- diterima demi kompatibilitas; DIABAIKAN (level dihitung server)
  p_total_exp      bigint,
  p_avatar_url     text    default null,
  p_stat_tryout    integer default 0,
  p_stat_flashcard integer default 0,
  p_stat_kanji     integer default 0,
  p_stat_boss      integer default 0
) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  uid        text := auth.uid()::text;
  prev       public.leaderboard%rowtype;
  v_rate     constant numeric := 400;     -- EXP per menit
  v_cap_min  constant numeric := 60;      -- kapasitas bucket (menit)
  v_elapsed  numeric;
  v_credit   numeric;
  v_gain     bigint;
  v_new_exp  bigint;
  v_name     text;
  v_avatar   text;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if p_total_exp is null or p_total_exp < 0 or p_total_exp > 2000000000 then raise exception 'invalid payload'; end if;

  v_name := left(regexp_replace(coalesce(nullif(trim(p_player_name), ''), 'Petualang'), '[[:cntrl:]<>]', '', 'g'), 30);
  if v_name = '' then v_name := 'Petualang'; end if;
  v_avatar := nullif(left(regexp_replace(coalesce(p_avatar_url, ''), '[[:cntrl:]<>]', '', 'g'), 16), '');

  -- Baris baru: mulai dari 0 EXP dengan kredit awal 5.000 EXP (12,5 menit). Konflik (balapan) diabaikan.
  insert into public.leaderboard (user_id, player_name, level, total_exp, tier_index, last_updated, exp_credit_at)
  values (uid, v_name, 1, 0, 0, now(), now() - interval '12.5 minutes')
  on conflict (user_id) do nothing;

  select * into prev from public.leaderboard where user_id = uid for update;

  -- Leaky bucket: kredit = menit sejak exp_credit_at (maks 60) x 400. Kenaikan yang diterima MENGONSUMSI kredit.
  v_elapsed := least(greatest(extract(epoch from (now() - coalesce(prev.exp_credit_at, prev.last_updated, now()))) / 60.0, 0), v_cap_min);
  v_credit  := v_elapsed * v_rate;
  v_gain    := least(greatest(p_total_exp - prev.total_exp, 0), floor(v_credit))::bigint;   -- tidak pernah turun
  v_new_exp := prev.total_exp + v_gain;

  update public.leaderboard set
    player_name    = v_name,
    level          = public.nq_level_for_exp(v_new_exp),
    total_exp      = v_new_exp,
    tier_index     = public.nq_tier_for_exp(v_new_exp),
    avatar_url     = v_avatar,
    stat_tryout    = greatest(coalesce(stat_tryout, 0),    least(greatest(coalesce(p_stat_tryout, 0), 0), 10000000)),
    stat_flashcard = greatest(coalesce(stat_flashcard, 0), least(greatest(coalesce(p_stat_flashcard, 0), 0), 10000000)),
    stat_kanji     = greatest(coalesce(stat_kanji, 0),     least(greatest(coalesce(p_stat_kanji, 0), 0), 10000000)),
    stat_boss      = greatest(coalesce(stat_boss, 0),      least(greatest(coalesce(p_stat_boss, 0), 0), 10000000)),
    last_updated   = now(),
    exp_credit_at  = now() - make_interval(secs => (((v_credit - v_gain) / v_rate) * 60)::double precision)
  where user_id = uid;
end
$fn$;

-- ===== FUNGSI 4: reset milik sendiri (belum dipanggil klien; disiapkan untuk tombol "Reset Data") =====
create or replace function public.nq_reset_my_leaderboard() returns void
language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  update public.leaderboard
     set total_exp = 0, level = 1, tier_index = 0, last_updated = now(),
         exp_credit_at = now() - interval '12.5 minutes'
   where user_id = auth.uid()::text;
end
$fn$;

-- ===== FUNGSI 5: event skor mingguan (identitas dari auth.uid(); anti-spam; anti-duplikat) =====
create or replace function public.submit_score_event_v2(
  p_event_type  text,
  p_ref_id      text,
  p_is_correct  boolean,
  p_player_name text    default null,
  p_tier_index  integer default 0      -- diabaikan; tier diambil dari baris leaderboard
) returns void
language plpgsql security definer set search_path = public as $fn$
declare
  uid     text := auth.uid()::text;
  recent  integer;
  dup     integer;
  wk      text := to_char(now() at time zone 'UTC', 'IYYY"-W"IW');
  v_name  text;
  v_tier  integer;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if p_event_type not in ('quiz_answer', 'kanji_write') then raise exception 'invalid event'; end if;

  delete from public.score_event_log where user_id = uid and created_at < now() - interval '1 day';

  select count(*) into recent from public.score_event_log
   where user_id = uid and created_at > now() - interval '1 minute';
  if recent >= 40 then return; end if;                    -- anti-spam: 40 event/menit (selaras 400 poin/menit)

  select count(*) into dup from public.score_event_log
   where user_id = uid and event_type = p_event_type and ref_id = left(coalesce(p_ref_id, ''), 200)
     and created_at > now() - interval '10 seconds';
  if dup > 0 then return; end if;

  insert into public.score_event_log (user_id, event_type, ref_id)
  values (uid, p_event_type, left(coalesce(p_ref_id, ''), 200));

  if p_is_correct then
    select player_name, tier_index into v_name, v_tier from public.leaderboard where user_id = uid;
    v_name := coalesce(v_name,
                left(regexp_replace(coalesce(nullif(trim(p_player_name), ''), 'Petualang'), '[[:cntrl:]<>]', '', 'g'), 30));
    insert into public.weekly_scores (user_id, week_id, player_name, tier_index, score, updated_at)
    values (uid, wk, v_name, coalesce(v_tier, 0), 10, now())
    on conflict (user_id, week_id) do update set
      score       = public.weekly_scores.score + 10,
      player_name = excluded.player_name,
      tier_index  = excluded.tier_index,
      updated_at  = now();
  end if;
end
$fn$;
