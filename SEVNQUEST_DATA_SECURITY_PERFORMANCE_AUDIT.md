# SEVNQUEST — DATA SECURITY & PERFORMANCE AUDIT

Tanggal: 2026-10-04 · Status: **AUDIT SAJA (read-only). Tidak ada refactor/migrasi yang dilakukan.**
Metode: graf import statis nyata (esbuild metafile dari `src/App.tsx`), ukuran build produksi (`dist/`), pembacaan
migrasi Supabase, pemeriksaan git/konfigurasi, dan satu probe baca-saja (hanya **jumlah baris**) ke REST Supabase
memakai anon key publik yang memang sudah ada di klien. Tidak ada data konten yang diunduh, tidak ada penulisan.

---

## 0. TEMUAN PRIORITAS (urut keparahan)

| # | Temuan | Tingkat | Aksi |
|---|---|---|---|
| F1 | **POTENTIAL SECRET FOUND** — `.git/config` (remote `origin`) menyimpan **GitHub Personal Access Token di dalam URL**. Nilai sengaja tidak dicetak di sini. | KRITIS | **ROTATE REQUIRED** (cabut token di GitHub, ganti remote ke URL tanpa token / credential manager). Token juga muncul di output tool sesi ini. |
| F2 | **Konten proprietary sudah dapat diunduh massal dari Supabase production oleh siapa pun.** Kebijakan RLS `Public read ... USING (true)` pada `vocabulary` (**8.635 baris**), `kanji` (**2.306**), `grammar` (**915**) memungkinkan `GET /rest/v1/<tabel>?select=*` dengan anon key publik, berpaginasi. Klien **tidak pernah** membaca tabel-tabel ini (`grep` nol hasil), jadi kebijakan itu murni permukaan serangan. | TINGGI | Cabut policy public-select di tabel konten (aman bagi klien saat ini). Perlu persetujuan Anda (perubahan DB). |
| F3 | Migrasi `20261001_secure_leaderboard_and_saves.sql` **belum diterapkan di production**: `user_saves` dan `score_event_log` → HTTP 404; `VITE_SECURE_LEADERBOARD` default `false`; policy tabel `leaderboard` di migrasi masih dikomentari. Leaderboard (886 baris) memakai jalur lama. Apakah anon/auth bisa menulis langsung ke `leaderboard` **belum diverifikasi** (sengaja tidak diuji dengan menulis). | SEDANG | Verifikasi policy tabel `leaderboard` lewat dashboard; terapkan migrasi bila siap. |
| F4 | Bundle awal membawa ~21 MB data mentah (~3,5 MB gzip) lewat 5 modul "ringan" (lihat §2). | Performa | Lihat §11–§12. |
| F5 | `ENX_API_KEY` (gateway developer berbayar) ada di `.env` lokal. **Tidak** pernah di-commit (`git log -- .env` kosong, `.env*` di-ignore), tidak dipakai klien. Tetapi nilainya sempat tampil di output tool sesi ini. | RENDAH | Pertimbangkan rotasi; jangan pernah dipakai untuk fitur pengguna. |

Yang **aman**: anon JWT di `src/lib/supabase.ts` dan 2 skrip memang `role=anon` (dekode klaim, bukan nilai). Tidak ada
`VITE_*` rahasia (hanya `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SECURE_LEADERBOARD`). `service_role`
hanya dirujuk sebagai **nama env** di `scripts/upload_to_supabase.mjs` (tidak ada nilai di repo). Tidak ada source map di
`dist/`. Repositori: probe tanpa autentikasi ke `api.github.com/repos/hidedblackhole-stack/SevnNihongo` → **HTTP 404**,
konsisten dengan repo **private** (tidak bisa dipastikan 100%; `gh` tidak terpasang). Jika repo ternyata publik, seluruh
`src/data/db/*.json` (26 MB, ter-track git) terbuka — pastikan di pengaturan GitHub.

---

## 1. CURRENT INITIAL LOAD GRAPH

`index.html` → `index-*.js` (boot + BootSplash) → **dynamic import `App.tsx`** → chunk `App` yang **statis** mengimpor:

