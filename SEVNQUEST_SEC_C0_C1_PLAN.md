# SEVNQUEST — SECURITY FIRST: REMEDIASI TOKEN, RENCANA C0, RENCANA C1

Status: **hanya rencana + remediasi lokal token. Tidak ada migrasi production yang dijalankan. C1 belum diimplementasikan.**
Mengikuti keputusan: SECURITY FIRST → PERFORMANCE. Offline = **offline-lite**. C2 (question bank) **belum**.

## BACKLOG KEAMANAN

| ID | Isi | Status |
|---|---|---|
| SEC-01 | GitHub PAT terekspos | Remote lokal sudah dibersihkan. **Anda wajib revoke/rotate token di GitHub.** |
| SEC-02 | Tabel konten production terbaca massal (`vocabulary` 8.635, `kanji` 2.306, `grammar` 915) | **SELESAI untuk 3 tabel inti (diverifikasi: anon 401).** Sisa: SEC-02b (20 tabel lain) + SEC-02_2 (buang policy). |
| SEC-03 | **Policy `FOR ALL USING(true)` di `leaderboard` & `weekly_scores`**: siapa pun dapat mengubah/menghapus baris pemain; migrasi aman belum aktif | **Prioritas naik.** SEC-03a (mitigasi sementara) siap; SEC-03 penuh butuh urutan 4 langkah di atas. |
| SEC-04 | Perlindungan question bank (kunci jawaban di entity) | Ditunda sampai Content API terbukti (C2). |
| SEC-05 | Content API privat (search/entity/stage/quiz/deck) | Desain setelah C0+C1 stabil. |

Urutan: SEC-01 → SEC-02 → C1 (performa) → SEC-03 → desain C2.

---

## STATUS TERBARU (2026-10-04, setelah Anda menjalankan inspeksi + inti C0)

**SEC-02 inti: SELESAI & TERVERIFIKASI dari luar.** Anon key sekarang mendapat `401 / 42501 permission denied` pada
`vocabulary`, `kanji`, `grammar`; `leaderboard` tetap terbaca (app tidak terganggu). GraphQL: "pg_graphql extension is not enabled" (bukan jalur kebocoran).

Hasil inspeksi production (sumber kebenaran, menggantikan asumsi dari migrasi repo):
- RLS **aktif di semua 28 tabel**; tidak ada view, matview, realtime table, bucket storage, atau ekstensi graphql/pg_net.
- Satu-satunya fungsi public yang dapat dieksekusi anon: `submit_score_event` (SECURITY DEFINER, menerima `p_user_id` dari klien).
- Policy "Public read ... USING (true)" masih ada pada grammar, kanji, vocabulary, map, question, sentence, stage, stage_content
  (tidak berbahaya lagi pada 3 tabel inti karena grant dicabut; policy bisa dibuang lewat `SEC-02_2`).
- anon/authenticated punya GRANT penuh (termasuk DELETE/TRUNCATE) pada **semua** tabel, bertumpu hanya pada RLS.

**Update: SEC-02b dan SEC-03a SUDAH DIJALANKAN oleh Anda dan TERVERIFIKASI dari luar** — 20 tabel konten lain: anon 401; DELETE pada leaderboard/weekly_scores: 401 (42501); leaderboard/weekly_scores/user_* tetap terbaca (200/206); jumlah baris leaderboard tidak berkurang (928, tumbuh normal).
**Masih terbuka:** anon dapat meng-UPDATE/INSERT baris leaderboard/weekly_scores (pemalsuan skor) dan memanggil submit_score_event dengan p_user_id palsu → SEC-03 penuh.

