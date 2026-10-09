import type { NavigationPath } from './types';

/**
 * Jalur demonstrasi di website nyata. Hanya fitur yang ADA di source yang berstatus 'available';
 * sisanya 'future' dengan catatan (tidak dikarang). Satu konten boleh punya beberapa jalur
 * (lihat ContentEntry.demoPaths).
 */
export const NAVIGATION_PATHS: NavigationPath[] = [
  {
    id: 'library-search-bunpou',
    label: 'Library → Tata Bahasa → cari pola → detail (rumus, contoh)',
    status: 'available',
    appliesTo: ['bunpou'],
    steps: [
      { id: 'open-library', op: 'click', selector: 'nav-library', waitFor: 'library-tab-bunpou', caption: 'Buka menu Library', holdFrames: 12 },
      { id: 'open-bunpou-tab', op: 'click', selector: 'library-tab-bunpou', waitFor: 'bunpou-search-input', caption: 'Pilih Tata Bahasa', holdFrames: 12 },
      { id: 'type-query', op: 'type', selector: 'bunpou-search-input', text: '$query', waitFor: 'bunpou-result-card', caption: 'Ketik polanya', holdFrames: 24 },
      { id: 'scroll-to-result', op: 'scroll', selector: 'bunpou-result-card', caption: 'Hasil pencarian muncul', holdFrames: 24 },
      { id: 'open-detail', op: 'click', selector: 'bunpou-result-card', waitFor: 'bunpou-detail-dialog-tab-rumus', caption: 'Buka detail pola', holdFrames: 18 },
      { id: 'tab-rumus', op: 'click', selector: 'bunpou-detail-dialog-tab-rumus', waitFor: 'bunpou-detail-formula', caption: 'Rumus & Pola', holdFrames: 10 },
      { id: 'highlight-formula', op: 'highlight', selector: 'bunpou-detail-formula', zoom: 1.2, caption: 'Ini rumusnya', holdFrames: 60 },
      { id: 'tab-contoh', op: 'click', selector: 'bunpou-detail-dialog-tab-contoh', waitFor: 'bunpou-detail-example', caption: 'Contoh Nyata', holdFrames: 10 },
      { id: 'highlight-example', op: 'highlight', selector: 'bunpou-detail-example', zoom: 1.2, caption: 'Contoh kalimat', holdFrames: 60 },
    ],
  },
  {
    id: 'library-search-kotoba',
    label: 'Library → Kosakata → cari kata → detail',
    status: 'future',
    note: 'Selector Kotoba belum dipetakan (KotobaLibraryView/KotobaDetailModal ada di source; tinggal audit selector).',
    appliesTo: ['kotoba'],
    steps: [],
  },
  {
    id: 'kotoba-conjugation-dojo',
    label: 'Library → Tata Bahasa → Perubahan Bentuk Kata (Dojo konjugasi)',
    status: 'future',
    note: 'Fitur ada (ConjugationDojoView) tetapi interaksi belum dipetakan.',
    appliesTo: ['kotoba'],
    steps: [],
  },
];
