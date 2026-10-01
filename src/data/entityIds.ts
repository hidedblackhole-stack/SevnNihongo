/**
 * Identitas materi: tabel alias ID lama -> ID kanonik.
 *
 * Prinsip (lihat peta arsitektur): setiap materi punya SATU identitas permanen. ID warisan
 * tidak boleh menjadi entri tambahan di basis data (menggandakan materi), hanya alias pencarian.
 * Berkas ini sengaja tanpa impor dataset agar ringan dan bisa dipakai di mana saja.
 */

/** bunpou_00X (format lama) -> ID kanonik di bunpou.json. */
export const LEGACY_BUNPOU_ID_ALIASES: Readonly<Record<string, string>> = {
  bunpou_001: 'w1d1g1',
  bunpou_002: 'w1d1g2',
  bunpou_003: 'w1d1g3',
  bunpou_004: 'w1d2g1',
  bunpou_005: 'w1d2g2',
};

/** Ubah ID warisan menjadi ID kanonik; ID lain dikembalikan apa adanya. */
export function resolveLegacyId(id: string): string {
  return Object.prototype.hasOwnProperty.call(LEGACY_BUNPOU_ID_ALIASES, id) ? LEGACY_BUNPOU_ID_ALIASES[id] : id;
}

/**
 * Daftarkan `aliasKey` sebagai kunci PENCARIAN (non-enumerable) pada basis data berbentuk Record.
 * `db[alias]` tetap berfungsi, tetapi Object.values/keys/entries tidak lagi menghitung materi dua kali.
 */
export function defineLookupAlias<T>(db: Record<string, T>, aliasKey: string, value: T): void {
  if (Object.prototype.hasOwnProperty.call(db, aliasKey)) return;
  Object.defineProperty(db, aliasKey, { value, enumerable: false, configurable: true, writable: true });
}
