# AUDIT REPORT — Nihongo Quest (SevnQuest)

- **Basis audit:** commit `94ba770` (branch `main`, working tree bersih). Semua nomor baris di tabel temuan mengacu ke commit tersebut, *sebelum* perbaikan.
- **Metode:** audit read-only dulu (Fase 0–2), baru perbaikan diterapkan atas permintaan ("dan lakukan perbaikan"). Perbaikan **belum di-commit**; semuanya ada di working tree untuk ditinjau (`git diff`).
- **Penanda kepastian:** `[TERVERIFIKASI]` = dibuktikan lewat kode/perintah/skrip. `[DUGAAN]` = masuk akal dari kode, butuh cek runtime/manual.
- **Status:** ✅ diperbaiki · 🟡 diperbaiki sebagian · ⬜ belum (ada di roadmap).

> **Koreksi atas pembacaan awal:** pembacaan pertama `npm run lint` terpotong (proses belum selesai) sehingga sempat terbaca "0 error". Run penuh menunjukkan **`npm run lint` gagal: 25 error** (13 di `src/`, 12 di `motionads/ui-src/`). Angka yang dipakai di laporan ini adalah angka dari run penuh.

---

## 1. Executive Summary

### Skor 5 pilar (formula: 100 − Critical×20 − High×8 − Medium×3 − Low×1, minimum 0)

| Pilar | Rincian pengurangan (sebelum perbaikan) | Skor audit | Skor setelah perbaikan | Rincian setelah perbaikan |
|---|---|---:|---:|---|
| 1. Design System & UI/UX | 1 High (−8) + 7 Medium (−21) + 2 Low (−2) = −31 | **69** | **83** | sisa 5 Medium (−15) + 2 Low (−2) |
| 2. Arsitektur & Code Hygiene | 1 Critical (−20) + 7 High (−56) + 7 Medium (−21) + 6 Low (−6) = −103 → dibatasi 0 | **0** | **77** | sisa 1 High (−8) + 4 Medium (−12) + 3 Low (−3) |
| 3. Environment, Konfigurasi & Keamanan | 2 High (−16) + 2 Medium (−6) + 6 Low (−6) = −28 | **72** | **80** | sisa 2 High (−16) + 4 Low (−4) |
| 4. Performa Runtime & Aset | 2 High (−16) + 5 Medium (−15) + 1 Low (−1) = −32 | **68** | **84** | sisa 5 Medium (−15) + 1 Low (−1) |
| 5. PWA, Offline & Error Handling | 2 High (−16) + 7 Medium (−21) = −37 | **63** | **80** | sisa 1 High (−8) + 4 Medium (−12) |

Skor Pilar 2 jatuh ke 0 karena formula bersifat aditif; angka −103 menunjukkan banyaknya temuan di logika inti, bukan bahwa aplikasi tidak berfungsi. Skor "setelah" menghitung ulang hanya temuan yang masih terbuka.

