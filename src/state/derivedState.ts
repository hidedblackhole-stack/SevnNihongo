import type { PlayerStats } from '../types/rpg';
import { buildSmartRecallQueue } from '../utils/mastery';

/**
 * Data TURUNAN tidak disimpan / dikirim ke cloud: dihitung ulang dari `itemMastery`.
 * Yang dipersistenkan hanyalah relasi pemain ↔ materi (ID + status + skor + jadwal SRS).
 * `recallQueue` berisi judul, soal contoh, dan salinan record mastery per item.
 */
export function stripDerivedStats<T extends Partial<PlayerStats>>(stats: T): Omit<T, 'recallQueue'> {
  const { recallQueue: _derived, ...persisted } = stats;
  return persisted;
}

/** Hitung ulang data turunan setelah stats dimuat/digabung dari sumber luar. */
export function withDerivedStats(stats: PlayerStats): PlayerStats {
  try {
    return { ...stats, recallQueue: buildSmartRecallQueue(stats.itemMastery || {}) };
  } catch (err) {
    console.warn('Failed to rebuild recall queue', err);
    return { ...stats, recallQueue: [] };
  }
}
