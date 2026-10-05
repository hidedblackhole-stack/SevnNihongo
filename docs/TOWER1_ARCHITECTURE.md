# MENARA 1 — TOWER OF TUTORIAL · ARSITEKTUR BEKU (v1)

Status: lantai **001–016 dibangun dan dapat dimainkan**. Kelanjutannya, lantai 017–100, ada di Menara 2: lihat `docs/TOWER2_ARCHITECTURE.md`.
Kode: `src/engine/tower1/` (tipe, graf, progres, utilitas), `src/data/tower1/` (lantai + konten), `src/components/tower1/` (UI).
Tes: `src/engine/tower1/tower1.test.ts` (masuk `npm test`).

## 1. Identitas & batas

Menara 1 mengajarkan cara **MELIHAT** bahasa Jepang: mengenali, mengurai, dan menafsirkan. Keluaran pemain adalah **kompas, bukan kefasihan**.
Menara 2 dimulai saat pemain berpindah dari *mendekode* ke *menyusun* (output, konjugasi, produksi terkendali).

Satu klarifikasi batas: yang dilarang masuk Menara 1 adalah **konstruksi tata bahasa**, bukan latihan recall. Memilih aksara dari bunyi,
atau mengetuk bagian kalimat, tetap bagian siklus Temukan → Pelajari → Latih → Ingat.

## 2. Hasil validasi blueprint

Arsitektur 16 lantai **lulus**: lantai = satu perubahan kemampuan, graf berbasis dependensi, batas SEE/USE bisa dipertahankan.
Yang diperbaiki hanya dependensi yang salah dan beberapa celah konten (di bawah). Tidak ada lantai yang ditambah atau digabung.

## 3. Koreksi DAG (diterapkan di `floors.ts`, dijaga oleh tes)

| Lantai | Blueprint awal | Final | Alasan |
|---|---|---|---|
| 008 Katakana | hard: 005 | hard: **006**, soft: 007 | Contoh sendiri (テレビ, コーヒー) butuh dakuten dan ー. ー diperkenalkan di 008. |
| 009 Kanji | hard: 008 | hard: **006**, soft: 008 | Furigana adalah hiragana dan bacaannya berdakuten; katakana tidak diperlukan. 008 jadi sintesis "tiga aksara". |
| 010 Predikat | hard: 005 | hard: **006** | です/が/で/だ berdakuten; kalimat nyata tidak bisa ditulis tanpa itu. 007 tidak diperlukan. |
| 007 Ketukan | hard: 006 + 002 | hard: **002 + 005**, soft: 006 | Hanya butuh hiragana dasar + konsep mora. Kolam kata 007 sengaja tanpa dakuten. |
| 015 Protokol | hard: 007, 009, 012, 014 | hard: 007, **008**, 009, 012, 014 | 008 tidak lagi tercakup transitif lewat 009. |

Celah konten yang ditambahkan ke spesifikasi lantai sisa (belum dibangun, wajib dibangun saat itu):

* **009**: okurigana (kanji = inti, kana = ekor) dan **perubahan aksara sebagai petunjuk batas kata**. *(sudah ada di 009)*
* **011**: bacaan khusus は/へ/を (wa/e/o) — jebakan decoding, muncul di kalimat pertama.
* **013**: kata sifat-na dilipat ke keluarga 1 ("benda-mirip + です/だ"), bukan engine ke-4. Waspadai おいしいです ≠ benda + copula.
* **014**: contoh kana (たべる/たべます) atau soft edge ke 009; jangan menyebut "konjugasi".
* **015**: potongan segmentasi (tanpa spasi) dan gloss kosakata, supaya yang diukur struktur, bukan hafalan.
* **016**: bukan gerbang pass/fail yang menjebak; butuh rubrik observable.

## 4. Graf final

```
001 → 002, 003            003 → 004 → 005 → 006
006 → 008, 009, 010       002 + 005 → 007   (006 disarankan)
010 → 011 → 012           010 → 013 → 014   (009 disarankan)
007 + 008 + 009 + 012 + 014 → 015 → 016
```

* **Hard** = pintu terkunci sampai selesai. **Soft** = tidak mengunci; memengaruhi *rekomendasi* dan tata letak peta.
* **Rekomendasi** (`getRecommendedFloor`): lantai terbuka bernomor terkecil yang prasyarat lunaknya selesai; jika tidak ada, nomor terkecil yang terbuka.
  Pemain selalu bisa memilih lantai terbuka lain; peta hanya menyorot satu langkah ("Rekomendasi") untuk mencegah paralisis keputusan.