**C1 SELESAI & TERUKUR (2026-10-04).** `sentences.json` tidak lagi diimpor klien (`bunpou.ts`: peta bacaan dihapus; fallback `ex.reading || ex.jp`).
Penjaga: `src/data/bunpou.golden.test.ts` (hash SHA-256 `BUNPOU_DATABASE` identik sebelum/sesudah + gerbang "setiap contoh punya reading").
Benchmark (build produksi, closure initial): **17,61 → 14,55 MB raw · 3,22 → 2,74 MB gzip (-15%)**; chunk `data-sentences` tidak ada di `dist/`;
string korpus di `dist/`: 0. 31 tes lulus, `tsc` bersih. Perubahan lain di repo: Service Worker `/api/*` network-only (cache `v2.7`), header keamanan
dasar di `vercel.json` (nosniff, Referrer-Policy, X-Frame-Options, HSTS; CSP sengaja ditunda karena berisiko merusak app), migrasi lama tidak lagi
membuat policy public-read pada database baru.

### TEMUAN BARU — SEC-03 naik prioritas (tinggi)
`leaderboard` dan `weekly_scores` punya policy `FOR ALL TO public USING (true) WITH CHECK (true)`
("Allow user upsert ..."). Artinya **siapa pun dengan anon key publik dapat meng-UPDATE, meng-INSERT, atau menghapus baris pemain mana pun**
(papan peringkat bisa dipalsukan atau dikosongkan). Ditambah `submit_score_event` yang memercayai `p_user_id` dari klien.
Saya **tidak menguji penulisan** (tidak mau mengubah data pemain); kesimpulan berasal dari policy + grant yang Anda kirim.

Skrip baru (belum dijalankan, tanpa dollar-quote):
- `SEC-02b_other_content_tables.sql` — REVOKE pada 20 tabel konten lain (klien: 0 query ke tabel-tabel itu).
- `SEC-03a_interim_block_deletes.sql` — mencabut DELETE/TRUNCATE di leaderboard & weekly_scores (klien tidak pernah menghapus; aman).
  **Hanya menutup penghapusan massal.** Pemalsuan skor (UPDATE/INSERT) baru tertutup oleh SEC-03 penuh.

SEC-03 penuh (urutan wajib agar leaderboard tidak mati): (1) terapkan migrasi `20261001_secure_leaderboard_and_saves.sql`
(membuat `user_saves`, `score_event_log`, RPC `upsert_leaderboard_entry`/`submit_score_event_v2`) → (2) deploy klien dengan
`VITE_SECURE_LEADERBOARD=true` → (3) baru buang policy "Allow user upsert ..." dan cabut INSERT/UPDATE/DELETE dari anon/authenticated
→ (4) cabut EXECUTE `submit_score_event` dari anon. Untuk (4) saya perlu isi fungsinya:
`select pg_get_functiondef('public.submit_score_event(text,text,integer,text,text,boolean)'::regprocedure);`

---

## A. GITHUB TOKEN EXPOSURE

```
GITHUB TOKEN EXPOSURE
- source:            .git/config  (remote "origin", URL berisi credential). Nilai TIDAK dicetak.
- tracked in git?:   NO   (git grep pola token di semua file ter-track: 0 hasil)
- history affected?: NO   (git log --all -S"ghp_" di seluruh riwayat, di luar data/lockfile: 0 commit)
- worktree/ignored:  NO   (pemindaian seluruh worktree selain node_modules/dist/.git: 0 file)
- .git lainnya:      hanya .git/config (FETCH_HEAD/logs/dll bersih; objects tidak dipindai karena immutable & tidak menampung config)
- remediation done:  origin diganti ke https://github.com/hidedblackhole-stack/SevnNihongo.git (tanpa credential);
                     verifikasi ulang: 0 sisa pola token di .git. Credential helper aktif: Git Credential Manager (manager).
- remediation REQUIRED (oleh Anda): REVOKE/ROTATE token di GitHub (token dianggap COMPROMISED).
                     Lalu autentikasi ulang lewat Credential Manager (login browser) atau token baru yang TIDAK ditaruh di URL.
- residual exposure: 2 transkrip sesi Claude di ~/.claude (jsonl) memuat token dari output tool. Tidak saya hapus
                     (tindakan destruktif di luar repo). Revoke token membuatnya tidak berguna.
- history rewrite:   TIDAK diperlukan & TIDAK dilakukan (token tidak pernah masuk riwayat git).
```