```
App.tsx
├─ hooks/usePlayerActions.ts ──► data/kotoba.ts ──► db/kotoba.json                      7.186 KB
│                            ├─► data/kanji.ts  ──► db/kanji.json                        1.349 KB
│                            │                  └► data/questionBank.ts ─► db/kanji_questions.json        4.521 KB
│                            │                                          ├► db/kanji_extreme_100_stages.json 1.713 KB
│                            │                                          └► db/bunpou_questions.json         1.513 KB
│                            └─► data/bunpou.ts ──► db/bunpou.json                       1.310 KB
│                                               ├► db/sentences.json   (hanya untuk peta bacaan!) 3.582 KB
│                                               ├► bunpouMetadata.ts ─► bunpouCuratedDict.json      75 KB
│                                               └► bunpouSubKnowledge.ts                            44 KB
├─ state/loadPlayerState.ts ──► data/maps.ts ──► data/world/stages.json                    232 KB
├─ state/canonicalizeStats.ts ──► kotoba/kanji/bunpou   (cek "ID ada?")
├─ utils/ascension.ts ─────────► kotoba/kanji/bunpou   (hitung jumlah per level JLPT)
├─ utils/decks.ts ─────────────► kotoba/kanji/bunpou   (resolve DeckItemRef)
└─ components/modals/CharacterStatusModal ─► utils/mastery.ts ─► kotoba/kanji/bunpou + data/dokkai.ts ─► dokkai.json 117 KB
```

**Akar masalah:** bukan satu `import` besar, melainkan lima modul "ringan" (`usePlayerActions`, `mastery`, `ascension`,
`decks`, `canonicalizeStats`) yang masing-masing hanya butuh *sebagian kecil* data (ID ada/tidak, kategori, jumlah per
level, judul), tetapi mengimpor database penuh. Akibatnya Castle tidak bisa tampil sebelum ±21 MB di-parse.
Lazy-load per tab (yang sudah ada) **tidak** membantu karena chunk `App` sendiri sudah membawanya.

## 2. DATASET SIZE TABLE

| Dataset | File | Raw | Build gzip | Konsumen utama | Di initial load? | Klien wajib? | Server-side mungkin? | Parsial? | Sensitivitas IP | Kelas |
|---|---|---:|---:|---|:---:|:---:|:---:|:---:|:---:|---|
| Kotoba | `db/kotoba.json` (8.600) | 7,2 MB | 1,1 MB | 30 file | **Ya** | judul/ID saja | Ya | Ya (cari/ID) | TINGGI | CONTROLLED_CONTENT |
| Kanji | `db/kanji.json` (2.356) | 1,3 MB | 186 KB | 23 file | **Ya** | sebagian | Ya | Ya | TINGGI | CONTROLLED_CONTENT |
| Bunpou | `db/bunpou.json` (915) | 1,3 MB | 320 KB | 18 file | **Ya** | sebagian | Ya | Ya | TINGGI | CONTROLLED_CONTENT |
| Question bank kanji | `db/kanji_questions.json` | 4,5 MB | 427 KB | `questionBank`→`kanji.ts` | **Ya** | saat kuis | Ya | Ya (per sesi) | **SANGAT TINGGI** (kunci jawaban) | SERVER_PRIVATE |
| Kanji extreme stages | `db/kanji_extreme_100_stages.json` | 1,7 MB | 152 KB | `questionBank` | **Ya** | saat stage | Ya | Ya | TINGGI | SERVER_PRIVATE |
| Question bank bunpou | `db/bunpou_questions.json` | 1,5 MB | 236 KB | `questionBank`→`bunpou.ts` | **Ya** | saat kuis | Ya | Ya | **SANGAT TINGGI** | SERVER_PRIVATE |
| Sentences | `db/sentences.json` | 3,6 MB | 495 KB | **hanya** `bunpou.ts` (peta bacaan) | **Ya** | **tidak** | Ya | Ya | TINGGI | CONTROLLED_CONTENT |
| Sentence links | `db/sentence_links.json` | 1,2 MB | — | **tidak ada konsumen** (dead, tidak masuk bundle) | Tidak | Tidak | — | — | SEDANG | (dead) |
| Tryouts JLPT | `data/tryouts/**` (~100 file) | ~2,4 MB | 451 KB | `LibraryView` (lazy) | Tidak (lazy) | saat latihan | Ya | Ya | TINGGI | SERVER_PRIVATE |
| Dokkai / Choukai | `db/dokkai.json`, `choukai.ts` | 117 KB | 24 KB | `mastery.ts` | **Ya** | sebagian | Ya | Ya | TINGGI | CONTROLLED_CONTENT |
| Stage/World | `world/stages.json`, `maps.json` | 232 KB+ | 30 KB | `loadPlayerState`→`maps` | **Ya** | ya (World) | Ya | Ya | SEDANG–TINGGI (kurikulum) | CONTROLLED_CONTENT |
| Aliases | `db/kotoba_aliases.json` | kecil | kecil | `entityIds` | Ya | Ya | — | — | RENDAH | PUBLIC_CLIENT |
| Furigana | `furiganaDictionary.json` | 257 KB | 71 KB | UI | Tidak (lazy) | Ya | — | — | RENDAH | PUBLIC_CLIENT |
| Stroke data | `public/data/*-strokes` | 25 MB | on-demand | writing canvas | Tidak | Ya | — | — | RENDAH | PUBLIC_CLIENT |
| Template decks / official books | `officialBooks`, `templateDecks` | ~100 KB | 24 KB | Buku Saku | Tidak (lazy) | Ya | Ya | — | SEDANG | CONTROLLED_CONTENT |
| Rule konjugasi | `conjugationRules/Bank`, `inflectionEngine` | ~200 KB | — | Dojo/Sandbox | lazy | Ya | Ya | — | SEDANG | PUBLIC_CLIENT |
| Progress pemain | `PlayerStats`, deck, mastery, SRS | — | — | semua | — | Ya | — | — | — | USER_PRIVATE |

