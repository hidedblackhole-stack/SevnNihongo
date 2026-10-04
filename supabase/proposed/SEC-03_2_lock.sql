-- ============================================================================
-- SEC-03 · LANGKAH 4 · KUNCI TULIS LANGSUNG  (USULAN. *** JANGAN JALANKAN DULU ***)
--
-- Syarat WAJIB sebelum menjalankan:
--   [x] SEC-03_1a, 1b, 1c sudah dijalankan dan diverifikasi
--   [x] Klien production sudah memakai VITE_SECURE_LEADERBOARD=true (sudah di-deploy dan diuji: login -> belajar -> Rank)
-- Bila dijalankan sebelum klien memakai jalur aman, penulisan skor dari klien lama akan GAGAL.
--
-- Nama policy di bawah berasal dari inspeksi production (bukan tebakan). Bila ada yang tidak cocok,
-- statement gagal dan seluruh skrip batal (atomik) tanpa perubahan.
-- Tanpa dollar-quote/BEGIN. Backup ke sec_backup lebih dulu.
-- ============================================================================

create table sec_backup.sec03_policies as
  select now() as captured_at, schemaname, tablename, policyname, permissive,
         roles::text[] as roles, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename in ('leaderboard','weekly_scores');

create table sec_backup.sec03_grants as
  select now() as captured_at, table_schema, table_name, grantee, privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in ('leaderboard','weekly_scores');

revoke all on table sec_backup.sec03_policies, sec_backup.sec03_grants from public, anon, authenticated;

-- 1) Buang policy tulis terbuka (policy baca publik TETAP: "Allow public read ...")
drop policy "Allow user upsert leaderboard"   on public.leaderboard;
drop policy "Allow user upsert weekly_scores" on public.weekly_scores;

-- 2) Cabut hak tulis dari peran API (hanya fungsi SECURITY DEFINER yang boleh menulis)
revoke insert, update, delete, truncate on table public.leaderboard, public.weekly_scores from public, anon, authenticated;

-- 3) Cabut fungsi lama yang memercayai p_user_id dari klien
revoke all on function public.submit_score_event(text, text, integer, text, text, boolean) from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ----------------------------------------------------------------------------
-- ROLLBACK (statis; salin dan jalankan terpisah bila perlu; MEMBUKA KEMBALI penulisan terbuka):
--   create policy "Allow user upsert leaderboard"   on public.leaderboard   as permissive for all to public using (true) with check (true);
--   create policy "Allow user upsert weekly_scores" on public.weekly_scores as permissive for all to public using (true) with check (true);
--   grant insert, update, delete on table public.leaderboard, public.weekly_scores to anon, authenticated;
--   grant execute on function public.submit_score_event(text, text, integer, text, text, boolean) to anon, authenticated;
-- ----------------------------------------------------------------------------
