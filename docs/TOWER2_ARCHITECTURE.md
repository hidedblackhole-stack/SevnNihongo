# MENARA 2 — MENARA RANGKAI · LANTAI 017–100

Status: **dibangun dan dapat dimainkan** (84 lantai). Melanjutkan Menara 1 (001–016, "melihat") dengan "memakai":
kosakata, kanji, perubahan bentuk, dan pola kalimat dari N5 sampai gerbang N4.

Kode: `src/data/tower2/` (rencana + generator), `src/data/towers.ts` (gabungan Menara 1+2),
`src/components/tower1/` (UI bersama, ada tab Menara 1 / Menara 2). Tes: `src/engine/tower1/tower2.test.ts` (masuk `npm test`).

## 1. Struktur

* **Satu rantai linear**: tiap lantai butuh lantai sebelumnya (`hard: [id-1]`); 017 butuh 016. Progres memakai penyimpanan yang sama dengan Menara 1
  (`nq_tower1_progress`, kunci = nomor lantai) sehingga sinkron cloud tidak berubah.
* **Penjaga** di tiap kelipatan 10 (020, 030, ..., 100): ujian campuran dari soal 9 lantai sebelumnya (`passRatio` 0,75). Lantai 100 mencakup seluruh arc.
* Urutan arc ditulis eksplisit di `SEQUENCE` pada `src/data/tower2/floors.ts` supaya pedagogi mudah diaudit; tes menjaga jumlah per arc.

| Arc | Lantai | Jumlah | Isi |
|---|---|---|---|
| Kosakata N5 (`kotoba5`) | 12 | 24 kata/lantai | kata JLPT N5 dari `kotoba.json` (diacak seed tetap), furigana, contoh kalimat |
| Perubahan bentuk (`konj`) | 9 | | golongan, ます, て I/II, た, ない, kata sifat-i, kata sifat-na & benda, ます lengkap |
| Kanji N5 (`kanji5`) | 8 | 10 kanji/lantai | `kanji.json` diurut goresan, kata nyata dari Kotoba |
| Pola N5 (`pola5`) | 10 | 11–12 pola | `bunpou.json` bp_n5_*, soal dari `bunpou_questions.json` |
| Kosakata N4 (`kotoba4`) | 9 | 24 kata | sama dengan N5, level N4 |
| Kanji N4 (`kanji4`) | 7 | 23–24 kanji | |
| Pola N4 (`pola4`) | 14 | 13–14 pola | bp_n4_* |
| Bentuk lanjut (`lanjut`) | 6 | | potensial, よう/たい, ば/たら, pasif, kausatif, perintah + kausatif-pasif |
| Penjaga (`boss`) | 9 | | ujian campuran |

## 2. Isi Room

Room dibangun di `rooms.ts` (dimuat malas lewat `import()` karena membaca database besar) dan disimpan di cache per lantai.
Jenis Room sama dengan Menara 1 (lesson/choice/pair/build/pick), sehingga UI dan aturan latihan tidak berubah
(soal salah kembali ke antrean, akurasi dari percobaan pertama, ujian = Room dengan `passRatio`).

* **Kosakata**: Temukan → Baca & Pahami → Kata untuk Arti → Dengar → Lengkapi Kalimat (hanya jika contoh memuat kata itu) → Susun Bacaan → Ujian.
  Pengecoh = kata sejenis (jenis kata sama); arti yang saling memuat dibuang (`overlaps`) agar jawaban tidak ambigu; kata dengan arti kembar dibuang.
* **Kanji**: Temukan → Kanji→Arti → Arti→Kanji → Bacaan Kata → Dengar & Pilih Kata → Susun Bacaan → Ujian. Kata nyata dipilih dari Kotoba
  (utamakan kata yang persis sama dengan kanji, lalu level termudah, lalu terpendek), karena `relatedWords` di `kanji.json` berisi bacaan mentah gaya kamus kanji.
* **Pola**: Temukan (rumus + arti + contoh) → Arti Pola → Lengkapi Kalimat → Ujian. Pengecoh soal rumpang di database sama untuk semua pola,
  jadi diganti pola lain dari lantai yang sama.
* **Perubahan bentuk**: bentuk dihitung `engine/morphology/inflectionEngine` (`conjugateVerb`, `conjugateAdjective`), bukan ditulis tangan.
  Pengecoh = bentuk dari golongan yang salah (`groupOverride`), bentuk lain dari kata yang sama, atau salah-kaprah khas (mis. `おおきいくない`).
  Kata dipilih bervariasi akhiran (round-robin per huruf akhir). Kata sifat-na yang berakhir い (きれい, ゆうめい) sengaja dilewati agar tidak ambigu dengan kata sifat-i.

## 3. Hadiah & penyimpanan

EXP `100 + 2×lantai` (×2,5 untuk Penjaga), emas = setengahnya, hanya pada penyelesaian pertama. Bintang dan rekor sama seperti Menara 1.

## 4. Risiko terbuka

* **Konten database**: arti, contoh, dan bacaan bergantung pada kualitas `kotoba.json`/`bunpou.json`; tes struktural tidak menangkap arti yang janggal. Perlu playtest dan perbaikan di sumber data.
* **Urutan pola**: pola N5/N4 mengikuti urutan id (kurang lebih alfabetis), bukan kesulitan. Pertimbangkan pengurutan berdasarkan kemunculan.
* **Kosakata acak**: lantai kosakata tidak bertema (diacak dengan seed tetap). Tema butuh tag topik yang belum ada di database.
* **Beban ujian Penjaga**: 17–50 soal berturut-turut; pantau tingkat gagal.
* **Suara**: sama seperti Menara 1, bergantung pada `speechSynthesis` ja-JP dengan fallback teks.