Total `src/data` = 26 MB; yang terjangkau statis dari `App.tsx` = **≈21,1 MB raw** (angka dari esbuild metafile).
Chunk produksi terbesar: kotoba 5,77 MB/1,14 MB gz · kanji-questions 3,49/0,43 · sentences 3,13/0,50 · tryouts 2,40/0,45
· bunpou-questions 1,28/0,24 · kanji-extreme 1,19/0,15 · bunpou 1,12/0,32 · kanji 0,85/0,19. Semua data ≈ 3,5 MB gzip.

## 3. SECURITY CLASSIFICATION (risiko IP)

- **HIGH:** question bank + kunci jawaban (kanji/bunpou/tryouts) · isi kotoba/kanji/bunpou terkurasi (arti Indonesia,
  `definitionId`, contoh, kolokasi) · komposisi stage/kurikulum.
- **MEDIUM:** rekomendasi adaptif, pemilihan kelemahan (`utils/mastery.ts`) · strategi deck/SRS · aturan reward/EXP.
- **LOW:** rule konjugasi (mengikuti tata bahasa baku), furigana, stroke data, UI.

## 4. CURRENT CLIENT-EXPOSED IP

Semua dataset di §2 dikirim ke setiap pengunjung (tanpa login) sebagai JS (minified, tidak diproteksi). Ditambah
**jalur kedua yang sudah hidup**: REST Supabase anon (F2). Jawaban kuis embedded di objek entity (`KanjiItem.questions[].correctIndex`,
`BunpouItem.questions`) sehingga kunci jawaban ikut bersama materi.

## 5. CURRENT SUPABASE ACCESS MODEL

- Klien: anon key (publik, wajar bila RLS benar). Proxy same-origin `/supabase-proxy` di host (Vercel rewrite); di localhost langsung.
- Dipakai klien: `rpc('submit_score_event[_v2]')`, `rpc('upsert_leaderboard_entry')`, tabel `leaderboard`, auth.
- **Tidak dipakai klien:** tabel konten (`vocabulary`, `kanji`, `grammar`, `sentence`, `question`, `stage*`, `map`).
- RLS: tabel konten **public SELECT true** (F2); `user_mastery/srs/activity` per-user (policy ada di migrasi; tabel
  `user_mastery` ada & kosong di production); `user_saves` & `score_event_log` **belum ada** di production (F3).
- Tidak ada Edge Function. Satu-satunya fungsi server baru: `api/deck-topic.ts` (Vercel, opsional).

## 6. CURRENT SECRET EXPOSURE CHECK

| Item | Hasil |
|---|---|
| `service_role` di klien | **Tidak ada** (hanya nama env di skrip admin) |
| `VITE_*` rahasia | **Tidak ada** |
| Anon JWT hard-coded | Ada, `role=anon` (acceptable) |
| `.env` di git history | **Tidak** (tidak pernah ter-track) |
| GitHub PAT di remote URL | **POTENTIAL SECRET FOUND** · `.git/config` · **ROTATE REQUIRED** |
| `ENX_API_KEY` | lokal saja; pertimbangkan rotasi (F5) |
| Source map produksi | Tidak ada |
| Security headers (CSP/HSTS/XFO) | `vercel.json` tidak memuat satu pun (defense-in-depth, bukan perlindungan IP) |

