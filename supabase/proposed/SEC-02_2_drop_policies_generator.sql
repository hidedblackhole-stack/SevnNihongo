-- ============================================================================
-- SEC-02 · LANGKAH 2 · HAPUS POLICY LAMA (opsional, defense in depth) — GENERATOR
--
-- Setelah SEC-02_1 (REVOKE) policy lama sudah tidak berefek, tetapi sebaiknya dibuang agar GRANT yang
-- tak sengaja muncul lagi kelak tidak otomatis membuka data. Nama policy TIDAK ditebak:
-- query ini membaca pg_policies production dan MENGHASILKAN pernyataan DROP statis.
--
-- Cara pakai:
--   1. Jalankan query di bawah (satu hasil).
--   2. Salin isi sel "drop_statements", periksa, lalu tempel dan jalankan sebagai skrip baru.
--   Tanpa dollar-quote, tanpa PL/pgSQL.
-- ============================================================================

select coalesce(string_agg(
         format('drop policy %I on public.%I;', policyname, tablename), E'\n' order by tablename, policyname),
       '-- (tidak ada policy baca yang perlu dibuang)') as drop_statements
from pg_policies
where schemaname = 'public'
  and tablename in ('vocabulary','kanji','grammar')
  and cmd in ('SELECT','ALL')
  and roles && array['public','anon','authenticated']::name[];
