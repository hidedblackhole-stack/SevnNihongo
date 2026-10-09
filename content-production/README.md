# SevnQuest Content Production

Mesin video edukasi: **topik → data asli SevnQuest → jalur navigasi website → capture → scene Remotion → render**.
Data pembelajaran tidak disalin; resolver memanggil engine pencarian & dataset asli di `../src`.

## Pendekatan: Hybrid (capture nyata + Remotion)
| | Real capture (Playwright) | Rekonstruksi UI di Remotion | **Hybrid (dipakai)** |
|---|---|---|---|
| Akurasi tampilan | 100% (app asli) | Rawan beda | 100% |
| Maintenance | Rendah (selector + anchor tervalidasi) | Tinggi (ikut ubah UI) | Rendah |
| Determinisme render | Video rekaman: timing wall-clock | Tinggi | Tinggi: PNG per langkah + bbox, kursor/zoom/highlight digambar Remotion |
| Fleksibilitas kamera | Terbatas | Penuh | Penuh |

Capture menyimpan **PNG keadaan layar setelah tiap aksi + bounding box target** (`timeline.json`).
Render final hanya membaca PNG lokal: tidak butuh website hidup/jaringan.

## Menjalankan (dari folder ini)
```bash
npm install
npm run validate     # mapping, selector-anchor, aset, konten ter-resolve, PNG capture
npm run resolve      # topik → generated/content/<id>.json (hanya 1 topik, bukan seluruh dataset)
# jalankan app di root repo:  npm run dev   (http://localhost:3000, atau set SEVNQUEST_URL)
npm run capture -- bunpou-ta-hou-ga-ii
npm run generate     # → public/video-data/<videoId>.json
npm run studio       # preview (composition "Video", prop videoId)
npm run render -- video-ta-hou-ga-ii        # → out/video-ta-hou-ga-ii.mp4
npx tsx scripts/render.ts video-ta-hou-ga-ii --still 650
```
Env: `SEVNQUEST_URL`, `CHROME_PATH` (default Chrome Windows).

## Peta folder
- `mappings/` — `content-registry`, `navigation-map`, `page-registry`, `asset-registry`, `types`
- `website/selectors` (selector bernama + anchor ke source), `website/capture`, `website/fixtures` (pemain fiktif)
- `scenes/` — `explanation`, `website-demo` (+`timing.ts`), `practice` (contoh), `outro`, `shared`
- `templates/grammar-explainer` — spec + data → props scene
- `videos/` — definisi video (`VideoSpec`); `compositions/` — Root generik
- `scripts/` — resolve, validate, generate, render, stills; `config/` — token desain & preset format

Dokumen: [docs/architecture.md](docs/architecture.md), [docs/production-workflow.md](docs/production-workflow.md).

## Batasan yang diketahui
- Hanya dataset **bunpou** + jalur `library-search-bunpou` yang tersedia. Kotoba/Kanji/Konjugasi ditandai `future` (selector belum dipetakan).
- Aset karakter: hanya avatar per tier (pria/wanita). Ekspresi & gesture belum ada → `future`, diabaikan dengan peringatan.
- Voice-over: schema & `<Audio>` ada, tetapi durasi audio belum diukur (durasi `auto` + voice-over ditolak validator).
- Layout 16:9: shot capture portrait ditampilkan letterbox di tengah.
- Animasi dekoratif tak berhenti (napas avatar Home, orb tab Rumus) membuat layar tak 100% identik; PNG hasil capture-lah yang final (peringatan dicetak).
- Timer belajar di header dibekukan (`52m`) saat capture agar deterministik.