---

## B. C0 — RENCANA (JANGAN EXECUTE)

### Batasan yang jujur
Saya **tidak bisa membaca skema production SevnQuest**: Supabase MCP di sesi ini terhubung ke akun/organisasi lain
(project `Sevntracker`, `SevnStudio`, `absence`; **tidak ada** `iokhdhqnpslpwsxspvaj`). Saya tidak menyentuhnya.
OpenAPI REST hanya untuk `service_role` (anon → 401, bagus). Karena itu **nama policy production tidak boleh ditebak**:
migrasi inti memakai REVOKE (tidak butuh nama policy), dan nama policy dibaca dari katalog lewat generator yang menghasilkan SQL statis;
`SEC-02_0_inspect_single.sql` menghasilkan data BEFORE yang sebenarnya untuk Anda simpan.

File (semua di `supabase/proposed/`, sengaja BUKAN di `supabase/migrations/` agar tidak ikut ter-apply otomatis):

| File | Fungsi |
|---|---|
| `SEC-02_0_inspect_single.sql` | Inspeksi read-only, **satu hasil JSON** (editor Supabase hanya menampilkan statement terakhir) |
| `SEC-02_1_core.sql` | Inti migrasi: backup (CTAS) + enable RLS + REVOKE. **Tanpa `$$`/PL/pgSQL, tanpa BEGIN/COMMIT** |
| `SEC-02_2_drop_policies_generator.sql` | Menghasilkan `DROP POLICY` statis dari katalog production (opsional, defense in depth) |
| `SEC-02_3_rollback_generator.sql` | Menghasilkan skrip rollback statis dari backup |
| `SEC-02_4_verify_single.sql` | Verifikasi AFTER, satu hasil JSON |

> **Revisi 2026-10-04 (setelah percobaan pertama di SQL Editor gagal):** versi awal memakai blok `DO $$ ... $$`; editor Supabase memotong blok itu dan menyisipkan baris "enable RLS". Transaksi batal, **tidak ada perubahan di database** (dikonfirmasi: anon masih membaca 8.635/2.306/915 baris, tabel `sec_backup` tidak ada). Rancangan baru: statement biasa saja, kebocoran ditutup oleh REVOKE (permission ditolak sebelum RLS dievaluasi), dan nama policy dibaca lewat generator yang menghasilkan SQL statis.
> Catatan dari `rolconfig` authenticator (hasil Anda): ekstensi `safeupdate` aktif (UPDATE/DELETE tanpa WHERE ditolak, jadi tidak dipakai) dan `statement_timeout=8s` untuk peran API.

### BEFORE (yang sudah bisa dipastikan dari luar)
```
BEFORE
- RLS enabled?   Menurut migrasi repo: ya untuk vocabulary/kanji/grammar (+ sentence, question, stage, stage_content, map).
                 Production sebenarnya: BELUM TERVERIFIKASI -> jalankan SEC-02_0 (kunci `rls`).
- Policy:        Migrasi repo membuat "Public read for kanji/vocabulary/grammar/sentence/question/stage/map/stage_content"
                 FOR SELECT USING (true). Nama production AKTUAL: dibaca dari SEC-02_0 (kunci `policies`).
- SELECT grants: Terbukti anon bisa SELECT (probe: vocabulary 8.635 / kanji 2.306 / grammar 915 baris terbaca via anon key).
                 Grant persis: SEC-02_0 (kunci `table_grants`/`column_grants`).
- Affected roles: anon, authenticated (dan PUBLIC bila ada).
- Fakta tambahan (probe anon, hitung baris saja): tabel lain kosong tetapi terbaca (HTTP 200): sentence, question, stage,
  stage_content, map, kanji_writing, vocabulary_audio/writing/relation, sentence_vocabulary/grammar, reading, listening,
  tag, entity_tag, curriculum, relation, content_version, source, entity_source. Migrasi repo TIDAK mengaktifkan RLS
  pada tabel-tabel non-inti ini -> bila terisi kelak, terbuka (dan mungkin dapat ditulis anon bila ada grant).
```

