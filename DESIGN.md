# NIHONGO QUEST — PANDUAN DESAIN SISTEM (DESIGN.md)
*Gaya: Skeuomorphism Simple (Buku Catatan Petualang · Kertas Washi Tradisional & Kulit Penjilid)*

Dokumen ini adalah **pedoman wajib** untuk setiap pembuatan atau modifikasi antarmuka (UI) di Nihongo Quest. Setiap komponen baru harus mematuhi aturan ini agar konsistensi visual tetap terjaga.

---

## 🏛️ Filosofi Inti
Nihongo Quest mengusung tema **Buku Petualang Jepang Klasik (Fantasy Washi & Leather Scroll)**. Antarmuka harus terasa seperti benda fisik nyata yang bisa disentuh: buku catatan bersampul kulit, lembaran kertas washi, papan kayu dojo, dan stempel hanko tradisional.

---

## 🚫 ATURAN UTANG-MATI (STRICT PROHIBITIONS)

### 1. DILARANG Memakai CSS Gradient (`bg-gradient-*`)
- ❌ **JANGAN PERNAH** menggunakan `bg-gradient-to-r`, `bg-gradient-to-b`, atau linear gradient modern/neon pada container, card, banner, modal, maupun scorecard.
- ✅ **Gunakan Surface Tiers Solid Bertingkat**:
  - `bg-surface-base`: Latar belakang utama aplikasi (`#12151d`).
  - `bg-surface-card`: Kartu atau wadah konten utama (`#1f242f`).
  - `bg-surface-inset`: Area cekung/inset seperti wadah info, input, tray kuis (`#191d26`).
  - `bg-surface-elevated`: Komponen mengambang / dropdown (`#2a3040`).

### 2. DILARANG Memakai Border/Outline Warna-Warni
- ❌ **JANGAN** memberi border tebal warna-warni pada card (contoh: `border-2 border-amber-500/30`, `border-crimson/50`, `border-teal/40`, `ring-amber-500`).
- ✅ **Gunakan Border Skeuomorfik Standar**:
  - `border border-border-subtle`: Border halus default (`rgba(111, 147, 207, 0.18)`).
  - `border border-border-primary`: Border saat hover atau penekanan halus.
  - Untuk menonjolkan kartu, gunakan **perbedaan kedalaman fisik (elevation & inset)** atau tag/badge kecil di dalamnya, **BUKAN** border warna-warni di sekeliling kartu.

### 3. DILARANG Memakai Efek Glow / Blur Modern
- ❌ **JANGAN** menaruh blob lingkaran blur (seperti `<div className="blur-2xl bg-amber-500/10 rounded-full" />`).
- ✅ Gunakan shadow taktil skeuomorfik (`shadow-sm`, `shadow-md`, `shadow-inner`).

### 4. DILARANG Memakai Kata-Kata Marketing / Buzzwords
- ❌ Hindari kata: *"Medsos"*, *"Viral"*, *"Salin Format Medsos"*, hashtag (`#NihongoQuest`), atau gimmick sosmed eksplisit.
- ✅ Gunakan istilah in-game yang imersif dan elegan:
  - *"Arena Arcade"*
  - *"Tantangan Kecepatan"*
  - *"Survival 3 Nyawa"*
  - *"Sprint Kosakata"*
  - *"Main Lagi"*
  - *"Pilih Level Lain"*
  - *"Kembali ke Arena"*

---

## 🎨 Penggunaan Aksen Warna yang Benar

Warna aksen **HANYA** boleh digunakan pada:
1. **Teks & Angka Skor**: misal `text-gold` untuk skor, `text-crimson` untuk nyawa/bahaya.
2. **Ikon Kecil**: misal `<Heart className="text-crimson fill-crimson" />`, `<Zap className="text-amber-400" />`.
3. **Badge / Stamp Kecil**: Kotak status kecil di dalam card (misal stamp level `N5`, atau badge rank `SS`).
4. **Indikator Progres Bar / Ruler**: Bar pengisi progres.

Warna **TIDAK BOLEH** meluap menjadi outline kartu atau background gradasi wadah.

---

## 🎛️ Komponen Standar yang Wajib Digunakan

### 1. Panel & Kartu
```tsx
// Benar (Skeuomorphic Simple):
<div className="panel p-5 rounded-3xl bg-surface-card border border-border-subtle shadow-md">
  ...
</div>

// Wadah Inset (Cekung):
<div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
  ...
</div>
```