### 3 kekuatan utama
1. **Engine & data materi sangat kaya dan bersih secara konten:** 2.356 kanji, 8.635 kotoba, 915 pola bunpou, tryout resmi N1–N5; `scripts/test_engine.ts` lulus 56/56; tidak ada kata terlarang DESIGN.md (0 hit).
2. **Ketahanan jaringan dan keamanan secret baik:** `resilientFetch` (timeout 7 dtk + fallback), klien Supabase "stub" saat offline, `.env` tidak ter-track, riwayat git tidak memuat `service_role`/secret; audio disintesis WebAudio (tanpa file audio yang bisa gagal diunduh).
3. **UX mobile matang:** `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, tab keep-alive, daftar besar memakai "Muat Lebih Banyak" (kanji 200, kotoba 50 awal) dengan indeks pencarian ter-memo.

### 3 kelemahan paling kritis
1. **Sinkronisasi cloud berisiko menimpa progres** (A-04 Critical, A-05): autosave jalan sebelum rekonsiliasi awal dan kegagalan jaringan dianggap "cloud kosong". *(diperbaiki)*
2. **Logika reward/SRS/misi tidak konsisten** (A-02, A-03, A-06): EXP+Gold dihitung 2× di 7 titik, misi mingguan tidak pernah reset, interval SRS tetap 30 hari setelah jawaban salah. *(diperbaiki)*
3. **Kepercayaan penuh ke klien untuk XP/leaderboard** (S-01) dan **muatan awal 22,9 MB** (P-01): skor dapat dimanipulasi lewat DevTools jika RLS/RPC server tidak ketat `[DUGAAN]`; bundle tunggal membuat boot lambat. *(S-01 belum; P-01 sebagian)*

### Kesimpulan
Aplikasinya fungsional dan kaya fitur, tetapi pertumbuhan cepat meninggalkan hutang pada tiga area: konsistensi data (cloud ↔ lokal), kebenaran logika gamifikasi, dan bobot muatan. Sesi ini memperbaiki semua temuan Critical dan sebagian besar High yang bisa diselesaikan tanpa mengubah desain produk: lint kembali hijau dengan `strict: true` (sebelumnya gagal, 25 error), `npm audit` 0 kerentanan (sebelumnya 2 moderate), muatan JS pertama turun dari 4.347 KB gzip (satu chunk yang memblokir render) menjadi **62 KB**, dan 11 tes regresi baru (`scripts/test_srs.ts`) mengunci perbaikan SRS/merge. Yang tetap terbuka dan butuh keputusan/akses server: RLS + RPC skor di Supabase (S-01), pemindahan `cloud_save` keluar dari `user_metadata` (S-03), pemecahan `App.tsx` (A-01), data-layer asinkron untuk ±16 MB dataset awal (P-04), dan sinkronisasi progres Tower (E-04).

### Hasil perintah otomatis (sebelum → sesudah)

| Pemeriksaan | Sebelum | Sesudah |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **gagal, 25 error** (13 `src/`, 12 `motionads/`) | **0 error**, dengan `strict: true` |
| `tsc --strict` pada `src/` | 31 error | 0 |
| `npm audit --omit=dev` | 2 moderate (`qs` via `express`) | 0 |
| JS pertama yang memblokir render | 1 chunk 22.877 KB raw / **4.347 KB gzip** | entry **196 KB raw / 62 KB gzip** (React + splash) |
| JS hingga interaktif (App + dataset yang dibutuhkan statis) | 4.347 KB gzip | **3.139 KB gzip** (−28%); sisa ±1.125 KB gzip dimuat on-demand |
| Chunk aplikasi (kode `App`) | termasuk dalam chunk 22,9 MB | `App` 95 KB gzip, `index` 2,9 KB gzip |
| Tes | `test_engine.ts` 56/56 | + `test_srs.ts` 11/11 |

Target "initial JS gzip < 200 KB" **tercapai untuk render pertama** (62 KB) tetapi **belum untuk waktu-ke-interaktif** (3,1 MB) karena dataset masih di graph statis (lihat P-04).

---

## 2. Tabel Temuan Critical & High

| ID | Severity | Pilar | Lokasi (file:baris) | Masalah | Dampak | Kepastian | Effort | Status |
|---|---|---|---|---|---|---|---|---|
| A-04 | **Critical** | 2 | `src/App.tsx:583-604`, `:353-379`; `src/lib/supabase.ts:548-612` | Autosave cloud berjalan 3 dtk setelah mount tanpa menunggu rekonsiliasi awal; `loadGameFromCloud` menelan error jaringan dan mengembalikan `null` sehingga dianggap "cloud kosong" lalu state lokal ditimpakan | Perangkat baru / jaringan lambat / error sesaat → `cloud_save` berisi progres kosong menimpa progres asli (data loss) | TERVERIFIKASI (mekanisme); waktu kejadian bergantung jaringan | M | ✅ |
| A-01 | High | 2 | `src/App.tsx:1-1542` | `App` monolit 1.542 baris: state, navigasi, cloud sync, misi, persistensi, 30+ handler, prop drilling hingga ~28 prop ke `WorldView`/`BukuSakuView`; tidak ada Context | Sulit diuji, tiap perubahan berisiko; re-render luas | TERVERIFIKASI | L | 🟡 (timer dipisah; sisanya rencana §4) |
| A-02 | High | 2 | `SuddenDeathStreakModal.tsx:242-245`, `KanjiSpeedRushModal.tsx:206-209`, `KotobaGuessModal.tsx:262-265`, `StarSentenceRushModal.tsx:322-327`, `BunpouDetailModal.tsx:326-328`, `ConjugationSpeedRushModal.tsx:223-232`, `CustomWorldView.tsx:109-114`; `App.tsx:736-738,757,806` | `onRewardPlayer(exp,gold)` **dan** `onCompleteStudyItem(...,exp,gold,...)` dipanggil bersamaan; yang kedua sudah memberi reward di `handleStudyComplete` → EXP/Gold 2×. Skor palsu `100,100` menambah misi kuis +100 dan statistik pertanyaan +100 per jawaban | Inflasi EXP/Gold/misi/statistik, leaderboard tidak adil | TERVERIFIKASI | S | ✅ |
| A-03 | High | 2 | `src/App.tsx:512-554`; `src/data/rpg/missions.ts:71-124` | Tidak ada logika reset misi mingguan sama sekali; reset harian hanya saat mount | Hadiah mingguan hanya bisa diklaim sekali seumur akun; aplikasi yang dibiarkan lewat tengah malam tidak reset | TERVERIFIKASI (grep: tak ada reset weekly; diuji runtime setelah perbaikan) | S | ✅ |
| A-05 | High | 2 | `src/App.tsx:389-432,441-456` | Saat cloud "menang" (EXP lebih tinggi), `...cloudData.stats` menggantikan seluruh `itemMastery`, `userDecks`, stageProgress lokal; saat lokal menang, koleksi yang hanya ada di cloud tertimpa | Deck, mastery SRS, progres stage hilang saat pindah perangkat | TERVERIFIKASI | M | ✅ |
| A-06 | High | 2 | `src/utils/mastery.ts:259-265`, `:307-387` | (a) Jawaban sebagian salah (60–99%) mempertahankan interval 30 hari; (b) `recordItemInteraction` menaikkan mastery +2…5% per interaksi tanpa batas → item jadi `PERFECTED` hanya dengan membuka kartu 40×, kegagalan tidak dicatat; (c) `score=NaN` membuat record NaN permanen | SRS tidak menjadwalkan ulang item yang salah; mastery bisa di-farm; record rusak | TERVERIFIKASI (skrip simulasi, lihat §3) | M | ✅ |
| A-11 | High | 2 | `src/utils/decks.ts:456-545` | Item deck kustom/AI dibangun dengan nama properti usang (`examples:{jp,id,en}`, `meaning_id`) yang tidak ada di tipe; field wajib (`meaningJa`, `wordType`, `kanjiComponents`, `radical`, `questions`, ...) tidak diisi | Contoh kalimat & arti Bunpou kustom tidak tampil; risiko crash `undefined.map` | TERVERIFIKASI (tsc + pembacaan konsumen) | S | ✅ |
| A-14 | High | 2 | `tsconfig.json` (tanpa `include`/`strict`) | `npm run lint` gagal 25 error dan ikut memeriksa folder `motionads/`; `strict` mati | Gerbang kualitas rusak; bug tipe (A-11, suara senyap, grup kata kerja) lolos | TERVERIFIKASI | S | ✅ |
| S-01 | High | 3 | `src/lib/supabase.ts:220-250,262-290`; `supabase/migrations/20260911_identity_architecture.sql` | XP/Gold/skor dihitung & disimpan di klien (`localStorage`) lalu di-upsert langsung ke `leaderboard`; `submit_score_event` menerima `p_user_id`/`p_is_correct` dari klien. Tabel `leaderboard`, `weekly_scores`, dan fungsi RPC **tidak ada di migrasi repo** | Skor/identitas dapat dipalsukan dengan anon key publik jika RLS/RPC tidak ketat | DUGAAN (butuh akses proyek Supabase) | L | ⬜ (SQL usulan §3) |
| S-03 | High | 3 | `src/lib/supabase.ts:490-495` (`auth.updateUser({data:{cloud_save}})`) | Save penuh disimpan di `user_metadata`, yang ikut masuk klaim JWT; payload membesar bersama `itemMastery`; setiap simpan juga meng-upsert **seluruh** mastery (`:535`) | JWT melebihi batas header → permintaan gagal (HTTP 431/494); beban jaringan | DUGAAN (butuh akun dengan save besar) | M | ⬜ |
| P-01 | High | 4 | `vite.config.ts` (tanpa chunking), `src/App.tsx:18-28` (impor statis), `index.html:185` | Satu chunk JS 22,9 MB (4,3 MB gzip) berisi 23 MB JSON; watchdog `index.html` menampilkan "Gagal Memuat Aplikasi" bila `#root` kosong 12 dtk dan memicu clear-cache + reload saat error chunk | Boot sangat lambat di mobile/3G, kemungkinan loop recovery | TERVERIFIKASI (output build) | M | 🟡 |
| P-02 | High | 4 | `src/App.tsx:323-336`, `src/hooks/useStudyTimeTracker.ts:104-153` | Hook timer memanggil `setTodaySeconds`/`setTotalSeconds` tiap detik **di dalam `App`** → seluruh pohon (semua tab yang tetap ter-mount, `stats` besar) re-render tiap detik saat belajar; tiap 10 dtk `setStats` memicu serialisasi + autosave cloud | Jank, baterai, trafik | TERVERIFIKASI (kode); besaran dampak DUGAAN | S | ✅ |
| E-01 | High | 5 | `src/App.tsx:1245,1300`; `src/components/ErrorBoundary.tsx` | Boundary hanya membungkus `StageHubView` dan `WorldView`; Library, Buku Saku, Leaderboard, Settings, Recall, Boss, Misi, Beranda tidak; fallback merah memakai `backdrop-blur`, menampilkan stack trace dan teks "berikan ke AI Assistant" ke pemain | Crash satu modul menjatuhkan seluruh tampilan | TERVERIFIKASI | S | ✅ |
| E-04 | High | 5 | `src/engine/tower/world/towerProgress.ts:29-53`, `combat/checkpoint.ts`, `combat/skillTree.ts`, `world/towerAchievements.ts` | Progres Tower (lantai, checkpoint, skill tree, achievement) hanya di `localStorage`, tidak masuk `CloudSavePayload` | Progres hilang saat ganti perangkat / hapus data situs | TERVERIFIKASI | M | ⬜ |
| D-01 | High | 1 | lihat §5 (R1–R3) | Pelanggaran aturan DESIGN.md yang meluas: 20 `bg-gradient-*` (11 file), 15 blob `blur-xl/2xl/3xl`, 19 glow neon (`drop-shadow`/`shadow-[0_0_…]`), kartu ber-`border-2` berwarna | Inkonsistensi visual, biaya GPU (blur animasi) | TERVERIFIKASI | M | ✅ (sisa 2 gradient fungsional) |

---

## 3. Detail Temuan per Pilar

### Pilar 1 — Design System, UI/UX

**D-01 (High) ✅ Pelanggaran DESIGN.md meluas.** Before → After (`StarSentenceRushModal.tsx:689`, plakat skor sesuai DESIGN.md §3):
```diff
-<div className={`p-5 rounded-2xl bg-gradient-to-br ${achievementRank.color} text-stone-950 text-center relative overflow-hidden shadow-xl`}>
-  <div className="text-4xl sm:text-5xl font-black font-heading">{achievementRank.rank}</div>
+<div className="p-5 rounded-2xl bg-surface-card border border-border-subtle text-center relative overflow-hidden shadow-md">
+  <div className="absolute top-3 right-3 w-14 h-14 rounded-xl bg-surface-inset border border-border-subtle shadow-inner flex items-center justify-center">
+    <span className={`text-3xl font-black font-heading ${achievementRank.color}`}>{achievementRank.rank}</span>  {/* stempel di pojok kanan */}
+  </div>
```
Contoh lain: `ArcadeHubView.tsx:75` (`bg-gradient-to-r … border-2 border-wine-accent/35` → `bg-surface-card border border-border-subtle shadow-md`), `TierAvatar.tsx` (aura `blur-2xl` berputar tak hingga → alas solid `bg-surface-inset/50`), `StarSentenceRushModal.tsx:450` (tombol gradient → `btn-physical-primary`).

Temuan Medium/Low:
- **D-02 (Medium) `[DUGAAN]` ⬜** 649 kemunculan border berwarna (236 warna Tailwind + 413 warna tema) + 18 `ring-*`; belum bisa dipastikan mana yang card dan mana badge kecil (yang boleh). Terbanyak: `DungeonSetupModal.tsx` (47), `QuestionLibraryView.tsx` (36), `DungeonSessionRunner.tsx` (30), `SettingsView.tsx` (26).
- **D-03 (Medium) ⬜** Hanya 45 pemakaian `btn-physical-*` untuk 616 `<button>`; terbanyak tanpa kelas fisik: `DungeonSessionRunner.tsx` (35), `DungeonSetupModal.tsx` (28), `DungeonBattleModule.tsx` (21).
- **D-04 (Medium) `[DUGAAN]` ⬜** 57 `backdrop-blur-*` (overlay/header); DESIGN.md melarang "blur modern" dan efek ini mahal di HP kelas bawah.
- **D-05 (Medium) ✅** Tidak ada `prefers-reduced-motion` (0 hit) → blok `@media (prefers-reduced-motion: reduce)` ditambahkan di `src/index.css`.
- **D-06 (Medium) ⬜** Hanya 7 `aria-label` untuk 616 tombol (banyak tombol ikon saja); 431 pemakaian `text-[8|9|10px]`.
- **D-07 (Medium) `[DUGAAN]` ⬜** Target sentuh < 44px: contoh tombol tutup `p-1.5` + ikon 16px di `SpotlightOnboarding.tsx:~415` (±28px). Belum diukur di viewport HP.
- **D-08 (Medium) ✅** Fallback `ErrorBoundary` dev-facing → ditulis ulang (lihat E-01).
- **D-09 (Low) ⬜** `index.css:275-321`: `@theme { --color-surface-base: var(--color-surface-base) }` (self-referensi). Berfungsi hanya karena urutan layer (build menghasilkan dua deklarasi; yang tak berlayer menang). Rapuh bila urutan layer berubah.
- **D-10 (Low) `[DUGAAN]` ⬜** `ConjugationDojoView.tsx` memakai `min-w-[620px]` → potensi overflow horizontal < 360px bila tidak di dalam kontainer scroll.

