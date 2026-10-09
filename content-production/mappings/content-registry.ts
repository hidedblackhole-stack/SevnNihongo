import type { ContentEntry } from './types';

/** Registry hanya MENUNJUK data asli. Isi pembelajaran di-resolve saat build (scripts/resolve-content.ts). */
export const CONTENT_REGISTRY: ContentEntry[] = [
  {
    id: 'bunpou-ta-hou-ga-ii',
    type: 'bunpou',
    query: 'たほうがいい',
    // Engine pencarian asli menemukan bp_n5_101 (judul "ほうがいい", rumus "Kata Kerja [Bentuk-ta] + ほうがいい").
    source: { dataset: 'bunpou', lookupKey: 'たほうがいい', expectedEntityId: 'bp_n5_101' },
    demoPaths: ['library-search-bunpou'],
    sceneSequence: ['intro', 'explanation', 'website-demo', 'examples', 'outro'],
  },
];

export const getContent = (id: string) => CONTENT_REGISTRY.find((c) => c.id === id);