## 7. CANONICAL ENTITY DEPENDENCY

ID kanonik: kotoba `kotoba_0564`; kanji `item.id || character`; bunpou `w1d1g1` (alias `bunpou_00X`); alias kotoba lewat
`kotoba_aliases.json` + `defineLookupAlias` (kunci pencarian non-enumerable pada objek DB). Tugas migrasi **tidak boleh
mengubah** ini. Konsekuensi: server harus melayani ID yang sama dan klien butuh "ID → ada? kategori? judul" tanpa
data penuh (lihat §12).

## 8. SEARCH DEPENDENCY

`engine/search/universalSearch.ts` membangun indeks turunan **di klien** dari DB penuh (Library, Sandbox, Buku Saku, deck builder).
Bila DB dipindah ke server, indeks ini harus ikut pindah (endpoint `GET /api/content/search?q=&type=&limit=` dengan kontrak
`SearchResult` yang sama) — engine yang ada bisa dijalankan **apa adanya di server** (murni TS, tanpa DOM).
Saat ini pencarian bergantung pada DB lokal sehingga **tidak bisa dimigrasi sebelum** ada pengganti yang setara.

## 9. DECK DEPENDENCY

`DeckItemRef {id, category, customData?}` di-resolve di `utils/decks.ts` lewat DB penuh (30 titik). Deck lama tetap valid
karena hanya menyimpan ID kanonik. Deck AI baru (Studio Deck Otomatis) sudah hanya menyimpan ID. Resolver deck perlu
versi async/berbasis manifest.

## 10. MASTERY / SRS DEPENDENCY

`mastery.ts` memakai DB untuk **judul tampilan**, level, dan rekomendasi; `ascension.ts` untuk **jumlah item per level**;
`canonicalizeStats.ts` untuk memvalidasi/mengkanonikalkan ID di save lama. Semuanya hanya butuh metadata kecil
→ kandidat **manifest ramping** (`id, kategori, level, judul`), bukan konten penuh. Kunci mastery tidak berubah.

## 11. PROPOSED SERVER BOUNDARY

```
CLIENT (shell + PlayerStats + manifest ramping ± ratusan KB)
   │
   ▼  Content API (Vercel functions; rate-limit; hard limit/pagination)
   ├─ GET  /api/content/search?q&type&limit(≤50)&cursor      → SearchResult[]  (engine universalSearch di server)
   ├─ GET  /api/content/entity/:type/:id                     → 1 entity detail
   ├─ GET  /api/stages/:stageId/content                      → materi satu stage
   ├─ POST /api/quiz/start {stageId|config} → {sessionId, questions[] tanpa kunci}
   ├─ POST /api/quiz/answer {sessionId, qid, choice}         → {correct, explanation}   (kunci tetap di server)
   └─ POST /api/deck-topic                                   → sudah ada
   ▼
PRIVATE DATA (berkas/tabel hanya di server, tidak masuk `dist/`)
```
Tidak ada endpoint `all-*`/export. `limit` default 20, maks 50; cursor wajib untuk browse.

## 12. FIRST MIGRATION CANDIDATES (prioritas = dampak bundle × nilai IP ÷ risiko)

| Kandidat | Dampak bundle (gz) | Nilai IP | Coupling/risiko | Skor | Catatan |
|---|---:|:---:|:---:|:---:|---|
| **C0. Tutup kebocoran Supabase (F2)** | 0 | TINGGI | **sangat rendah** (klien tak memakai) | ★★★★★ | Bukan refactor kode; 1 perubahan policy. |
| **C1. `sentences.json` keluar dari bundle awal** | **−495 KB** | tinggi | **sangat rendah** (1 konsumen, hanya peta bacaan) | ★★★★★ | Peta bacaan dihitung saat build / dilayani server; klien tidak perlu korpus 3,6 MB. |
| **C2. Question bank (kanji/bunpou/extreme) → Quiz API** | −815 KB | **sangat tinggi** (kunci jawaban) | **tinggi** (QuizEngine + ≥12 modul membaca `correctIndex`; embedded di `KanjiItem/BunpouItem.questions`) | ★★★★ | Dampak IP terbesar, tapi paling berisiko; butuh keputusan offline & validasi jawaban. |
| C3. Manifest ramping untuk 5 modul boot + DB penuh di balik API | −1,6 MB (kotoba+kanji+bunpou) | tinggi | sedang–tinggi (30 importer kotoba) | ★★★ | Kunci supaya Castle ringan; prasyarat C4. |
| C4. Search/Library/entity via API | — | tinggi | tinggi (UX loading/error di semua konsumen) | ★★★ | Setelah C3. |
| C5. Tryouts → API per sesi | −451 KB (sudah lazy) | tinggi | sedang | ★★ | Sudah tidak di initial; murni IP. |