### Pilar 2 — Arsitektur & Code Hygiene

**A-04 (Critical) ✅** Before → After:
```diff
 // App.tsx:583
-useEffect(() => { if (!stats.userId) return;            // userId selalu ada (uuidv4)
+useEffect(() => { if (!stats.userId || !cloudHydrated) return;  // tunggu rekonsiliasi awal
 // supabase.ts:548 loadGameFromCloud
-} catch (err) { console.warn(...); return null; }       // error jaringan == "tidak ada save"
+// null HANYA bila benar-benar tidak ada save; error dilempar → handleCloudSync tidak menimpa cloud
+if (lbError) throw new Error(`Gagal membaca leaderboard: ${lbError.message}`);
 // saveGameToCloud: updateUser gagal tetap return true
-return true;
+return metadataSaved;   // = !updateError
```
Juga: satu sync dalam satu waktu (INITIAL_SESSION + SIGNED_IN tidak lagi paralel).

**A-05 (High) ✅** Merge gabungan (`src/utils/cloudMerge.ts`, diuji): skalar mengikuti sisi dengan EXP lebih tinggi; `itemMastery` (record terbaru menang), `userDecks` (`updatedAt` terbaru), `stageProgress` (cleared/stars tertinggi, modul di-union) selalu di-union. `inventory` sengaja tidak digabung (array ID berisi duplikat = jumlah item). Misi cloud hanya dipakai bila masih di hari/minggu ISO yang sama.

**A-02 (High) ✅** Before → After:
```diff
-if (onRewardPlayer) onRewardPlayer(expGain, goldGain);
-if (onCompleteStudyItem) onCompleteStudyItem('kotoba', expGain, goldGain, currentQ.id, 100, 100);
+if (onCompleteStudyItem) onCompleteStudyItem('kotoba', expGain, goldGain, currentQ.id, 1, 1);
+else onRewardPlayer?.(expGain, goldGain);   // satu jalur reward
```
`StarSentenceRush` kini mengirim `correctCount/(correct+wrong)` (sebelumnya poin permainan sebagai "skor").

**A-03 (High) ✅** Before → After: tidak ada reset → `applyRollover()` (mount + `visibilitychange` + tiap menit): reset harian per `YYYY-MM-DD`, mingguan per ISO week (`getLocalIsoWeekId`, diuji). Diverifikasi di browser: set minggu lama + misi diklaim → setelah reload `claimed:[false×4]`, kunci `2026-W40`.

**A-06 (High) ✅** Skrip simulasi (`scripts/test_srs.ts` kini menjadi tes regresi). Sebelum:
```
Perfect×6 lalu 4/5 -> pct=69 int=30d   (seharusnya turun)
40× flashcard (hanya membuka kartu) -> pct=100 st=PERFECTED
20× flip gagal -> miss=1 (kegagalan tak tercatat)
NaN/5 -> pct=NaN, miss=NaN (permanen, record berikutnya ikut NaN)
```
Sesudah: `4/5` pada interval 30d → 14d; flip dibatasi `INTERACTION_MASTERY_CAP=70%` dan status tidak bisa jadi MASTERED/PERFECTED; kegagalan menaikkan `mistakeCount`; input di-clamp `[0,total]` dan NaN → 0.
```diff
+totalQuestions = Number.isFinite(totalQuestions) && totalQuestions > 0 ? totalQuestions : 0;
+score = Number.isFinite(score) ? Math.min(Math.max(score, 0), totalQuestions) : 0;
 ...
-  } else if (ratio < 0.6) { nextIntervalDays = 1; }
+  } else if (ratio < 0.6) { nextIntervalDays = 1; }
+  else { /* 60–99%: turun satu anak tangga SRS (min 1 hari) */ }
```

**A-11 (High) ✅** Before → After:
```diff
-const pseudoBunpou: BunpouItem = { id, title: cd.word, formula: ..., meaning_id: cd.meaning, level,
-  examples: cd.exampleJp ? [{ jp: cd.exampleJp, reading, id: cd.exampleId, en: '' }] : [] };
+const pseudoBunpou: BunpouItem = { id, title: cd.word, reading: cd.reading || '', formula: ..., meaningId: cd.meaning,
+  meaningEn: cd.meaning, explanation: cd.meaning, level,
+  examples: exampleJp ? [{ japanese: exampleJp, reading: exampleReading, meaningId: exampleTranslation }] : [],
+  questions: [] };
```
Kotoba kustom kini memakai `exampleSentence` (yang dibaca `KotobaWritingPractice`/`UniversalFlashcard`) dan field wajib lain.

**A-14 (High) ✅** `tsconfig.json`: ditambah `"strict": true`, `include: [src, server, scripts, vite.config.ts]`, `exclude: [..., motionads, ...]`. Bug nyata yang terbongkar: `OfficialBook` diimpor dari modul yang tidak mengekspornya; `KanjiSpeedRushModal.tsx:233` memanggil `buildQueue(arg)` yang tak menerima argumen; `StarSentenceRush` memanggil suara `start_game`/`game_over` yang tidak terdaftar (senyap); `BlackboardPlaygroundModule.tsx:137-139` membandingkan grup `irregular` dengan `suru`/`kuru` (penjelasan "Golongan 3" tak pernah tampil); callback bookmark bertipe sempit.

**A-01 (High) 🟡** Rencana pemecahan: §4. Yang sudah dilakukan: `StudyTimerBadge` (timer 1 dtk keluar dari `App`), `ModuleBoundary`, `storage.ts`, `cloudMerge.ts`. `App.tsx` menjadi 1.574 baris karena kode baru (guard, merge, rollover); ekstraksi hook sengaja ditunda sampai ada tes untuk alur sync (§8).

