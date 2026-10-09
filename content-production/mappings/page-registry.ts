import type { PageEntry } from './types';

/** Halaman/fitur website yang diketahui. Status 'future' = jangan dipakai di video. */
export const PAGES: PageEntry[] = [
  { id: 'library', label: 'Library', status: 'available', openVia: 'nav-library', sourceFile: 'src/components/library/LibraryView.tsx' },
  { id: 'library-bunpou', label: 'Library · Tata Bahasa', status: 'available', openVia: 'library-tab-bunpou', sourceFile: 'src/components/library/BunpouLibraryView.tsx' },
  { id: 'bunpou-detail', label: 'Detail Bunpou (modal)', status: 'available', openVia: null, sourceFile: 'src/components/library/BunpouDetailModal.tsx' },
  { id: 'library-kotoba', label: 'Library · Kosakata', status: 'future', openVia: null, sourceFile: 'src/components/library/KotobaLibraryView.tsx', note: 'selector belum dipetakan' },
  { id: 'library-kanji', label: 'Library · Kanji', status: 'future', openVia: null, sourceFile: 'src/components/library/KanjiLibraryView.tsx', note: 'selector belum dipetakan' },
];