## 13. EXPECTED PERFORMANCE IMPACT

- C1 saja: initial JS **−0,5 MB gz (−3,6 MB raw)**, tanpa perubahan UX.
- C1+C2: **−1,3 MB gz (−11 MB raw)** dari initial.
- C1–C3 (tanpa konten penuh di bundle awal): initial turun dari ~3,6 MB gz menjadi kira-kira **0,3–0,5 MB gz** untuk Castle usable
  (App 106 KB + vendor + manifest), dengan Library/Stage/Quiz memuat per-permintaan (kisaran 5–50 KB per request).
- Biaya baru: latensi jaringan di Library/Stage/Quiz (perlu loading/error/retry + cache memori per stage/pencarian).

## 14. EXPECTED SECURITY IMPACT

- C0: menutup ekstraksi massal **yang sudah mungkin hari ini** (8.635 + 2.306 + 915 baris) — dampak terbesar per usaha.
- C1–C4: dataset tidak lagi ada di `dist/` → ekstraksi massal sederhana via DevTools/unduh chunk **tidak lagi mungkin**; scraper harus
  menembus rate-limit + paginasi (sulit, bukan mustahil).
- C2: kunci jawaban tidak lagi dikirim massal; menurunkan kemudahan membuat bot/cheat leaderboard berbasis kuis.

## 15. MIGRATION RISKS

1. **Offline/PWA:** `public/sw.js` melakukan cache-first aset dan ada build **Standalone** (`sync_standalone.cjs`). Server-backed content = fitur offline penuh hilang untuk konten yang dilindungi. *Full offline dan konten terlindungi saling bertentangan* — butuh keputusan produk.
2. **Pencarian:** semua konsumen pencarian (Library, Sandbox, Buku Saku, deck builder) saat ini sinkron & lokal.
3. **Embedded answer keys:** `questions[]` melekat pada `KanjiItem`/`BunpouItem`; memisahkannya menyentuh banyak modul.
4. **Mastery/SRS/Deck:** harus tetap resolve ID tanpa DB penuh → butuh manifest dan alias yang identik.
5. **Biaya & kuota:** Vercel functions + (opsional) Supabase; rate-limit in-memory pada serverless hanya best-effort.
6. **Tower & arcade:** `floorGenerator`, `roundResolver`, `dungeonGenerator`, arcade memakai DB langsung (belum diaudit mendalam).
7. **Kuota/latensi proxy produksi** (`/supabase-proxy`) belum terukur; jangan menilai dari dev proxy.

---

## WHAT WE CAN PROTECT / WHAT WE CANNOT

**Dapat dilindungi (tinggi terhadap ekstraksi kasual & massal):** dataset yang tidak pernah dikirim penuh; kunci jawaban; kurikulum
penuh; indeks pencarian.
**Tidak dapat sepenuhnya dilindungi:** konten yang sedang dilihat pengguna (bisa disalin/screenshot); pengguna yang sabar men-scrape
lewat UI/API yang sah dalam batas rate-limit; materi yang memang harus tersedia offline. Tujuannya **mencegah ekstraksi massal**,
bukan membuat data mustahil disalin.

## STATUS KEPUTUSAN YANG DIBUTUHKAN (sebelum Phase 1)

1. **Rotate token GitHub** (F1) — tindakan Anda; saya tidak melakukannya.
2. **Setujui C0** (cabut public-select di `vocabulary`, `kanji`, `grammar`, + tabel konten lain yang kosong)? Perubahan DB production → butuh persetujuan eksplisit; saya siapkan SQL, Anda yang menjalankan atau menyetujui saya menjalankannya.
3. **Offline:** apakah PWA/standalone offline penuh adalah requirement? (menentukan seberapa jauh C2–C5 bisa dilakukan)
4. **Phase A pertama (maks 1–2 subsistem):** rekomendasi saya **C1 (sentences)** sebagai proof-of-concept (risiko terendah, −495 KB gz, nol perubahan UX), **dan C0** paralel. C2 setelah keputusan offline.

*Tidak ada kode, data, atau konfigurasi produksi yang diubah oleh audit ini selain berkas laporan ini.*