Temuan Medium/Low (satu baris):
- **A-08 (Medium) ✅** Efek samping di dalam updater `setStats`: `upsertLeaderboard` (`App.tsx:660,1098`), `saveGameToCloud` (`:1128,1404,1434`), `localStorage.setItem` (`:1109,1325`). Dipindah ke efek terdebounce; updater kini murni.
- **A-09 (Medium) ✅** `handleStudyComplete` membuat record mastery untuk ID agregat sesi (`dungeon_<tipe>_<Date.now()>`, `drill_*`, `tryout_*`, `star_rush`) → `itemMastery` membengkak dan antrean recall berisi item hantu (`App.tsx:765-782`). Kini dilewati.
- **A-15 (Medium) ⬜** Tipe longgar: 59 `: any`, 126 `as any`, 7 `<any>`, 36 `as unknown as`; 0 `ts-ignore`. 10 lokasi risiko runtime terbesar: (1) `supabase.ts:6-7` `(import.meta as any).env` + klien stub `as any` yang mengembalikan sukses palsu untuk `insert/upsert`; (2) `supabase.ts:468` `stageProgress: Record<string, any>` / `dailyMissions: any[]` dari cloud tanpa validasi; (3) `App.tsx:99,167,177` `JSON.parse` lalu `...parsed` tanpa validasi bentuk; (4) `KanjiWritingCanvas.tsx:173,212,242` `Promise<any>` untuk data goresan; (5) `dungeonGenerator.ts:699,700,751` JSON mentah `as any[]`; (6) `engine/traits/traits.ts` (12 `any`); (7) `SettingsView.tsx` (11 `any`); (8) `arcadeSourceUtils.ts:8` `Record<string, any>`; (9) `officialBooks.ts:327-402` `(bunpouWn as any[])`; (10) `App.tsx:803` `moduleId as any`.
- **A-16 (Medium) ⬜** 54 dari 82 komponen > 300 baris; terbesar `KanjiWritingCanvas` 1.723, `QuestionLibraryView` 1.564, `DungeonSessionRunner` 1.560, `DungeonSetupModal` 1.255, `BunpouDetailModal` 1.175. Campuran fetch data + logika + UI (mis. `KanjiWritingCanvas` memuat fetcher goresan, cache, dan UI kanvas).
- **A-18 (Medium) ⬜** Deviasi dari `SYSTEM_LOGIC_KOTOBA_KANJI_BUNPOU.txt`: bonus INT `+0,5%/poin` di `rewards.ts:298` vs spec §2.4 `+2%` dan §7 `+4%` (spec sendiri tidak konsisten); rumus True Mastery di `mastery.ts:187-228` (bobot 20/25/20/15/20) berbeda dari spec §4.4 (20/25/35/20); status MASTERED di spec = "3× berturut-turut benar", di kode berbasis persentase; tabel `user_srs` memuat `ease_factor`/`sm2_extended_v1` padahal SRS nyata adalah tangga interval tetap `[1,2,4,7,14,30]` tanpa ease.
- **A-21 (Medium) ⬜** `setTimeout` tanpa cleanup pada alur yang memberi hasil: `BossBattleModule.tsx:141-186` (`onVictory(500,300)` dapat terpanggil setelah keluar), `SuddenDeathStreakModal.tsx:248-277`, `KotobaGuessModal.tsx:267,293`. Aman dari kebocoran listener (keydown/interval sudah dibersihkan).
- **A-22 (Medium) ✅** Durabilitas: persist `localStorage` didebounce 1 dtk dan `beforeunload` hanya memanggil `setState` (tak sempat tertulis); kini ada flush sinkron pada `visibilitychange`/`pagehide`.
- **A-12 (Low) ✅** `audio.ts`: alias `victory`/`level_up`/`levelUp` tak pernah berbunyi karena cabang membandingkan `type`, bukan `normalizedType`; `start_game`/`game_over` tak terdaftar.
- **A-13 (Low) ✅** Grup kata kerja `irregular` vs `suru`/`kuru` (lihat A-14).
- **A-19 (Low) ⬜** `handleGameOver` (`App.tsx:1030-1036`) memulihkan HP otomatis "for testing purposes" (kekalahan tanpa konsekuensi) dan 16 `alert()/confirm()` yang memblokir.
- **A-20 (Low) ✅** `handleResetData` menghapus `userId` (`DEFAULT_STATS` tanpa userId) sehingga identitas leaderboard hilang dan, untuk akun login, save cloud memulihkan progres lama; kini `userId` dipertahankan sehingga autosave menimpa cloud dengan state bersih.
- **A-23 (Low) ⬜** `decayFactor` selalu `1.0` (`mastery.ts:165,295,350,385`) namun dipakai sebagai skor retensi di `supabase.ts:519`.
- **A-24 (Low) ⬜** Dua lockfile (`bun.lock` + `package-lock.json`), nama paket `react-example`, `express`/`dotenv` ada di `dependencies` padahal klien tidak memakainya.

### Pilar 3 — Environment, Konfigurasi & Keamanan

**Pemeriksaan secret:** pola `service_role|SERVICE_ROLE|postgres://|sk_live|VITE_*SECRET|SERVICE|PASSWORD` tidak ditemukan di kode; `git log -S"service_role" --all` kosong; `.env` tidak ter-track (`git ls-files | grep -i env` hanya `.env.example` dan `src/vite-env.d.ts`); `git log --all -- .env` kosong. `ENX_API_KEY` hanya dibaca dari `process.env` oleh skrip server-side. Satu-satunya "kunci" di bundle adalah **anon key Supabase** (`role: anon`, publik secara desain).

**S-01 (High) `[DUGAAN]` ⬜ — manipulasi sisi klien.** Skenario serangan singkat:
1. Buka DevTools di situs; ubah `localStorage['nihongo_quest_player_stats_v2']` (`totalExp`, `gold`, `level`) lalu muat ulang → progres lokal berubah.
2. `upsertLeaderboard` (`supabase.ts:262`) menulis `total_exp` apa adanya ke tabel `leaderboard`; atau penyerang memanggil `supabase.from('leaderboard').upsert({...})` / `rpc('submit_score_event', {p_user_id: <uuid siapa pun>, ...})` memakai anon key dari bundle.
3. Jika RLS `leaderboard` mengizinkan insert/update oleh anon, atau RPC tidak memeriksa `auth.uid()`, skor dan identitas dapat dipalsukan.

Mitigasi usulan (tidak diterapkan karena skema tabel tidak ada di repo dan tidak ada akses DB; **uji di staging dulu**):
```sql
-- 1) leaderboard hanya bisa ditulis lewat fungsi server, bukan upsert langsung dari klien
alter table leaderboard enable row level security;
drop policy if exists "lb read all" on leaderboard;
create policy "lb read all" on leaderboard for select using (true);
-- tidak ada policy insert/update/delete => anon & authenticated tidak bisa menulis langsung

-- 2) satu-satunya jalur tulis: RPC yang memakai auth.uid(), bukan parameter dari klien
create or replace function submit_score_event(p_event_type text, p_ref_id text, p_is_correct boolean)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  -- batasi laju (mis. maks N event/menit/pengguna) dan idempotensi per (uid, p_ref_id, hari)
  -- hitung EXP di server dari tabel aturan, bukan dari klien
  ...
end $$;
revoke all on function submit_score_event(text,text,boolean) from anon;
grant execute on function submit_score_event(text,text,boolean) to authenticated;
```

**S-03 (High) `[DUGAAN]` ⬜.** Before: `supabase.auth.updateUser({ data: { cloud_save: saveData } })` (`supabase.ts:490`) — seluruh `PlayerStats` (termasuk `itemMastery`, `recallQueue` turunan, `userDecks`) masuk `user_metadata`/JWT. Usulan: tabel `user_saves(user_id uuid pk references auth.users, payload jsonb, updated_at timestamptz)` dengan RLS `auth.uid() = user_id`, simpan via `upsert`, dan kirim hanya record mastery yang berubah.

Temuan Medium/Low:
- **S-06 (Medium) ✅** `scripts/serve.js` (standalone): semua berkas non-HTML `Cache-Control: immutable` 1 tahun (termasuk `sw.js`, manifest, `/data/*` → pembaruan SW tak pernah sampai); tanpa kompresi (bundle ±22 MB lewat Wi-Fi ke HP); cek `startsWith(ROOT)` tanpa pemisah. Kini `immutable` hanya untuk `assets/`, gzip ber-cache, cek path memakai `ROOT + sep`. Diuji dengan `curl` (gzip, header cache, traversal → fallback SPA, bukan isi file).
- **S-08 (Medium) ✅** `npm audit`: `qs` (DoS, bypass array-limit) via `express` 4.22.2 → `npm audit fix` (express 4.22.3, qs 6.16.0); sekarang 0.
- **S-04 (Low) ⬜** URL proyek + anon key di-hardcode sebagai fallback (`supabase.ts:6-7`, `vite.config.ts` proxy; `serve.js:48,54`, `vercel.json`). Mengaburkan pemisahan staging/produksi; `vite.config.ts` kini membaca `VITE_SUPABASE_URL` bila ada.
- **S-05 (Low) ✅** `.env.example` adalah sisa template AI Studio (`GEMINI_API_KEY`, `APP_URL`) dan tidak memuat variabel yang dipakai; diganti `VITE_SUPABASE_*`, `ENX_*`, `PORT` dengan peringatan bahwa `VITE_*` publik.
- **S-07 (Low) `[DUGAAN]` ⬜** `server/engineServer.ts`: CORS `*`, tanpa rate limit, `/api/engine/practice/verify` memercayai objek `exercise` dari klien; tidak dijalankan oleh skrip npm mana pun (tampaknya tidak dideploy).
- **S-09 (Low) ⬜** Migrasi: `CREATE POLICY` tanpa `DROP POLICY IF EXISTS` (gagal bila dijalankan ulang); tidak memuat `leaderboard`, `weekly_scores`, fungsi RPC (lihat S-01).
- **S-12 (Low) ✅** Komentar `vite.config.ts` rusak (`Do not modifyâ€”file`, mojibake).
- **S-13 (Low) ⬜** `scripts/sync_standalone.cjs` menyalin `dist/` ke path absolut tetap `c:/project/NihongoQuest_Standalone`, menghapus hanya subfolder `assets/` target lalu menimpa berkas; tidak berbahaya, tetapi path tidak dapat dikonfigurasi. Tidak dijalankan dalam audit (menulis di luar repo).
- Build & deploy: `base: './'` konsisten untuk Vercel/GitHub Pages/standalone **untuk aset Vite**, tetapi `sw.js`, `manifest.webmanifest`, `index.html` memakai path absolut `/` (lihat E-02). Tailwind v4 (`@theme`, `@layer`, `@apply`) kompatibel; build sukses.

### Pilar 4 — Performa Runtime & Aset