### 2. Tombol Aksi Fisik (Tactile Physical Buttons)
```tsx
// Tombol Utama (Timbul dengan bevel 3D tactile):
<button className="btn-physical-primary py-2.5 px-4 rounded-xl text-xs font-bold font-heading">
  Mulai
</button>

// Tombol Sekunder Fisik:
<button className="btn-physical-secondary py-2.5 px-4 rounded-xl text-xs font-bold font-heading">
  Pilih Level Lain
</button>

// Tombol Netral / Batal:
<button className="btn btn-secondary py-2.5 px-4 rounded-xl text-xs font-heading">
  Kembali
</button>
```

### 3. Layar Hasil Permainan (Scorecard)
- Kartu skor berbentuk **plakat kayu/kulit taktil**:
  - Background: `bg-surface-card` solid.
  - Border: `border border-border-subtle`.
  - Header: Identitas game yang elegan (misal: `NIHONGO QUEST · SPEED RUSH`).
  - Badge Rank: Kotak stempel taktil kecil di pojok kanan.
  - Footer: Keterangan mode yang bersih tanpa tagar.
  - Tombol aksi:
    - 🔄 **Main Lagi** (`btn-physical-primary`)
    - 📑 **Pilih Level Lain** (`btn-physical-secondary`)
    - ↩️ **Kembali ke Arena** (`btn-secondary`)

---

## 📜 Checklist Sebelum Menyimpan Kode UI
- [ ] Apakah ada `bg-gradient-*`? Jika ada, **HAPUS dan ganti ke warna solid**.
- [ ] Apakah ada border tebal berwarna mencolok (`border-2 border-amber...`)? Jika ada, **GANTI ke `border border-border-subtle`**.
- [ ] Apakah ada `blur-2xl` atau neon glow? Jika ada, **HAPUS**.
- [ ] Apakah ada kata "medsos", "viral", atau tombol "salin format"? Jika ada, **HAPUS**.
- [ ] Apakah tombol menggunakan style fisik (`btn-physical-primary` dsb)? Jika belum, **SESUAIKAN**.

---

## 🧵 Sampul Kulit & Jahitan (Leather Panel)
- Semua **kartu/panel besar** memakai `panel` + `panel-stitched` (bahan kulit solid `bg-surface-card`, bevel/emboss lewat `--neu-d/--neu-l`, **jahitan putus-putus** di dalam via `::after`). Jangan menggantinya dengan outline atau gradient.
- Wadah cekung (`bg-surface-inset`) **tidak** dijahit: itu lubang/inset, bukan sampul.
- **Dilarang di semua layar:** gradient pada wadah, outline/ring berwarna (gold, amber, indigo, teal, dst.), glow, blob blur, `backdrop-blur`. Aksen warna hanya pada teks, ikon, isi badge/stempel, dan bar progres.
- Satu-satunya pengecualian outline berwarna: umpan balik jawaban benar/salah pada tombol pilihan kuis.
- Tidak diberi jahitan: elemen `sticky`/`absolute`, kontainer yang bisa di-scroll (`overflow-y-auto`), chip/badge kecil, dan tombol (tombol memakai `btn-physical-*`).

---

## 🔘 Peta Kelas Tombol (semua tombol aksi harus fisik)
| Peran | Kelas | Catatan |
|---|---|---|
| Aksi utama | `btn-physical-primary` (setara: `btn`, `btn-cta`, `rpg-btn`, `btn-skeuo-indigo`) | permukaan timbul + tepi bawah 4px, turun saat ditekan |
| Aksi sekunder / netral / batal / tombol ikon berbingkai | `btn-physical-secondary` (setara: `btn btn-secondary`, `btn btn-pill`, `skeuo-btn`) | tepi bawah 3px |
| Aksi berbahaya (hapus/reset/keluar) | `btn-physical-danger` | |
| Tab / filter / pilihan **terpilih** | `seg-active` + aksen di teks (`text-gold`) | jangan memakai `bg-indigo text-white` atau `bg-gold` datar |
| Wadah cekung | `bg-surface-inset` | otomatis mendapat ukiran dalam bila tidak punya `shadow-*` sendiri |

- **Jangan** menambahkan `bg-*`, `border-*`, `shadow-*`, `hover:scale-*`, atau `active:scale-*` pada tombol berkelas di atas: utilitas itu menimpa bahan tombol dan membuatnya datar.
- Yang boleh tetap tanpa bahan tombol: tautan teks, tombol ikon tanpa bingkai, baris daftar, dan opsi jawaban kuis.