* **Peran node (internal, tidak ditampilkan ke pemain)**: Jalur Utama (001, 003, 004, 006, 010–014) · Cabang (002, 007, 008, 009; urutan bebas, wajib) · Gerbang Utama (005) · Konvergensi (015) · Ujian Kompas (016).
* Tampilan: **menara bertumpuk** (016 di puncak, 001 di dasar), satu baris per lantai, posisi pemain disorot ("Posisimu"), prasyarat tertulis di baris lantai terkunci.
  Mengetuk lantai → detail → **peta ruangan** lantai itu (Room dibuka berurutan, progres Room tersimpan di `nq_tower1_rooms` sehingga bisa dilanjutkan).
  Garis graf tidak digambar; DAG tetap berlaku lewat prasyarat. (`computeRanks`/`col` masih ada untuk tata letak graf bila diperlukan.)

## 5. Spesifikasi kemampuan per lantai

Sumber kebenaran: `FloorSpec.capability` di `src/data/tower1/floors.ts` (ditampilkan di modal peta dan layar intro lantai).
Tiap lantai menjawab: **apa yang dilihat · apa yang dilakukan · apa yang berubah · bagaimana kita tahu · salah paham yang mungkin**.

| # | Lantai | Status | Mastery signal (dalam kode) |
|---|---|---|---|
| 001 | Ambang Pintu | dibangun | Room latihan aksara, lulus ≥ 60% percobaan-pertama |
| 002 | Denyut Bunyi | dibangun | Hitung ketukan ≥ 80% |
| 003 | Kebangkitan Hiragana (あ〜そ) | dibangun | Baca kata tanpa Romaji ≥ 80% |
| 004 | Aliran Konsonan (た〜ほ) | dibangun | Baca kata dari 30 aksara ≥ 80% |
| 005 | Cakrawala Hiragana (46 aksara) | dibangun | Ujian gerbang: baca ≥ 85% + dengar ≥ 80% |
| 006 | Tanda Resonansi | dibangun | Baca kata bersuara ≥ 80% |
| 007 | Ketukan Khusus | dibangun | Hitung ketukan kata *baru* ≥ 80% |
| 008 | Cakrawala Katakana | dibangun | Baca katakana ≥ 80% |
| 009 | Kebangkitan Kanji | dibangun | Baca lewat furigana (kata belum dipelajari) ≥ 80% |
| 010 | Raja di Ujung | dibangun | Temukan predikat pada kalimat baru ≥ 80% |
| 011 | Penghubung Relasi (partikel) | dibangun | Temukan partikel dan perannya pada kalimat baru ≥ 80% |
| 012 | Seni Konteks | dibangun | Pulihkan pelaku tersirat dari konteks ≥ 70% |
| 013 | Tiga Mesin | dibangun | Klasifikasi keluarga predikat pada kalimat baru ≥ 80% |
| 014 | Bentuk Dasar & Pakaian Sosial | dibangun | Kenali bentuk kamus ↔ sopan ≥ 80% |
| 015 | Protokol Dekode | dibangun | Raja ≥ 80% dan protokol lengkap ≥ 75% pada teks baru |
| 016 | Ujian Kompas | dibangun | Lima kompetensi, tiap ruangan ≥ 60%, materi sepenuhnya baru |

## 6. Arsitektur Room

Satu lantai = urutan **Room**; jumlah soal tidak mendefinisikan lantai. Lima jenis Room (`types.ts`) cukup untuk lantai 001–010:

| Jenis | Fungsi | Interaksi |
|---|---|---|
| `lesson` | Temukan / Pelajari | Langkah-langkah: glyph + suara, tabel aksara, pita ketukan, potongan kalimat (raja), perbandingan, contoh |
| `choice` | Latih / Ingat | Pilihan ganda; dengar-saja (`listenOnly`) dengan fallback teks bila perangkat tak punya suara Jepang |
| `pair` | Latih | Pasangkan kiri ↔ kanan |
| `build` | Latih | Susun ubin aksara menjadi kata |
| `pick` | Latih / Ingat | Ketuk bagian kalimat (raja, kanji, ekor) |

Aturan Room latihan (`usePracticeQueue`):

* **Soal salah kembali ke antrean** sampai benar (pengambilan ulang), tetapi akurasi dihitung dari **percobaan pertama**.
* Room dengan `passRatio` adalah **ujian**: jika akurasi percobaan-pertama di bawah ambang, tampil layar "Ulangi Ujian" (urutan baru).
* Setiap lantai wajib punya ≥ 1 Room latihan dan ≥ 1 ujian (dijaga tes). Tidak ada HP/nyawa: ini lapisan onboarding.
* Markup teks Jepang: `[漢字|かんじ]` dirender sebagai furigana.