**P-01 (High) 🟡** Before → After (`vite.config.ts` + `src/main.tsx`):
```diff
 // vite.config.ts
+build: { rollupOptions: { output: { manualChunks } } }   // vendor-react/supabase/motion/hanzi/icons + data-<nama-json>
 // App.tsx: modul berat → React.lazy dalam <ModuleBoundary>
-import { WorldView } from './components/map/WorldView';  // + StageHub, Library, BukuSaku, Leaderboard, Settings, Recall
+const WorldView = lazy(() => import('./components/map/WorldView').then(m => ({ default: m.WorldView })));
 // main.tsx: splash dulu, App dimuat sebagai chunk terpisah
-createRoot(root).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
+root.render(<BootSplash />); import('./App.tsx').then(({default: App}) => root.render(...)).catch(() => root.render(<BootSplash failed .../>));
```
Hasil build (gzip): entry 62 KB (React + splash) → render pertama segera; `App` 95 KB; hingga interaktif 3.139 KB; `tryouts` (464 KB), `kanji-extreme` (156 KB), furigana, `WorldView`, `LibraryView`, dll. kini on-demand. Dengan ini watchdog 12 dtk di `index.html` tidak lagi salah-picu karena `#root` terisi splash.

**P-02 (High) ✅** Before → After:
```diff
-const { todaySeconds: activeTodayStudySeconds, isTimerActive } = useStudyTimeTracker({ isStudying, ... });  // di App
+<StudyTimerBadge isStudying={isStudying} initialTodaySeconds={...} onSave={handleStudyTimeSave} />        // re-render per detik hanya di lencana
```
Diverifikasi di browser: lencana naik `0s → 6s` di tab Library tanpa error konsol.

Temuan Medium/Low:
- **P-03 (Medium) 🟡** Tiap 10 dtk belajar → `setStats` → autosave cloud (payload penuh + upsert seluruh mastery, `supabase.ts:520-535`). Kini minimal 30 dtk antar-simpan (`CLOUD_SAVE_MIN_INTERVAL_MS`); upsert-semua-mastery masih ada (butuh diff, lihat S-03).
- **P-04 (Medium) ⬜** Dataset ±16,8 MB (kotoba 5,9 MB, kanji_questions 3,6 MB, sentences 3,2 MB, bunpou 1,1 + 1,3 MB, kanji 0,9 MB) masih berada di graph statis karena `mastery.ts`, `ascension.ts`, `decks.ts`, `kanji.ts`, `bunpou.ts` mengimpornya sinkron. Solusi: data-layer asinkron (§8, Phase 2).
- **P-06 (Medium) `[DUGAAN]` ⬜** `KanjiLibraryView` (2.356 item) dan `KotobaLibraryView` (8.635 item) memakai "Muat Lebih Banyak" (baik) tetapi kartu tidak di-`memo`: tiap pemuatan lanjutan me-render ulang semua kartu; risiko jank di HP lama setelah ±1.000 item.
- **P-07 (Medium) ⬜** Font Google (5 keluarga) tanpa `preload`; SW hanya menyimpan respons `basic|cors`, sedangkan `<link rel=stylesheet>` tanpa `crossorigin` menghasilkan respons `opaque` → font tidak tersedia offline (`sw.js:111`). `font-display: swap` sudah ada.
- **P-09 (Medium) `[DUGAAN]` ⬜** Semua tab yang pernah dikunjungi tetap ter-mount (keep-alive) dan menerima `stats` yang berubah; memori tumbuh dan tiap perubahan stats me-render ulang tab tersembunyi.
- **P-05 (Low) ⬜** Aset: avatar identik di `src/assets/avatars` dan `public/avatars` (1,3 MB ×2); 10 aset non-JSON terbesar: `scholar.svg` 366 KB, `icon-512.png` 268 KB, `tier-10.png` 148 KB (×2), `tier-5.png` 99 KB (×2), `tier-7.png` 99 KB (×2), `tier-9.png` 86 KB (×2), `tier-8.png` 83 KB (×2). Data goresan `public/data` 25 MB dimuat per karakter via fetch (baik).

### Pilar 5 — PWA, Offline & Error Handling

**E-01 (High) ✅** Before → After: pembungkus `ModuleBoundary` (Suspense + ErrorBoundary) per modul (Beranda, Misi, Peringkat, Perpustakaan, Buku Saku, Pengaturan, Peta, Stage, Recall, Boss); fallback baru memakai `panel` solid DESIGN.md, tombol `btn-physical-*`, dan detail teknis dalam `<details>`:
```diff
-<div className="... bg-red-950/80 text-red-200 border border-red-500 rounded-3xl backdrop-blur-md z-50">
-  <h2>💥 Sistem Mengalami Crash ...</h2><p>Tolong screenshot layar ini dan berikan ke AI Assistant.</p>
+<div role="alert" className="panel ... bg-surface-card border border-border-subtle shadow-md">
+  <h2>Modul {label} sedang bermasalah</h2><p>Progres kamu tetap tersimpan. ...</p>  {/* Coba Pulihkan / Bersihkan Cache */}
```

**E-04 (High) ⬜** `towerProgress.ts:29-53` dan tiga modul tower lain memakai `localStorage` saja; tidak ada di `CloudSavePayload`. Usulan: tambahkan `towerState` ke payload cloud (atau tabel terpisah) dengan merge "lantai tertinggi menang", dan jalankan lewat `cloudMerge.ts`.

