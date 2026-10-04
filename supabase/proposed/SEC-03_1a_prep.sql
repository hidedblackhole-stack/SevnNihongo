-- ============================================================================
-- SEC-03 · LANGKAH 1a · PERSIAPAN (aditif, tidak mengunci/mengubah perilaku apa pun)
-- USULAN. BELUM DIJALANKAN. Jalankan SEBAGAI SATU FILE UTUH, tanpa seleksi.
-- Tanpa fungsi/dollar-quote, tanpa BEGIN/COMMIT. Idempotent (aman bila terulang).
-- Berdasarkan inspeksi production: leaderboard.user_id & weekly_scores.user_id bertipe TEXT.
-- ============================================================================

-- Kolom kredit laju EXP (leaky bucket). Null = dihitung dari last_updated oleh fungsi.
alter table public.leaderboard add column if not exists exp_credit_at timestamptz;

-- Log laju event skor (anti-spam). Hanya fungsi SECURITY DEFINER yang menyentuhnya.
create table if not exists public.score_event_log (
  id         bigserial primary key,
  user_id    text        not null,
  event_type text        not null,
  ref_id     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_score_event_log_user_time
  on public.score_event_log (user_id, created_at desc);

alter table public.score_event_log enable row level security;   -- tanpa policy = tertutup untuk API
revoke all on table public.score_event_log from public, anon, authenticated;
revoke all on sequence public.score_event_log_id_seq from public, anon, authenticated;