Akurasi lantai = benar-pertama ÷ total di semua Room latihan. Bintang: ≥ 90% = 3, ≥ 75% = 2, selain itu 1.

## 7. Pemetaan konten (database → konten → konsep → kemampuan → lantai → Room)

Lantai 003–008 menuntut **kolam tertutup**: setiap kata hanya memakai aksara yang sudah diajarkan, supaya klaim "baca tanpa Romaji" benar.
Karena itu kolam kata Menara 1 ditulis tangan di `src/data/tower1/words.ts` (dan `floor008.ts`), bukan ditarik langsung dari `kotoba.json`.
Tes `Kolam kata …` menolak kata yang memakai aksara di luar kolam; tes ini sudah menangkap tiga kata yang salah tempat selama pembangunan
(たまご, ことば, みず berdakuten sebelum lantai 006). Lantai 011–016 akan memakai kalimat nyata dari database (`sentences.json`, `kotoba.json`)
setelah disaring terhadap aksara yang sudah dikenal.

## 8. Progres, hadiah, penyimpanan

* Kunci: `localStorage['nq_tower1_progress']` = `{ cleared: { [id]: { stars, accuracy, clearedAt, attempts } } }`; rekor terbaik yang disimpan.
* Hadiah EXP/emas (`FloorSpec.reward`) diberikan **sekali**, pada penyelesaian pertama, lewat `onRewardPlayer`.
* Ikut sinkron cloud (`TowerCloudState.tower1`, digabung dengan `mergeTower1Progress`: union lantai, rekor terbaik menang).
* Gerbang masuk: `TOWER_ENABLED` di `src/data/featureFlags.ts` (kini `true`). Mode Tower di World menampilkan `Tower1View`.
* Kode Menara 1000-lantai lama (`engine/tower`, `components/tower`) **tidak dihapus**; tidak lagi dirender dari World. Pakai ulang untuk menara berikutnya atau hapus.

## 9. Desain visual (seragam dengan aplikasi)

Mengikuti `DESIGN.md`: `panel panel-stitched` untuk kartu besar, `bg-surface-inset` untuk wadah cekung, `btn-physical-primary/secondary`,
`ui-chip`, `ui-icon-box`, tanpa gradient/glow/outline berwarna; aksen emas/hijau/merah hanya pada teks, ikon, badge, bar progres.
Satu-satunya outline berwarna: umpan balik benar/salah pada opsi jawaban (pengecualian resmi DESIGN.md).

## 10. Checklist membangun lantai 011–016

1. Tulis Room di `src/data/tower1/content/floorNNN.ts`, daftarkan di `data/tower1/index.ts`, ubah `status` jadi `'ready'` di `floors.ts`.
2. Perbarui tes (`Lantai ready punya Room` memeriksa daftar lantai ready secara eksplisit).
3. Kalimat hanya memakai aksara/kata yang sudah dikenal dari prasyarat lantai itu.
4. Jangan menyerap Menara 2: tanpa konjugasi, te-form, keigo, transitif/intransitif, kosakata besar.
5. Tiap lantai: ≥ 1 ujian (`passRatio`) yang menguji **transfer** (materi baru), bukan hafalan Room latihan.

## 11. Risiko terbuka (perlu playtest)

* **Suara**: seluruh Room dengar bergantung pada `speechSynthesis` ja-JP. Ada fallback teks, tetapi belum ada audio terekam; kualitas suara beragam antar-perangkat.
* **Beban 003–005**: tiga lantai hiragana berurutan berat; pantau tingkat gagal ujian dan pertimbangkan ujian adaptif.
* **Peta**: apakah rekomendasi tunggal cukup mencegah paralisis setelah 006 (membuka 007/008/009/010 sekaligus)?
* **Kolam kata kecil**: soal bisa terasa berulang pada pengulangan lantai; perbesar kolam bila perlu.
* **Lantai 001–002**: sengaja ringan; verifikasi tidak terasa seperti "mini buku teks".


## Jenis Room (yang dilihat pemain)

Hierarki: Menara → Lantai → Ruangan. Label di UI adalah jenis kemampuan tiap **ruangan** (`Room.skill`): Pemahaman Pola, Pemahaman Bunyi, Pemahaman Tulisan, Pemahaman Kata, Pemahaman Kalimat, Latihan Menulis. Peta menampilkan jenis ruangan yang ada di tiap lantai; label peran node (Jalur Utama/Cabang/Gerbang/Konvergensi/Ujian Kompas) tidak lagi dipakai di antarmuka.
