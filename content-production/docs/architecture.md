# Arsitektur

```
ContentEntry (registry) ──resolve──▶ ResolvedTopic (data asli, 1 topik)
      │ demoPaths
      ▼
NavigationPath (langkah + selector bernama) ──capture──▶ PNG per aksi + timeline.json (bbox)
      │
VideoSpec (scene, durasi) + template ──generate──▶ public/video-data/<id>.json
                                                      │
                          composition "Video" (Remotion) ──render──▶ mp4
```

## Prinsip
- **Sumber kebenaran = aplikasi.** `resolve-content.ts` memanggil `searchJapanese()` (engine pencarian universal) dan memakai `BunpouItem` asli. Tidak ada dataset di folder ini.
- **Tidak ada dataset di bundle video.** Remotion hanya membaca JSON satu video + PNG capture.
- **Selector** = role/placeholder/`data-tour` (app tidak punya `data-testid`). Tiap selector punya `anchor {file, contains}`: `npm run validate` gagal bila potongan itu hilang dari source (UI berubah) — tanpa perlu membuka browser. Saat capture, langkah gagal menyimpan `FAILED-<step>.png` dan menyebut selector + file source.
- **Menunggu kondisi**, bukan timeout: tiap langkah `waitFor` selector terlihat; screenshot diambil setelah dua frame berurutan identik.
- **Isolasi capture:** hanya `localhost` + Google Fonts yang diizinkan; pemain fiktif dari `website/fixtures/player-state.json`; viewport 432×768 @2.5 = 1080×1920.
- **Jalur `future`** tidak bisa dicapture/dipakai video (ditolak capture & validator).

## Kamera/kursor
`scenes/website-demo/timing.ts` (murni) merencanakan beat: durasi = perjalanan kursor + hold. Dipakai Remotion dan `generate-video-data` sehingga durasi `auto` konsisten. Kursor, ripple klik, zoom kamera, highlight+dim, dan caption digambar Remotion di atas PNG.

## Menambah variasi
- Scene baru: komponen di `scenes/`, case di `VideoFromConfig.tsx` + `SceneType` + template.
- Template baru (kotoba/kanji): folder di `templates/`, resolver dataset baru di `resolve-content.ts`.
