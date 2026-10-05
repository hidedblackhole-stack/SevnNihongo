# Audit Choukai (聴解) — Simulasi JLPT

Tanggal audit: 2026-10-05. Audit hanya membaca data; tidak ada data yang diubah.
Sumber: `src/data/tryouts/*.json` dan `src/data/tryouts/official/*.json`, plus `src/data/choukai.ts`.

## Ringkasan

- Paket simulasi: **35**; punya soal Choukai: **23**; kosong: **12**.
- Total soal Choukai: **673**.
- Soal dengan skrip percakapan (`audioText`/`ruby`/`transcript`/`script`/`dialogue`): **0**.
- Soal dengan kalimat audio pendek (field `audio`): **20** (semuanya `jft_001`; simulasi tidak memakainya).
- Soal yang pilihan jawabannya hanya angka 1–4 (jawaban berupa gambar di kertas ujian): **75**.
- File audio di repo: **0**. Folder `public/audio` tidak ada.
- `audioUrl` yang menunjuk ke file yang tidak ada: n5_001 → /audio/n5_001.m4a; n4_001 → /audio/n4_001.m4a; n3_001 → /audio/n3_001.mp3; n2_001 → /audio/n2_001.mp3; n2_002 → /audio/n2_002.mp3; n3_002 → /audio/n3_002.mp3.
- Di luar simulasi: `data/choukai.ts` berisi 1 dialog lengkap dengan transkrip (`choukai_001`, 3 soal).

## Cara simulasi memutar audio

`DungeonBattleModule.tsx` memutar satu file `section.audioUrl` untuk seluruh sesi Choukai. Tanpa file itu tombol "Mulai Audio" tidak mengeluarkan suara. Skrip per soal tidak dipakai.

## Detail per paket

| Paket | Level | Soal Choukai | Skrip | Kalimat audio | Pilihan hanya angka | audioUrl | Status |
|---|---|---|---|---|---|---|---|
| n5_001 | N5 | 0 | 0 | 0 | 0 | /audio/n5_001.m4a | Kosong (tanpa soal Choukai) |
| n4_001 | N4 | 0 | 0 | 0 | 0 | /audio/n4_001.m4a | Kosong (tanpa soal Choukai) |
| n4_002 | N4 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n3_001 | N3 | 0 | 0 | 0 | 0 | /audio/n3_001.mp3 | Kosong (tanpa soal Choukai) |
| n3_2020_12 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2021_12 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2022_07 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2022_12 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2023_07 | N3 | 28 | 0 | 0 | 2 | - | Soal tanpa skrip |
| n3_2023_12 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2024_07 | N3 | 28 | 0 | 0 | 4 | - | Soal tanpa skrip |
| n3_2024_12 | N3 | 28 | 0 | 0 | 3 | - | Soal tanpa skrip |
| n3_2025_07 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n3_2025_12 | N3 | 28 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n2_001 | N2 | 0 | 0 | 0 | 0 | /audio/n2_001.mp3 | Kosong (tanpa soal Choukai) |
| n2_002 | N2 | 0 | 0 | 0 | 0 | /audio/n2_002.mp3 | Kosong (tanpa soal Choukai) |
| n2_003 | N2 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n2_2021_07 | N2 | 30 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n2_2021_12 | N2 | 30 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n2_2022_07 | N2 | 30 | 0 | 0 | 11 | - | Soal tanpa skrip |
| n2_2022_12 | N2 | 30 | 0 | 0 | 11 | - | Soal tanpa skrip |
| n2_2023_07 | N2 | 30 | 0 | 0 | 11 | - | Soal tanpa skrip |
| n2_2023_12 | N2 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n2_2024_07 | N2 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n2_2024_12 | N2 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n1_001 | N1 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| n1_2020_12 | N1 | 35 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n1_2021_07 | N1 | 35 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n1_2022_07 | N1 | 35 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n1_2023_07 | N1 | 30 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n1_2023_12 | N1 | 30 | 0 | 0 | 0 | - | Soal tanpa skrip |
| n1_2024_07 | N1 | 30 | 0 | 0 | 17 | - | Soal tanpa skrip |
| n1_2024_12 | N1 | 0 | 0 | 0 | 0 | - | Kosong (tanpa soal Choukai) |
| jft_001 | JFT | 20 | 0 | 20 | 0 | - | Ada kalimat audio per soal (belum dipakai simulasi) |
| n3_002 | - | 28 | 0 | 0 | 16 | /audio/n3_002.mp3 | Soal tanpa skrip |

## Temuan

1. Tidak ada soal Choukai JLPT yang punya skrip percakapan. Soal resmi hanya berisi "1番", "2番", dan pilihan jawaban; teks soalnya ada di audio asli, jadi TTS tidak bisa dibuat dari data yang ada.
2. 12 paket tidak punya soal Choukai sama sekali; simulasinya sudah berjalan tanpa Sesi 3.
3. Satu-satunya paket yang punya teks untuk diucapkan adalah `jft_001` (20 soal, satu kalimat per soal), tetapi sesi simulasi belum membaca field itu.
4. `n3_002` punya 28 soal dan `audioUrl` tetapi file audionya tidak ada.

## Rekomendasi

1. Mulai dari `jft_001` (skrip sudah ada) dan `n3_002` (28 soal; skrip perlu ditulis agar cocok dengan `correctIndex`).
2. Paket resmi tetap teks-only sampai skrip yang boleh dipakai tersedia (buatan sendiri atau yang hak ciptanya jelas).
3. Setelah skrip ada, buat audio sekali (build-time) dan simpan sebagai file; TTS browser hanya sebagai cadangan.
4. Aktifkan lagi dengan `CHOUKAI_ENABLED = true` di `src/data/featureFlags.ts` setelah audio siap.
