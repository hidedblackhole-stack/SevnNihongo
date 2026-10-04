# SEC-03 — AMANKAN LEADERBOARD & SKOR (RENCANA · belum ada yang dijalankan)

Tanggal: 2026-10-04. Dasar: inspeksi production Anda (policy, grant, fungsi), `src/lib/supabase.ts`, draft migrasi
`20261001_secure_leaderboard_and_saves.sql`, dan badan fungsi `submit_score_event` yang Anda kirim.
**Tidak ada perubahan production atau kode klien pada langkah ini.**

## 1. KONDISI SEKARANG (terbukti dari kode + katalog, tanpa menguji penulisan)

| Permukaan | Fakta | Dampak |
|---|---|---|
| `leaderboard` | policy `FOR ALL TO public USING(true) WITH CHECK(true)`; anon punya INSERT/UPDATE (DELETE sudah dicabut oleh SEC-03a) | Siapa pun dapat menimpa nama/EXP/level baris pemain mana pun, atau menyisipkan baris palsu |
| `weekly_scores` | policy `FOR ALL TO public USING(true) WITH CHECK(true)` (tabel saat ini kosong) | Sama; skor mingguan dapat dipalsukan sejak hari pertama dipakai |
| `submit_score_event(p_user_id text, ...)` | SECURITY DEFINER, EXECUTE untuk anon, **menerima `p_user_id`, `p_player_name`, `p_is_correct` dari klien**; +10/+15/+5 EXP ke `leaderboard.total_exp`; tanpa batas laju, tanpa pengecekan identitas, **tanpa `SET search_path`**, nama pemain tanpa batas panjang | Satu skrip kecil dapat menambah EXP ke akun siapa pun (atau diri sendiri) tanpa batas, dan membuat pemain fiktif |
| Alur EXP ganda | Klien memanggil fungsi di atas **dan** meng-`upsert` `total_exp` miliknya sendiri (`upsertLeaderboard`) | Dua jalur menulis kolom yang sama; hasil tidak deterministik |
| Pemain tamu | `userId` tamu = `uuidv4()` lokal; tamu **sudah tampil** di papan peringkat lewat jalur legacy | Jalur aman (butuh `auth.uid()`) akan menghilangkan tamu dari papan peringkat → **keputusan produk** (lihat §4) |

## 2. CACAT DI DRAFT MIGRASI REPO (harus diperbaiki sebelum dipakai)

1. **Batas laju EXP tidak efektif.** `max_allowed = prev.total_exp + 2000 + menit*400`, tetapi `prev.total_exp` dan `last_updated`
   ikut naik pada setiap panggilan. Penyerang yang login cukup memanggil RPC berulang: **+2.000 EXP per panggilan, tanpa batas
   jumlah panggilan**. Perlu *leaky bucket*: kredit berbasis waktu yang **dikonsumsi** oleh kenaikan yang diterima (kolom tambahan
   `exp_credit_at timestamptz`, penambahan kolom bersifat aditif/aman), tanpa "buffer per panggilan".
2. **Tipe.** Draft memakai `uid UUID` dan `WHERE user_id = uid`; fungsi production memakai `p_user_id text`. Jika kolom
   `leaderboard.user_id` bertipe `text`, draft gagal saat runtime (`text = uuid`). Tipe aktual harus dipastikan (inspeksi §5).
3. **B.4 salah signature:** `REVOKE ... submit_score_event(UUID, TEXT, ...)`; production: `(text, text, integer, text, text, boolean)`.
4. **Semantik berbeda dari fungsi lama.** Draft v2 hanya menambah `weekly_scores` (+10), sedangkan fungsi lama menambah `leaderboard.total_exp`.
   Desain yang saya usulkan: EXP all-time hanya lewat `upsert_leaderboard_entry` (berbatas laju); skor mingguan hanya lewat v2.
5. **`week_id`:** klien menghitung ISO-week dengan jam lokal, draft dengan `NOW()` server (UTC). Beda di batas minggu (±beberapa jam). Usulan: server yang menjadi satu-satunya penentu `week_id`.
6. **Validasi masukan:** `avatar_url` tidak dibatasi (usulan: maks 300 karakter, hanya `https://`); `p_level` hanya dicek 1–1000 (usulan: tidak diterima dari klien, dihitung dari EXP).
7. **Tier:** ambang `nq_tier_for_exp` (0/1.200/4.000/10.000/22.000/45.000/80.000/135.000/210.000/320.000) **cocok** dengan klien (`data/rpg/tiers.ts`),
   tetapi klien menerapkan *gating* stage; server hanya menghitung dari EXP → tier di papan peringkat = "tier potensial". Minor, perlu diketahui.
