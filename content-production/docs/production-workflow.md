# Alur produksi & menambah konten baru

## Video baru untuk pola Bunpou lain
1. **content-registry.ts** — tambah entry: `id`, `query` (yang diketik di video), `source.lookupKey`, `expectedEntityId` (kunci id kanonik, agar tidak bergantung ranking pencarian), `demoPaths: ['library-search-bunpou']`.
   Cek dulu hasil pencarian asli; contoh: `たほうがいい` → `bp_n5_101` (judul "ほうがいい", bukan "たほうがいい").
2. **videos/** — salin `video-ta-hou-ga-ii.ts`, ganti `id`, `topicId`, durasi/subtitle; daftarkan di `videos/index.ts`.
3. `npm run validate` → `npm run resolve` → jalankan app (`npm run dev` di root) → `npm run capture -- <contentId>` → `npm run generate` → `npm run studio` → `npm run render -- <videoId>`.

Catatan: scene `examples` menyorot `b.title`; `explanation` memakai kalimat pertama catatan data asli.

## Jalur navigasi baru (mis. Kotoba)
1. Tambah selector di `website/selectors/index.ts` (role/placeholder; isi `anchor` dari source komponen).
2. Ubah jalur di `navigation-map.ts` dari `future` ke `available` + isi `steps` (`click`/`type`/`scroll`/`highlight`, `waitFor`).
3. `npm run validate`, lalu capture. Jika sebuah langkah gagal, baca pesan error + `generated/capture/.../FAILED-<step>.png`.

## Aset
Tambah di `asset-registry.ts` dengan `file` relatif root repo; status `available` wajib punya file (divalidasi). Jangan membuat placeholder berstatus available.

## Voice-over
`SceneSpec.voiceover {file, startFrame}` memutar audio dari `public/`. Isi `durationFrames` angka (durasi audio belum diukur otomatis).