### MIGRATION SQL
Lihat `supabase/proposed/SEC-02_1_core.sql`. Urutan, semuanya statement biasa:
```
create schema sec_backup (gagal bila sudah ada = guard alami)  ; revoke dari public/anon/authenticated
create table sec_backup.sec02_policies / _grants / _rls  AS SELECT ...   (backup kondisi asli)
alter table vocabulary, kanji, grammar enable row level security
revoke all on vocabulary, kanji, grammar from public, anon, authenticated  (service_role & postgres tidak disentuh)
notify pgrst, 'reload schema'
```
Dijalankan sebagai SATU permintaan multi-statement, jadi atomik. Opsional setelahnya: `SEC-02_2` menghasilkan `DROP POLICY` statis.

### ROLLBACK SQL
`SEC-02_3_rollback_generator.sql` menghasilkan skrip statis (grant asli, `create policy` persis dari backup, status RLS) yang Anda tempel
dan jalankan. **Catatan:** rollback membuka kembali baca publik. Darurat tanpa backup:
`grant all on table public.vocabulary, public.kanji, public.grammar to anon, authenticated;`

### AFTER EXPECTED
```
anon / authenticated  -> SELECT/INSERT/UPDATE/DELETE pada vocabulary, kanji, grammar: DITOLAK (HTTP 401/403, "permission denied for table")
service_role / postgres -> tetap penuh
Jumlah baris tidak berubah (8.635 / 2.306 / 915)
```

### C0-VERIFY (sisi klien, setelah migrasi; jangan taruh key di riwayat shell — pakai variabel lingkungan)
```bash
# Harus GAGAL (401/403), bukan 200/206:
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/vocabulary?select=*&limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/kanji?select=*&limit=1"      -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/grammar?select=*&limit=1"    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# Jalur alternatif — GraphQL juga harus gagal/kosong:
curl -s "$SUPABASE_URL/graphql/v1" -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{"query":"{ vocabularyCollection(first:1){ edges{ node{ id } } } }"}'
# Harus tetap BERHASIL (app tidak boleh rusak):
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/leaderboard?select=*&limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
```
Lalu uji manual di app production: login, Rank (leaderboard), simpan progres, Library, Buku Saku → semuanya tidak membaca tabel target.

### APP IMPACT
- Klien: **nol** (audit: tidak ada `supabase.from('vocabulary'|'kanji'|'grammar')` di `src/` maupun `scripts/`).
- `scripts/upload_to_supabase.mjs` (seeding admin): setelah migrasi hanya berhasil dengan `SUPABASE_SERVICE_ROLE_KEY` (sebelumnya
  bisa jatuh ke anon + policy sementara). Itu memang yang diinginkan.
- `supabase/migrations/20260911_identity_architecture.sql` (baris ~507–514) **akan membuat ulang policy public-read** bila migrasi
  itu dijalankan di database baru. Usulan setelah approval: ganti baris tersebut dengan komentar rujukan SEC-02, supaya fresh
  DB tidak kembali terbuka. (Belum diubah.)