8. Semua fungsi baru sudah memakai `SET search_path = public` dan memeriksa `auth.uid()` — itu dipertahankan.

## 3. DESAIN TARGET

```
Klien (login)
  ├─ upsert_leaderboard_entry(nama, avatar, stat_*)  -> auth.uid(); EXP naik hanya sebatas leaky bucket; level & tier dihitung server
  ├─ submit_score_event_v2(event, ref, correct)       -> auth.uid(); anti-spam + anti-duplikat; week_id dari server; +10 weekly bila benar
  └─ SELECT leaderboard / weekly_scores               -> baca publik (tetap)
Tulis langsung ke leaderboard/weekly_scores           -> DITOLAK (tanpa policy tulis, grant tulis dicabut)
submit_score_event (lama, text)                       -> EXECUTE dicabut dari anon/authenticated
```

## 4. KEPUTUSAN PRODUK YANG DIBUTUHKAN DARI ANDA

| # | Pertanyaan | Opsi | Rekomendasi |
|---|---|---|---|
| D1 | Pemain tamu (belum login) di papan peringkat? | (a) hanya yang login; (b) tamu memakai *Supabase Anonymous Sign-ins* (uid asli, tetap berbatas laju, perlu aktifkan di Dashboard + perubahan klien kecil); (c) tamu tetap bebas (tidak aman) | **(a)** dulu (paling sederhana, paling aman); (b) bila kehilangan tamu terasa |
| D2 | Baris papan peringkat milik tamu yang sudah ada | tetap / dibersihkan setelah migrasi | Dibahas setelah data populasi dari inspeksi (lihat `rows_with_auth_account`) |
| D3 | Batas kenaikan EXP | 400/menit + kredit awal | Disesuaikan dengan EXP maksimum yang wajar per menit di app (saya periksa dari data aktual setelah inspeksi) |

## 5. LANGKAH & URUTAN (tiap langkah punya verifikasi + rollback; semua SQL tanpa dollar-quote)

| Langkah | Isi | Mengubah production? | Syarat sebelumnya |
|---|---|---|---|
| **0** | Jalankan `supabase/proposed/SEC-03_0_inspect_single.sql` → kirim hasilnya | Tidak (baca saja) | — |
| **1** | Saya tulis `SEC-03_1_functions.sql` sesuai tipe nyata: tabel `user_saves` (cloud save), `score_event_log`, kolom `exp_credit_at`, fungsi `upsert_leaderboard_entry` (leaky bucket), `submit_score_event_v2`, `nq_reset_my_leaderboard`. **Belum mengunci apa pun.** | Ya (aditif) | Hasil langkah 0 + keputusan D1/D3 |
| **2** | Uji di production tanpa mengubah perilaku: panggil RPC dengan akun uji; verifikasi anon **ditolak** | Tidak | Langkah 1 |
| **3** | Deploy klien dengan `VITE_SECURE_LEADERBOARD=true` (env Vercel; klien sudah mendukung flag ini) + uji login → belajar → Rank | Deploy | Langkah 2 |
| **4** | `SEC-03_2_lock.sql`: buang policy "Allow user upsert leaderboard/weekly_scores", cabut INSERT/UPDATE dari anon & authenticated, `REVOKE EXECUTE submit_score_event(text,...)` dari anon & authenticated | Ya | Langkah 3 stabil (klien lama yang masih terbuka di tab akan gagal menulis; itu diharapkan) |
| **5** | Verifikasi dari luar (anon: tulis ditolak, baca tetap 200) | Tidak | Langkah 4 |

Rollback tiap langkah dibuat sebagai SQL statis (grant/policy asli sudah tercatat di `sec_backup`, termasuk `sec03a_grants`).

## 6. YANG SAYA TIDAK AKAN LAKUKAN
- Tidak menguji penulisan ke tabel production (tidak mengubah data pemain).
- Tidak menjalankan SQL apa pun di Supabase Anda; saya tidak punya akses ke project itu.
- Tidak mengubah `VITE_SECURE_LEADERBOARD` atau deploy tanpa persetujuan Anda.