Temuan Medium (satu baris):
- **E-02 (Medium) ✅** `index.html` mendaftarkan `/sw.js`, `sw.js` melakukan pre-cache `/manifest.webmanifest`, `/icon-*.png`, fallback `/index.html`, dan `manifest` memakai `start_url: "/"` — semuanya absolut, sementara `base: './'`. PWA rusak di GitHub Pages sub-path (`deploy` memakai `gh-pages`). Kini relatif terhadap scope; cache SW dinaikkan ke `v2.5`.
- **E-03 (Medium) ✅** `fetchSingleCharStrokeData`: 3 kandidat path lokal (dua identik saat `BASE_URL='./'`) × 2 nama berkas × timeout 2,5 dtk + 3 tingkat CDN × 10 dtk → bisa menggantung ±45 dtk saat offline. Kini path di-dedup dan CDN dilewati saat `navigator.onLine === false`.
- **E-05 (Medium) 🟡** Tidak ada penanganan `QuotaExceededError` (0 hit). `App.tsx` kini memakai `safeSetItem` + toast sekali per episode kuota penuh; ±30 pemanggilan `localStorage.setItem` lain (curriculumEngine, smartRandomizer, tower/*, LeaderboardView) masih memakai try/catch biasa.
- **E-06 (Medium) `[DUGAAN]` ⬜** SW tidak melakukan pre-cache app shell/dataset (hanya ikon); aset ter-cache saat dikunjungi online (cache-first). Peluncuran pertama offline sesudah pemasangan bisa gagal; total aset ±22 MB mendekati kuota Cache Storage di perangkat kecil.
- **E-08 (Medium) ⬜** `index.html` (blok `isLocalhost`) membatalkan SW dan menghapus seluruh cache pada **setiap** muat di `localhost`/`127.0.0.1` → versi standalone yang dibuka lewat `http://localhost:4173` tak pernah offline/PWA, tetapi lewat IP LAN iya.
- **E-10 (Medium) ✅** `saveGameToCloud` mengembalikan `true` walau `updateUser` gagal (lihat A-04).
- **E-11 (Medium) ⬜** Tulis cloud bersifat fire-and-forget tanpa antrean/retry (`syncUserMasteryRelational(...).catch(() => {})`, `logUserActivityEvent(...).catch(() => {})`); kegagalan offline hilang diam-diam.

---

## 4. Rencana Pemecahan `App.tsx` dan `index.css`

### `src/App.tsx` (1.542 baris di HEAD)

Struktur target:
```
src/
  App.tsx                      # ±120 baris: komposisi <AppProviders><AppShell/></AppProviders>
  app/
    AppShell.tsx               # layout: toast, <AppHeader/>, <TabViews/>, modal global, <BottomNavigation/>
    AppHeader.tsx              # logo + <StudyTimerBadge/>
    TabViews.tsx               # keep-alive tab + <ModuleBoundary> (JSX tab)
    PlayerContext.tsx          # Context: stats + actions (hilangkan prop drilling ±28 prop)
  state/
    storageKeys.ts             # konstanta kunci localStorage
    defaultStats.ts            # DEFAULT_STATS
    loadPlayerState.ts         # inisialisasi stats/stage/misi dari storage (murni, bisa diuji)
    playerActions.ts           # reward, studyComplete, allocateStat, ascend, mp/hp
    missionsActions.ts         # advanceMissions, claim, rollover
  hooks/
    useCloudSync.ts            # handleCloudSync + gerbang cloudHydrated + autosave throttle
    useAuthSession.ts          # getSession + onAuthStateChange
    usePersistence.ts          # persist() terdebounce + flush pagehide + toast kuota
    useDailyRollover.ts        # applyRollover (harian/mingguan/streak)
    useAppNavigation.ts        # activeTab, tabHistory, useBackButton, handleTabChange
    useOnboarding.ts
```
Peta "bagian → tujuan" (baris = HEAD):

| Baris asal | Isi | Tujuan |
|---|---|---|
| 1–39 | impor | tersebar |
| 41–83 | kunci storage, `DEFAULT_STATS` | `state/storageKeys.ts`, `state/defaultStats.ts` |
| 85–182 | inisialisasi stats/stage/misi dari storage | `state/loadPlayerState.ts` |
| 184–318 | navigasi, back button, onboarding | `hooks/useAppNavigation.ts`, `hooks/useOnboarding.ts` |
| 320–336 | pelacak waktu belajar | `components/layout/StudyTimerBadge.tsx` (**sudah dipindah**) |
| 338–484 | ref + `handleCloudSync` | `hooks/useCloudSync.ts` (+ `utils/cloudMerge.ts` **sudah ada**) |
| 486–509 | listener autentikasi | `hooks/useAuthSession.ts` |
| 512–554 | reset harian + streak | `hooks/useDailyRollover.ts` (**sudah diperluas ke mingguan**) |
| 556–568 | sinkron tema | `hooks/useTheme.ts` |
| 570–638 | persistensi localStorage + autosave cloud | `hooks/usePersistence.ts` |
| 640–724 | reward, `advanceMissions` | `state/playerActions.ts`, `state/missionsActions.ts` |
| 726–849 | `handleStudyComplete`, `handleRecordItemInteraction` | `state/playerActions.ts` |
| 851–1138 | stage complete, recall, MP, atribut, ascend, klaim misi, reset, launch stage, nama, signature, bookmark | `state/playerActions.ts`, `hooks/useStageProgress.ts` |
| 1140–1541 | JSX | `app/AppShell.tsx`, `app/AppHeader.tsx`, `app/TabViews.tsx` |

Urutan aman: (1) tulis tes untuk `loadPlayerState` + `useCloudSync` (mock Supabase); (2) ekstrak `state/*` murni; (3) ekstrak hook; (4) pindahkan JSX; (5) baru terapkan `PlayerContext` dan hapus prop drilling.

### `src/index.css` (2.232 baris di HEAD)

Pecah menjadi `src/styles/` dengan `index.css` hanya berisi `@import`. Urutan impor penting (`@import "tailwindcss"` pertama, lalu token, lalu komponen):

| Baris asal | Isi | File target |
|---|---|---|
| 1–3 | `@import "tailwindcss"`, `@custom-variant dark` | `index.css` (barrel) |
| 4–96 | token mode gelap (`:root, html.dark`) | `styles/tokens-dark.css` |
| 97–274 | token mode terang (`html.theme-light`) | `styles/tokens-light.css` |
| 275–321 | `@theme` | `styles/theme.css` |
| 322–351 | `@layer base` | `styles/base.css` |
| 352–583 | komponen inti (`.panel`, `.btn`, `.rpg-btn`) | `styles/components/core.css` |
| 584–1286 | buku catatan skeuomorfik, `btn-physical-*`, tier pill | `styles/components/notebook.css`, `styles/components/buttons.css` |
| 1287–1359 | scrollbar, ruby/furigana, safe-area | `styles/base-utilities.css` |
| 1360–1497 | peta perjalanan berbasis node | `styles/features/journey-map.css` |
| 1498–2075 | sistem jalur washi/sashiko | `styles/features/washi-scroll.css` |
| 2076–2145 | perpustakaan & segmented control | `styles/features/library.css` |
| 2146–2200 | optimasi mobile/touch/iOS | `styles/mobile.css` |
| 2201–2232 | animasi flip flashcard 3D | `styles/features/flashcard.css` |
| (baru) | boot splash + `prefers-reduced-motion` | `styles/accessibility.css` |

Peringatan Tailwind v4: tiap berkas yang memakai `@apply` atau variabel `@theme` harus diimpor **setelah** `@import "tailwindcss"` (atau memakai `@reference`); jangan memindahkan `@theme` ke berkas yang diimpor sebelum Tailwind.

---

## 5. Pelanggaran `DESIGN.md`

Aturan diekstrak dari `DESIGN.md` (dan `.agents/rules/design_system.md` yang identik): R1 tanpa gradient pada container/card/banner/modal/scorecard; R2 tanpa border/outline warna-warni pada card (`border-2 border-amber-…`, `ring-*`); R3 tanpa blob blur / glow neon, pakai `shadow-sm/md/inner`; R4 tanpa kata marketing; plus komponen wajib (surface tiers, `btn-physical-*`, plakat skor: header, stempel rank kanan, tombol Main Lagi / Pilih Level Lain / Kembali ke Arena).

| Aturan | Sebelum | Sesudah | Lokasi (file:baris, HEAD) |
|---|---:|---:|---|
| R1 `bg-gradient-*` (TSX) | 20 (11 file) | 2 | `StarSentenceRushModal.tsx:373,450,478,689` · `ArcadeHubView.tsx:75` · `BookDetailView.tsx:78,227` · `BookshelfView.tsx:243,307` · `SpotlightOnboarding.tsx:470` · `CharacterStatusModal.tsx:278-279` · `GrammarFormulaBox.tsx:179` · `FloorResultModal.tsx:42-43` · `PlayerShowcaseCard.tsx:75,102` · `BossGateModal.tsx:37` · **tersisa (sengaja):** `BunpouDetailModal.tsx:393,443` (masker fade tepi scroll horizontal — fungsional) |
| R1 gradient inline (TSX) | 3 | 2 | `BlackboardPlaygroundModule.tsx:402` (dihapus) · **tersisa:** `BunpouDetailModal.tsx:651-652` (garis grid papan tulis — fungsional) |
| R1 gradient di `index.css` | 19 | 19 | `index.css:640,763,772,797,808,823,858,869,883,981,992,1010,1042,1052,1075,1104,1115,1214,1225` — definisi `btn-physical-*`/tombol; DESIGN.md mewajibkan kelas itu dan hanya melarang gradient pada container; **tidak dihitung sebagai pelanggaran** |
| R2 `border-2/4` + warna aksen (regex) | 14 | 7 | diperbaiki (level card): `ArcadeHubView.tsx:75`, `SpotlightOnboarding.tsx:404,427`, `GrammarFormulaBox.tsx:179,193,210`, `GrammarChecklist.tsx:111`; plus `border ${borderAccent}` pada card buku (`BookDetailView.tsx:77`, `BookshelfView.tsx:240`) dan `StarSentenceRushModal.tsx:373,426` (ber-`border` tipis). **Tersisa 7:** umpan balik benar/salah jawaban (`StarSentenceRushModal.tsx:562-570`), stempel putus-putus `BunpouDetailModal.tsx:525`, dan slot jatuh putus-putus netral — dianggap state/badge, bukan card |
| R2 border warna tipis (badge/chip/state) | 649 | 649 | terbanyak: `DungeonSetupModal.tsx` (47), `QuestionLibraryView.tsx` (36), `DungeonSessionRunner.tsx` (30), `SettingsView.tsx` (26) — **butuh keputusan desain** (D-02) |
| R2 `ring-*` | 20 | 18 | umumnya status terpilih pada chip/jawaban |
| R3 blob `blur-xl/2xl/3xl` | 15 | 0 | `TierAvatar.tsx:188,215-224` · `SpotlightOnboarding.tsx:407-408` · `CharacterStatusModal.tsx:191,194` |
| R3 `drop-shadow-[…]` / glow `shadow-[0_0_…]` | 19 | 0 (2 pengecualian: bayangan tanah `TierAvatar.tsx:222`, cincin hairline `DungeonSetupModal.tsx:311`; juga dibuang: `shadow-<warna>/NN` pada tombol) | `TierAvatar.tsx`, `SuddenDeathStreakModal.tsx`, `LeaderboardView.tsx`, `TowerHUD.tsx`, `QuizEngine.tsx`, `SettingsView.tsx`, `JapaneseImeInput.tsx`, `DungeonSessionRunner.tsx`, `DungeonSetupModal.tsx`, dst. (18 file) |
| R3 `backdrop-blur-*` | 58 | 57 | `TowerMap.tsx` (4), `DungeonSetupModal.tsx` (3), `DeckFlashcardRunner.tsx` (3), `ConjugationSpeedRushModal.tsx` (3) — tafsir aturan tidak tegas (D-04) |
| R4 kata terlarang | 0 | 0 | — |
| Tombol `btn-physical-*` | 40 dari 615 `<button>` | 45 dari 616 | terbanyak tanpa: `DungeonSessionRunner.tsx` (35), `DungeonSetupModal.tsx` (28), `DungeonBattleModule.tsx` (21) |
| Scorecard (header/stempel/3 tombol) | — | — | `StarSentenceRushModal` kini memakai plakat solid + stempel kanan; urutan tombol Main Lagi/Pilih Level Lain/Kembali ke Arena **belum diverifikasi** di semua modal arcade |

Total pelanggaran terhitung (R1 TSX 20 + R1 inline 3 + R2 `border-2/4` berwarna 14 + R3 blob 15 + R3 glow 19): **71 → 11** (sisa: 2 masker fade + 2 garis grid fungsional, 7 border umpan balik/stempel; tidak termasuk 649 border tipis dan 57 `backdrop-blur` yang menunggu keputusan desain).

---

## 6. Hal yang Sudah Baik (pertahankan saat refactor)

- **Kontrak `resilientFetch` + klien stub** (`supabase.ts:20-100`): timeout, fallback langsung ke supabase.co, aplikasi tetap hidup saat offline.
- **Audio WebAudio tersintesis** (`utils/audio.ts`): nol berkas audio, nol kegagalan unduh, nuansa tradisional sesuai tema.
- **Pola "Muat Lebih Banyak" + `useMemo` indeks pencarian + `useDeferredValue`** pada Kanji/Kotoba — jangan diganti render penuh.
- **Pemuatan data goresan**: lokal dulu → CDN berlapis, cache memori + `activeFetches` (dedup permintaan).
- **Tab keep-alive** untuk perpindahan instan (pertahankan, tetapi batasi re-render; lihat P-09).
- **`getEffectiveTier`/gerbang ascension, `ensureUserDecks`, perlindungan jam mundur pada streak** (`App.tsx:538-541`).
- **Debounce persistensi + sanitasi `Math.round` pada EXP/Gold saat memuat**.
- **`src/engine/*` murni + `scripts/test_engine.ts`** (56 tes lulus) dan pemisahan `data/` vs `utils/`.
- **Token surface tiers + tema terang/gelap** (`index.css:11-274`) dan konvensi `btn-physical-*`.
- **Strategi SW**: network-first untuk HTML, cache-first aset ber-hash, tidak pernah meng-cache Supabase.
- **Disiplin secret**: tidak ada secret di kode/riwayat git; `.env*` di-ignore.
- **Copywriting**: 0 kata terlarang; istilah RPG/Dojo konsisten.

---

## 7. Roadmap

### Phase 1 — Quick wins (< 2 jam)
**Sudah dikerjakan di sesi ini:** A-04 (gate + error), A-05 (merge), A-02, A-03, A-06, A-08, A-09, A-11, A-12, A-13, A-14 (strict + lint hijau), A-20, A-22, S-05, S-06, S-08, S-12, D-01, D-05, D-08, E-01, E-02, E-03, E-10, P-02, P-03 (throttle), P-01 (sebagian).

**Masih terbuka (cepat):**
| Item | ID | Effort |
|---|---|---|
| Hapus auto-heal "testing" di `handleGameOver`; ganti `alert()` dengan toast | A-19 | S (1 jam) |
| Cleanup `setTimeout` (ref + cleanup effect) di `BossBattleModule`, `SuddenDeathStreakModal`, `KotobaGuessModal` | A-21 | S (1 jam) |
| `aria-label` pada tombol ikon prioritas (navigasi, tutup modal, quiz) | D-06 | S |
| Hapus salinan avatar ganda (`public/avatars` vs `src/assets/avatars`) setelah memastikan jalur runtime | P-05 | S |
| Jalankan `npm run update-standalone` setelah meninjau diff (menulis ke `c:/project/NihongoQuest_Standalone`) | S-13 | S |

### Phase 2 — Refactoring struktural (1–2 hari)
| Item | ID | Effort |
|---|---|---|
| RLS + RPC `submit_score_event` berbasis `auth.uid()` (SQL §3), uji di staging | S-01 | L |
| Pindahkan `cloud_save` ke tabel `user_saves` + kirim diff mastery | S-03, P-03 | M |
| Data-layer asinkron: `src/data/loader.ts` + `ensureContentLoaded()` di balik `BootSplash`, ganti `import x.json` statis dengan `import()` per dataset; resolusi judul recall lazy | P-04, P-01 | L |
| Pecah `App.tsx` sesuai §4 dengan tes untuk `loadPlayerState`/`useCloudSync` | A-01 | L |
| Sinkronkan progres Tower ke cloud lewat `cloudMerge.ts` | E-04 | M |
| Antrean tulis offline + retry (IndexedDB/`localStorage`) untuk cloud & aktivitas | E-11 | M |
| SW: pre-cache app shell + dataset inti, strategi font offline (self-host subset) | E-06, P-07 | M |
| Konsolidasi tombol ke `btn-physical-*`; putuskan kebijakan border tipis & `backdrop-blur` | D-02, D-03, D-04 | M |
| Ganti 10 hotspot `any` dengan tipe/validator (mis. zod/valibot untuk `JSON.parse` & payload cloud) | A-15 | M |

### Phase 3 — Optimasi & polish (jangka panjang)
| Item | ID | Effort |
|---|---|---|
| Pecah `index.css` §4; pecah komponen > 300 baris (`KanjiWritingCanvas`, `QuestionLibraryView`, `DungeonSessionRunner`, …) | A-16, D-09 | L |
| Samakan spesifikasi ↔ kode (INT bonus, rumus True Mastery, aturan MASTERED, SRS `ease`) atau perbarui spesifikasi | A-18 | M |
| `React.memo` kartu daftar, batasi jumlah tab keep-alive, virtualisasi bila > 2.000 item | P-06, P-09 | M |
| Anggaran performa di CI (`lint` + `tsx scripts/test_srs.ts` + batas ukuran chunk), audit Lighthouse mobile, audit a11y penuh (kontras, target sentuh 44 px, fokus) | D-06, D-07 | M |
| Ganti nama paket, satukan lockfile, pindahkan `express`/`dotenv` ke `devDependencies` atau hapus | A-24 | S |

---

## 8. Keterbatasan Audit

**Perintah yang gagal / catatan eksekusi**
- Pembacaan pertama `npm run lint` terpotong → sempat salah terbaca "0 error" (lihat koreksi di atas). `rg` tidak terpasang di shell Bash; pencarian pola dijalankan dengan alat Grep (ripgrep) dan `grep`.
- `tsc --strict` awal menghasilkan 58 error, separuhnya di `motionads/ui-src/` karena `tsconfig.json` tanpa `include`.
- Skrip uji sementara ditulis di scratchpad sesi (bukan `/tmp`, sesuai aturan lingkungan); versi permanen ada di `scripts/test_srs.ts`.

**Tidak diperiksa / tidak dapat diperiksa**
- Tidak ada akses ke proyek Supabase: RLS, tabel `leaderboard`/`weekly_scores`, dan fungsi `submit_score_event` tidak dapat dibaca. Alur login/sinkron cloud **tidak diuji end-to-end**; yang diuji: logika merge (unit test), reset mingguan (browser), dan boot tanpa akun.
- Verifikasi runtime hanya pada dev server dengan viewport desktop/tablet (±800 px): semua tab dibuka tanpa error konsol, lencana timer berjalan, Rak Buku dan onboarding tampil benar. **Viewport < 360 px, target sentuh, safe-area di perangkat nyata, dan regresi visual penuh belum diuji.**
- Lighthouse / profiling React tidak dijalankan; angka performa berasal dari output build, bukan pengukuran runtime.
- `Update_Ke_Standalone.bat` / `sync_standalone.cjs` tidak dijalankan (menulis ke luar repo). `dist/` tidak diubah; build verifikasi memakai direktori keluaran sementara.
- Pemecahan `App.tsx`/`index.css` hanya direncanakan (§4), tidak dieksekusi.
- Folder yang tidak diaudit: `motionads/`, `marketing/`, `kotoba kaigo raw/`, `scratch/` (di-ignore git; `motionads.zip` 25 MB ada di root, tidak ter-track).

**Item `[DUGAAN]` yang butuh verifikasi manual**
| ID | Yang perlu dicek |
|---|---|
| S-01 | Kebijakan RLS `leaderboard`/`weekly_scores` dan isi fungsi `submit_score_event` di proyek Supabase (apakah anon bisa insert/update; apakah `auth.uid()` diperiksa) |
| S-03 | Ukuran JWT/`user_metadata` pada akun dengan ribuan `itemMastery`; apakah muncul HTTP 431/494 |
| S-07 | Apakah `server/engineServer.ts` pernah dideploy |
| D-02, D-04 | Daftar border berwarna dan `backdrop-blur` yang benar-benar card (keputusan desain) |
| D-07, D-10 | Ukuran target sentuh dan overflow pada lebar 320–360 px |
| P-06, P-09 | Jank daftar > 1.000 kartu dan pertumbuhan memori dengan banyak tab dikunjungi (profil di perangkat nyata) |
| E-06 | Peluncuran pertama offline setelah memasang PWA (butuh perangkat/Chrome DevTools "Offline") |
| A-04 (kejadian) | Kondisi waktu: mekanisme terbukti dari kode; frekuensi di lapangan bergantung latensi jaringan |

**Berkas yang diubah/ditambah dalam perbaikan** (belum di-commit; `git status`): `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/lib/supabase.ts`, `src/utils/{mastery,decks,time,audio,arcadeSourceUtils}.ts`, `src/utils/{storage,cloudMerge}.ts` (baru), `src/components/{common/BootSplash,common/ModuleBoundary,layout/StudyTimerBadge}.tsx` (baru), `src/components/ErrorBoundary.tsx`, ±40 komponen (DESIGN.md/reward/tipe), `index.html`, `public/{sw.js,manifest.webmanifest}`, `scripts/serve.js`, `scripts/test_srs.ts` (baru), `vite.config.ts`, `tsconfig.json`, `.env.example`, `package-lock.json`, `AUDIT_REPORT.md`.

---

## 9. Tindak Lanjut (sesi lanjutan, berdasarkan keputusan pemilik)

Keputusan pemilik diterapkan sebagai berikut. Semua gerbang hijau setelahnya: `npm run lint` 0 error (strict), 22 tes `scripts/test_srs.ts`, 56 tes `scripts/test_engine.ts`, `vite build` sukses, dan smoke test browser (semua tab, tanpa error konsol).

| Keputusan | Tindakan | Status |
|---|---|---|
| Commit tematik | 6 commit (`fd501a7` … `9dceb14`) + commit lanjutan; **tidak di-push** | ✅ |
| D-02/D-04 border & blur | `backdrop-blur-*` dihapus total (57 → 0; semua sudah berlatar semi-transparan). Border berwarna pada kartu/panel diganti `border-border-subtle` (hover → `border-border-primary`) untuk 36 elemen statis. Badge/stempel/status benar-salah dipertahankan. Sisa ±610 kemunculan berada pada badge, chip, dan cabang kondisional (state) — sesuai kebijakan | ✅ |
| A-19 game over | Auto-heal dihapus (hanya aktif saat `import.meta.env.DEV`); HP setelah kalah = 10% maks (min 1); **Profil Karakter** kini punya kartu pemulihan: *Gunakan Potion* (+30% HP, konsumsi 1 item) dan *Istirahat di Dojo* (1 koin/2 HP hilang, min 10 koin, pulihkan HP+MP). Logika murni di `src/utils/recovery.ts` + 4 tes. `alert()` pada game over diganti toast | ✅ |
| A-18 spesifikasi | `system_specs/SYSTEM_LOGIC_KOTOBA_KANJI_BUNPOU.txt` diselaraskan ke kode (INT +0,5%/poin, aturan status, tangga SRS). **Koreksi atas laporan §3:** True Mastery 4D (20/25/35/20) di `calculateItemTrueMastery` *memang sesuai spesifikasi*; rumus 5-faktor 20/25/20/15/20 adalah metrik terpisah (`masteryPercentage`). Aturan MASTERED di kode adalah **`masteryPercentage ≥ 80` dan `attemptsCount ≥ 2`** (bukan ≥85% + interval 14 hari seperti yang tertulis di keputusan); spesifikasi mengikuti kode. Mohon konfirmasi bila angka 85%/14 hari memang diinginkan — itu perubahan perilaku, bukan sekadar dokumentasi | ✅ (konfirmasi angka) |
| S-01 RLS/RPC | Draft `supabase/migrations/20261001_secure_leaderboard_and_saves.sql`: RLS `leaderboard`/`weekly_scores` baca-saja, RPC `upsert_leaderboard_entry` (identitas `auth.uid()`, EXP tidak boleh turun, laju dibatasi), `submit_score_event_v2` (anti-spam + idempotensi), tier dihitung server. Klien memakai RPC baru **hanya bila `VITE_SECURE_LEADERBOARD=true`**; default tetap jalur lama (non-breaking). Kunci tulis langsung (B.3) dan pencabutan fungsi lama (B.4) sengaja **dikomentari** — jalankan setelah klien diuji. Catatan: pemain tamu tidak lagi muncul di leaderboard setelah B.3; asumsi skor +10/jawaban benar dan `UNIQUE(user_id, week_id)` harus dicocokkan dengan skema asli | 🟡 menunggu review & eksekusi pemilik |
| S-03 `user_saves` | Klien dual-read/lazy migration: simpan ke `user_saves` bila tabel ada, jika tidak jatuh ke `user_metadata`; setelah sukses menyimpan ke tabel, `cloud_save` di metadata dikosongkan; baca membandingkan `updatedAt` kedua sumber. Tabel dibuat di bagian A migrasi (idempotent, RLS per-user, batas 2 MB) | ✅ di kode; aktif setelah bagian A dijalankan |
| E-04 Tower | `towerCloudState.ts`: progres lantai, skill tree, achievement masuk `CloudSavePayload.towerState`. Merge: lantai tertinggi menang, union lantai (yang lebih sedikit salah menang), skill level tertinggi dengan SP tidak digandakan, achievement OR. 3 tes. **Checkpoint sesi aktif (blueprint ronde) sengaja tidak disinkronkan** (sementara, besar, kedaluwarsa 7 hari) | ✅ |
| A-01 pecah `App.tsx` | Tes dulu (`loadPlayerState`, merge, recovery, tower), lalu ekstraksi: **`App.tsx` 1.600 → 206 baris**. Modul baru: `state/{storageKeys,defaultStats,loadPlayerState}.ts`; `hooks/{useToast,useAppNavigation,useDailyRollover,useTheme,usePersistence,useCloudSync,usePlayerActions}.ts`; `app/MainContent.tsx`. Kode dipindah apa adanya (tanpa perubahan perilaku). **Belum:** `PlayerContext` untuk menghapus prop drilling (sisa temuan Medium) dan pemecahan `index.css` | 🟡 |
| P-04 data-layer asinkron | **Belum dikerjakan, sengaja.** Hasil telaah: dataset diimpor di *scope modul* oleh `kanji.ts`, `bunpou.ts`, `officialBooks.ts`, `templateDecks.ts`, `arcadeSourceUtils.ts`, `imeEngine.ts`, `furiganaUtils.ts` (membangun indeks/turunan saat impor), dan `mastery.ts`/`ascension.ts`/`decks.ts` memakainya sinkron di jalur boot. Membuatnya asinkron tanpa mengubah semua pemakai hanya memindahkan waktu tunggu (semua dataset tetap dibutuhkan sebelum App render). Manfaat nyata butuh desain progresif (render Beranda dulu; `ContentGate` pada modul yang memerlukan konten; `buildSmartRecallQueue` tahan konten belum ada) dan uji E2E. Rekomendasi: kerjakan sebagai proyek terpisah | ⬜ |
| Operasional | `npm run update-standalone` **tidak dijalankan** (sesuai keputusan) | ⬜ |

**Hasil ukur akhir:** render pertama 62 KB gzip (entry), waktu-ke-interaktif 3.144 KB gzip (sebelum audit: 4.347 KB), chunk `App` 101 KB gzip.

**Skor setelah tindak lanjut (hitung ulang):**
| Pilar | Temuan terbuka | Skor |
|---|---|---:|
| 1 Design | D-02 (Medium, ±610 border badge/state), D-03, D-06, D-07 (Medium); D-09, D-10 (Low) | 100 − 12 − 2 = **86** |
| 2 Arsitektur | prop drilling tanpa Context (Medium), A-15, A-16, A-21 (Medium); A-23, A-24 (Low) + `alert()` lain | 100 − 12 − 3 = **85** |
| 3 Keamanan | S-01 (High, menunggu eksekusi SQL; `[DUGAAN]`), S-03 (Medium sampai bagian A dijalankan), S-04, S-07, S-09, S-13 (Low) | 100 − 8 − 3 − 4 = **85** |
| 4 Performa | P-03 (Medium, upsert semua mastery), P-04, P-06, P-07, P-09 (Medium); P-05 (Low) | 100 − 15 − 1 = **84** |
| 5 PWA/Error | E-05 (parsial), E-06, E-08, E-11 (Medium) | 100 − 12 = **88** |

**Sisa yang butuh tindakan pemilik:** review dan jalankan migrasi SQL bertahap (bagian A → B.1/B.2 → set `VITE_SECURE_LEADERBOARD=true` → B.3/B.4); verifikasi manual di HP (viewport 320–360 px, PWA offline) dan login akun nyata untuk alur cloud; konfirmasi angka MASTERED; jalankan `npm run update-standalone` setelah semua terverifikasi.
