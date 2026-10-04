-- ============================================================================
-- SEC-03 · LANGKAH 1c · HAK EKSEKUSI FUNGSI BARU  (USULAN. BELUM DIJALANKAN.)
-- Jalankan SETELAH SEC-03_1b. Statement biasa, tanpa dollar-quote.
-- Hanya pengguna login (authenticated) yang boleh memanggil; anon ditolak.
-- Fungsi LAMA submit_score_event TIDAK disentuh di sini (baru dicabut di SEC-03_2_lock).
-- ============================================================================

revoke all on function public.upsert_leaderboard_entry(text, integer, bigint, text, integer, integer, integer, integer) from public, anon;
grant execute on function public.upsert_leaderboard_entry(text, integer, bigint, text, integer, integer, integer, integer) to authenticated;

revoke all on function public.submit_score_event_v2(text, text, boolean, text, integer) from public, anon;
grant execute on function public.submit_score_event_v2(text, text, boolean, text, integer) to authenticated;

revoke all on function public.nq_reset_my_leaderboard() from public, anon;
grant execute on function public.nq_reset_my_leaderboard() to authenticated;

revoke all on function public.nq_tier_for_exp(bigint) from public, anon;
revoke all on function public.nq_level_for_exp(bigint) from public, anon;

notify pgrst, 'reload schema';