### Audit JALUR ALTERNATIF (bukan hanya RLS)
| Jalur | Hasil audit | Sisa pekerjaan |
|---|---|---|
| REST tabel | Terbuka (terbukti) → ditutup oleh C0 | verifikasi curl di atas |
| OpenAPI/skema | anon ditolak (401, hanya service_role) | — |
| GraphQL (`pg_graphql`) | mengikuti grant+RLS yang sama → tertutup oleh REVOKE; ada tes curl | konfirmasi ekstensi aktif (kunci `extensions`) |
| View / materialized view | tidak dapat dienumerasi dari anon | kunci `views`/`view_options`; view tanpa `security_invoker` melewati RLS |
| RPC / fungsi | Klien memakai `submit_score_event[_v2]`, `upsert_leaderboard_entry`; sisanya tidak diketahui | kunci `functions`: fungsi SECURITY DEFINER yang dapat dieksekusi anon dan menyentuh tabel target |
| Realtime | tergantung publikasi | kunci `realtime_tables` |
| Storage | probe anon `GET /storage/v1/bucket` → `[]` (tidak ada bucket terlihat) | kunci `storage_buckets` |
| Edge Functions | repo tidak punya `supabase/functions`; probe `/functions/v1/` → 404 | cek Dashboard |

**Aturan:** C0 dianggap selesai hanya jika kunci `views`, `functions`, `realtime_tables`, `storage_buckets` tidak menunjukkan jalur lain yang membaca tabel target untuk anon.

---

## DECISION 4 — OFFLINE-LITE: AUDIT SERVICE WORKER

`public/sw.js` (aktif di production; dimatikan di localhost):
- Pre-cache: hanya ikon/manifest. ✅
- HTML: network-first. ✅  · Supabase/proxy: tidak di-cache. ✅
- **Aset statis: CACHE-FIRST, dan SEMUA GET non-HTML yang sukses di-`cache.put`.** ❌ Artinya setiap chunk `data-*.js`
  (kotoba 5,8 MB, kanji-questions 3,5 MB, sentences 3,1 MB, dst. = **17,6 MB**) tersimpan **permanen** di CacheStorage setelah
  kunjungan pertama = mirror offline penuh dari seluruh database, bertentangan dengan keputusan offline-lite.

Aturan yang diusulkan (diimplementasikan nanti, bersama C1/Content API; belum diubah):
1. `/api/*` → **network-only** (jangan pernah di-cache oleh SW); cache jangka pendek hanya di memori klien.
2. Allow-list cache: shell (`index.html`, `index-*.js`, `App-*.js`, `vendor-*.js`, CSS, ikon, font, aset UI/avatar).
3. Chunk `data-*.js` dan `/data/*` (kecuali stroke yang memang aset UI kecil): **tidak di-cache oleh SW** setelah dataset keluar dari bundle.
4. Naikkan `CACHE_NAME` agar cache lama (yang sudah berisi dataset di perangkat pengguna) dibersihkan saat `activate`.
5. Offline yang tetap didukung: shell UI, pengaturan, progres tersimpan, konten kecil yang barusan dibuka (cache memori/IDB berbatas + TTL).

Catatan: selama dataset masih ada di bundle, aturan #3 belum bisa diterapkan tanpa merusak app (chunk itu dibutuhkan). Jadi C1/C3 dulu, baru SW diketatkan.

---

## C. C1 — RENCANA IMPLEMENTASI + BENCHMARK SEBELUM

### Temuan yang mengubah rencana
`sentences.json` hanya dipakai di `src/data/bunpou.ts:81`:
```ts
reading: ex.reading || sentenceReadingMap.get(ex.jp) || ex.jp,
```
Pengukuran pada data nyata: **1.704 contoh Bunpou, 1.704 sudah punya `reading` (0 tanpa reading)** → cabang
`sentenceReadingMap.get(...)` **tidak pernah dijalankan**. Data minimum yang dibutuhkan `bunpou.ts` dari korpus = **0 entri**.
Jadi tidak perlu "peta minimal" (274 KB bila semua contoh dipakai) maupun server: cukup **menghapus ketergantungan**.
Tidak ada konsumen lain `sentences.json` di `src/`; `sentence_links.json` tidak punya konsumen sama sekali (dead).

### Langkah (satu slice kecil)
1. **Uji penjaga dulu (sebelum mengubah kode):** `src/data/bunpou.golden.test.ts`
   - golden hash SHA-256 dari `BUNPOU_DATABASE` (id, title, level, examples, meaningId, formula) = nilai BEFORE di bawah;
   - invarian: setiap contoh di `db/bunpou.json` punya `reading` non-kosong (inilah syarat yang membuat penghapusan aman;
     gerbang kualitas data pengganti korpus runtime). Tambahkan ke `npm test`.
