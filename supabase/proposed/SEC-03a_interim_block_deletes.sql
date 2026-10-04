-- ============================================================================
-- SEC-03a · MITIGASI SEMENTARA leaderboard & weekly_scores (USULAN. BELUM DIJALANKAN.)
--
-- Temuan (inspeksi production Anda):
--   leaderboard   : policy "Allow user upsert leaderboard"   FOR ALL TO public USING (true) WITH CHECK (true)
--   weekly_scores : policy "Allow user upsert weekly_scores" FOR ALL TO public USING (true) WITH CHECK (true)
--   + anon & authenticated punya DELETE/INSERT/UPDATE/TRUNCATE.
--   => siapa pun dengan anon key publik dapat MENGUBAH atau MENGHAPUS baris pemain mana pun
--      (mis. DELETE ...?user_id=neq.x menghapus hampir seluruh papan peringkat).
--
-- Mitigasi ini hanya menutup kerusakan terbesar tanpa merusak aplikasi:
--   Klien lama HANYA melakukan select + upsert (INSERT/UPDATE) pada leaderboard; ia tidak pernah DELETE/TRUNCATE
--   (audit src/lib/supabase.ts). Jadi mencabut DELETE & TRUNCATE aman bagi klien production.
--
-- YANG TIDAK DISELESAIKAN (butuh SEC-03 penuh): anon masih dapat meng-UPDATE/INSERT baris mana pun
--   (memalsukan skor atau menimpa nama pemain lain). Itu hanya tertutup dengan migrasi
--   20261001_secure_leaderboard_and_saves.sql + VITE_SECURE_LEADERBOARD=true + mencabut policy terbuka.
--
-- Pola: tanpa dollar-quote/BEGIN, satu permintaan = atomik. Backup grant ke sec_backup.
-- ============================================================================

create table sec_backup.sec03a_grants as
  select now() as captured_at, table_schema, table_name, grantee, privilege_type, is_grantable
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name in ('leaderboard','weekly_scores');

revoke all on table sec_backup.sec03a_grants from public, anon, authenticated;

revoke delete, truncate on table public.leaderboard, public.weekly_scores from public, anon, authenticated;

notify pgrst, 'reload schema';

-- Rollback:
--   grant delete, truncate on table public.leaderboard, public.weekly_scores to anon, authenticated;
