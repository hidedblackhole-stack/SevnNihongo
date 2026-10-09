import type { AssetEntry } from './types';

/**
 * Aset karakter yang SUDAH ada di repo (avatar per tier, pria/wanita). Ekspresi/gesture belum ada sebagai file
 * terpisah → 'future' (tidak ada placeholder yang dianggap final). Path relatif ke root repo SevnQuest.
 */
const tier = (gender: 'male' | 'female', n: number): AssetEntry => ({
  id: `character-${gender}-tier-${n}`,
  kind: 'character',
  status: 'available',
  file: gender === 'female' ? `public/avatars/female/tier-${n}.png` : `public/avatars/tier-${n}.png`,
  variant: { gender, tier: String(n) },
  transparent: true,
  source: 'Aset avatar asli aplikasi (public/avatars)',
  usage: 'Karakter pendamping di scene penjelasan / outro',
});

export const ASSETS: AssetEntry[] = [
  ...(['male', 'female'] as const).flatMap((g) => Array.from({ length: 10 }, (_, i) => tier(g, i + 1))),
  { id: 'expression-thinking', kind: 'expression', status: 'future', source: '-', usage: 'Belum ada ilustrasi ekspresi resmi' },
  { id: 'gesture-pointing', kind: 'gesture', status: 'future', source: '-', usage: 'Belum ada ilustrasi gesture resmi' },
];

export interface AssetQuery { kind: AssetEntry['kind']; variant?: Record<string, string> }

/** Cari aset tersedia; undefined bila tidak ada (pemanggil memutuskan fallback, bukan placeholder diam-diam). */
export function findAsset(q: AssetQuery): AssetEntry | undefined {
  return ASSETS.find((a) => a.kind === q.kind && a.status === 'available' &&
    Object.entries(q.variant ?? {}).every(([k, v]) => a.variant?.[k] === v));
}