## 7. YANG SAYA BUTUHKAN SEKARANG
1. Hasil `SEC-03_0_inspect_single.sql` (sel `inspect_sec03`).
2. Jawaban D1 (rekomendasi: a) dan D3 (setuju dengan 400/menit, atau beri angka lain).

---

## 8. KEPUTUSAN & STATUS TERBARU (setelah inspeksi production)

**Keputusan Anda:** D1 = (a) hanya pemain login di papan peringkat · D3 = 400 EXP/menit.

**Fakta dari inspeksi:** `user_id` = **text** di `leaderboard` dan `weekly_scores`; `weekly_scores` sudah punya UNIQUE (user_id, week_id)
(jadi `ON CONFLICT` aman); tidak ada trigger; satu-satunya fungsi di `public` adalah `submit_score_event`.
Populasi: **937 baris leaderboard, hanya 261 punya akun login (±28%)**; 676 baris tamu akan **membeku** (tetap terlihat, tidak lagi
diperbarui) · 264 akun auth · satu baris dengan **1.012.268 EXP** (satu-satunya di atas 100.000; layak diperiksa manual: kemungkinan hasil pemalsuan).

**Validasi desain (simulasi aritmetika leaky bucket, bukan database):** penyerang yang memanggil RPC tiap 0,1 detik hanya naik
8.999 EXP dalam 10 menit (akun baru) dan rata-rata 410 EXP/menit dalam 8 jam; pemain wajar (30 EXP/menit + lonjakan 2.000) tersinkron penuh
(selisih 0); pemain legacy dengan 50.000 EXP tertinggal mengejar dalam ±66 menit. SQL-nya sendiri **belum pernah dijalankan** (tidak ada
database lokal) → uji di Preview dengan akun uji dulu (langkah 3).

### File siap (semua di `supabase/proposed/`, belum dijalankan)
| Langkah | File | Isi |
|---|---|---|
| 1a | `SEC-03_1a_prep.sql` | kolom `exp_credit_at`, tabel `score_event_log` (RLS, tertutup) — aditif, tanpa fungsi |
| 1b | `SEC-03_1b_functions.sql` | 5 fungsi (`upsert_leaderboard_entry`, `submit_score_event_v2`, `nq_reset_my_leaderboard`, helper tier/level); `$fn$`; bila editor menolak, jalankan per bagian "FUNGSI 1..5" |
| 1c | `SEC-03_1c_grants.sql` | EXECUTE hanya untuk `authenticated` |
| verifikasi | `SEC-03_1d_verify_single.sql` | satu hasil JSON |
| 4 | `SEC-03_2_lock.sql` | **JANGAN dulu**: buang policy tulis terbuka, cabut tulis, cabut `submit_score_event` lama |

### Perubahan kode klien (sudah di repo, aman karena hanya aktif bila flag menyala)
- `src/utils/weekId.ts` (baru) + `getCurrentWeekId()` kini UTC, identik dengan `week_id` server; 3 tes baru (batas tahun/minggu, zona waktu).
- `sendScoreEvent`: bila `VITE_SECURE_LEADERBOARD=true` dan belum login → dilewati (tamu tidak memicu error per jawaban).
- Tidak ada perubahan perilaku selama flag masih `false`.

### Urutan eksekusi (satu per satu; saya verifikasi dari luar di tiap langkah)
1. Anda jalankan **1a → 1b → 1c** (production; aditif, tidak mengunci apa pun). Lalu `1d` dan kirim hasilnya.
2. Saya cek dari luar: anon memanggil RPC baru harus **ditolak** (ditolak sebelum dieksekusi; tidak menulis apa pun).
3. Anda buat **Preview Deployment Vercel** dengan `VITE_SECURE_LEADERBOARD=true` (hanya environment Preview), login dengan akun uji, mainkan 1 kuis,
   lalu cek: baris Anda di Rank naik, tamu tidak error. Setelah lolos, set flag di Production + redeploy.
4. Setelah klien production stabil: jalankan **`SEC-03_2_lock.sql`**; saya verifikasi (anon tidak bisa menulis; baca tetap 200).