2. **Ubah `bunpou.ts`:** hapus `import sentencesJson`, hapus pembangunan `sentenceReadingMap`, dan ubah baris 81 menjadi
   `reading: ex.reading || ex.jp` (fallback terakhir identik dengan perilaku sekarang).
3. **Tidak menghapus** `sentences.json`/`sentence_links.json` dari repo (aturan legacy); hanya memastikan tidak diimpor kode klien.
4. **Verifikasi:** `tsc`, seluruh tes (termasuk golden hash tidak berubah), build produksi, skrip closure (AFTER), dan:
   `grep` string unik korpus (mis. `sen_kt_kotoba_0001`) di `dist/` → harus **0 hasil**.
5. **Regresi:** Bunpou IDs, contoh/reading, Universal Search, Library Bunpou, mastery/SRS/Deck/Stage tidak tersentuh (modul yang
   mengimpor `data/bunpou` tidak berubah antarmukanya).
6. **Rollback:** satu commit → `git revert`.

### BENCHMARK BEFORE (build produksi saat ini)
```
Initial dependency closure (index + App + semua static imports; 17 file):
  raw    : 17,61 MB
  gzip   :  3,22 MB
  boot (index + vendor-react): 0,19 MB raw / 0,06 MB gz

Chunk data-sentences-*.js : 3,05 MB raw / 0,48 MB gzip
  dalam closure App? YA. Diimpor statis oleh: App, BukuSakuView, DungeonBattleModule, LeaderboardView,
  LibraryView, RecallModule, SettingsView, WorldView (semua lewat chunk bersama; sumbernya satu: data/bunpou.ts)
Kompilasi V8 chunk sentences (Node, indikatif): ~67 ms ; JSON.parse sentences.json: ~23 ms (mesin PC; HP 3–5x lebih lambat)
Golden: BUNPOU sha256 = e65ff12f794658c1d2e13c0a7ee420e677bb154206936cd0a35ecf2f240155ad  (915 item, 1.704 contoh)
Tes saat ini: 26 lulus; tsc bersih; build lulus.
```

### TARGET AFTER (prediksi, akan diukur ulang dengan skrip yang sama)
```
Initial closure : 17,61 -> ~14,56 MB raw (-3,05)   |  3,22 -> ~2,74 MB gzip (-0,48, ≈ -15%)
data-sentences chunk : tidak ada di dist/
Parse/compile awal   : -(~67 ms compile + eksekusi literal 3 MB) di mesin PC; proporsional lebih besar di HP
Perubahan perilaku   : tidak ada (golden hash identik)
```
Tidak mengubah: Bunpou IDs, perilaku kalimat, output reading, ID kanonik, mastery, SRS, Stage, Deck, Universal Search.

---

## DECISION 5 — C2 BELUM

Tidak disentuh. Desain Quiz Session API (server memilih soal → klien menerima soal+opsi tanpa kunci → `submitAttempt` divalidasi server →
hasil/penjelasan → mastery/activity/reward) dibuat **setelah** C0 aman, C1 selesai & terukur, dan batas Content API terbukti.

---

## STOP — MENUNGGU ANDA
1. Revoke/rotate token GitHub (SEC-01) — tindakan Anda.
2. Jalankan `SEC-02_0_inspect_single.sql` di SQL Editor SevnQuest dan kirim isi sel `inspect` (policy, view, fungsi, realtime, storage) —
   atau setujui `SEC-02_1_core.sql` setelah membaca SQL-nya. **Saya tidak akan menjalankannya sebelum approval eksplisit**
   (dan saya tidak punya akses ke project production ini).
3. Setujui rencana C1 di atas (satu perubahan kecil di `bunpou.ts` + uji golden) sebelum saya mengimplementasikannya.
