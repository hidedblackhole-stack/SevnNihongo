import type { Page, Locator } from 'playwright-core';
import type { SelectorDef } from '../../mappings/types';

export interface LocatorCtx { query: string; entityTitle?: string; firstExample?: string }
export interface LocatorDef extends SelectorDef { locate: (page: Page, ctx: LocatorCtx) => Locator }

/**
 * Selector stabil: role / accessible name / placeholder / atribut data-tour yang sudah ada di app.
 * Aplikasi TIDAK punya data-testid; `anchor` menunjuk potongan source asli sebagai bukti, dan dicek
 * oleh `npm run validate` supaya perubahan UI ketahuan sebelum capture.
 */
export const SELECTORS: Record<string, LocatorDef> = {
  'nav-library': {
    id: 'nav-library',
    description: 'Tombol "Library" di navigasi utama',
    anchor: { file: 'src/components/layout/BottomNavigation.tsx', contains: "data-tour={`nav-${item.id}`}" },
    locate: (page) => page.locator('nav[aria-label="Navigasi Utama"] [data-tour="nav-library"]'),
  },
  'library-tab-bunpou': {
    id: 'library-tab-bunpou',
    description: 'Tab "Tata Bahasa" (Jilid III) di Library',
    anchor: { file: 'src/components/library/LibraryView.tsx', contains: 'Tata Bahasa' },
    locate: (page) => page.getByRole('button', { name: /Tata Bahasa/ }),
  },
  'bunpou-search-input': {
    id: 'bunpou-search-input',
    description: 'Kolom cari rumus/arti di Kamus Tata Bahasa',
    anchor: { file: 'src/components/library/BunpouLibraryView.tsx', contains: 'Cari rumus, arti, fungsi...' },
    locate: (page) => page.getByPlaceholder('Cari rumus, arti, fungsi...'),
  },
  'bunpou-result-card': {
    id: 'bunpou-result-card',
    description: 'Kartu hasil Bunpou yang judulnya cocok dengan entity (h3 judul)',
    anchor: { file: 'src/components/library/BunpouLibraryView.tsx', contains: 'getGrammarTitleInfo(item)' },
    locate: (page, ctx) => page.getByRole('heading', { level: 3, name: ctx.entityTitle ?? ctx.query }).first(),
  },
  'bunpou-detail-dialog-tab-rumus': {
    id: 'bunpou-detail-dialog-tab-rumus',
    description: 'Tab "Rumus & Pola" pada detail Bunpou',
    anchor: { file: 'src/components/library/BunpouDetailModal.tsx', contains: "label: 'Rumus & Pola'" },
    locate: (page) => page.locator('[data-tab-id="rumus"]'),
  },
  'bunpou-detail-dialog-tab-contoh': {
    id: 'bunpou-detail-dialog-tab-contoh',
    description: 'Tab "Contoh Nyata" pada detail Bunpou',
    anchor: { file: 'src/components/library/BunpouDetailModal.tsx', contains: "label: 'Contoh Nyata'" },
    locate: (page) => page.locator('[data-tab-id="contoh"]'),
  },
  'bunpou-detail-formula': {
    id: 'bunpou-detail-formula',
    description: 'Kartu rumus pertama (tab Rumus & Pola)',
    anchor: { file: 'src/components/library/BunpouDetailModal.tsx', contains: 'skillNodes.formulas.map' },
    locate: (page) => page.locator('div[class*="rounded-2xl"][class*="bg-surface-inset"]:has(> h4)').first(),
  },
  'bunpou-detail-example': {
    id: 'bunpou-detail-example',
    description: 'Kartu contoh kalimat pertama (tab Contoh Nyata)',
    anchor: { file: 'src/components/library/BunpouDetailModal.tsx', contains: 'skillNodes.examples.map' },
    locate: (page) => page.locator('div[class*="rounded-2xl"][class*="bg-surface-inset"]:has-text("例 1")').first(),
  },
};
