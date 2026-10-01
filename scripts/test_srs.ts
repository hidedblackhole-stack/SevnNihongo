// Regresi SRS / mastery + merge cloud. Jalankan: npx tsx scripts/test_srs.ts
import assert from 'node:assert/strict';
import { recordItemAttempt, recordItemInteraction } from '../src/utils/mastery';
import { mergeItemMastery, mergeUserDecks, mergeStageProgress } from '../src/utils/cloudMerge';
import { getLocalIsoWeekId } from '../src/utils/time';
import { getGameOverHp, getDojoRestCost, applyDojoRest, applyPotion, countPotions } from '../src/utils/recovery';
import { mergeTowerState, TowerCloudState } from '../src/engine/tower/world/towerCloudState';
import type { PlayerStats } from '../src/types/rpg';
import { KANJI_DATABASE } from '../src/data/kanji';
import { BUNPOU_DATABASE } from '../src/data/bunpou';
import { KOTOBA_DATABASE } from '../src/data/kotoba';
import { canonicalEntityId, canonicalizeItemMastery, canonicalizeDecks, canonicalizeStats } from '../src/state/canonicalizeStats';
import { toVocabularyEntity, toKanjiEntity, toGrammarEntity, getIdentityEntity } from '../src/data/entityAdapters';
import { resolveDeckItem } from '../src/utils/decks';
import { stripDerivedStats, withDerivedStats } from '../src/state/derivedState';
import { STORAGE_KEY_STATS, STORAGE_KEY_STAGES, STORAGE_KEY_DAILY } from '../src/state/storageKeys';
import type { ItemMasteryRecord } from '../src/types/content';
import type { UserDeck } from '../src/types/rpg';

// localStorage palsu (Node) untuk tes loadPlayerState
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
};

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

function perfectRun(n: number): ItemMasteryRecord {
  let rec: ItemMasteryRecord | undefined;
  for (let i = 0; i < n; i++) rec = recordItemAttempt(rec, 'x', 'kotoba', 5, 5);
  return rec!;
}

console.log('SRS');
test('interval naik monoton pada jawaban sempurna beruntun', () => {
  let rec: ItemMasteryRecord | undefined;
  let prev = 0;
  for (let i = 0; i < 7; i++) {
    rec = recordItemAttempt(rec, 'x', 'kotoba', 5, 5);
    assert.ok(rec.reviewIntervalDays >= prev, `interval turun di langkah ${i + 1}`);
    prev = rec.reviewIntervalDays;
  }
  assert.equal(rec!.reviewIntervalDays, 30);
});

test('salah total mereset interval ke 1 hari', () => {
  const rec = recordItemAttempt(perfectRun(6), 'x', 'kotoba', 0, 5);
  assert.equal(rec.reviewIntervalDays, 1);
  assert.equal(rec.consecutivePerfects, 0);
});

test('salah sebagian (4/5) menurunkan interval, bukan mempertahankan 30 hari', () => {
  const rec = recordItemAttempt(perfectRun(6), 'x', 'kotoba', 4, 5);
  assert.ok(rec.reviewIntervalDays < 30, `interval masih ${rec.reviewIntervalDays}`);
  assert.ok(rec.reviewIntervalDays >= 1);
});

test('input NaN / negatif / skor > total tidak meracuni record', () => {
  const nan = recordItemAttempt(undefined, 'n', 'kotoba', NaN, 5);
  const neg = recordItemAttempt(nan, 'n', 'kotoba', -3, 5);
  const over = recordItemAttempt(neg, 'n', 'kotoba', 100, 5);
  for (const rec of [nan, neg, over]) {
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v) && v >= 0, `${k} tidak valid: ${v}`);
    }
  }
});

test('nilai numerik record selalu finite & non-negatif pada urutan acak', () => {
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  let rec: ItemMasteryRecord | undefined;
  for (let i = 0; i < 300; i++) {
    const total = 1 + Math.floor(rnd() * 8);
    rec = recordItemAttempt(rec, 'r', 'bunpou', Math.floor(rnd() * (total + 1)), total);
    for (const [k, v] of Object.entries(rec)) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v) && v >= 0, `${k}=${v} @${i}`);
    }
    assert.ok(rec.masteryPercentage <= 100);
  }
});

test('membuka flashcard berulang tidak bisa mencapai MASTERED/PERFECTED', () => {
  let rec: ItemMasteryRecord | undefined;
  for (let i = 0; i < 100; i++) rec = recordItemInteraction(rec, 'z', 'kotoba', 'flashcard', true);
  assert.ok(rec!.masteryPercentage <= 70, `pct=${rec!.masteryPercentage}`);
  assert.ok(!['MASTERED', 'PERFECTED'].includes(rec!.status), `status=${rec!.status}`);
});

test('interaksi gagal dicatat sebagai kesalahan & tidak menurunkan status yang sudah diraih', () => {
  const mastered = perfectRun(5);
  const after = recordItemInteraction(mastered, 'x', 'kotoba', 'flashcard', false);
  assert.equal(after.mistakeCount, mastered.mistakeCount + 1);
  assert.equal(after.status, mastered.status);
});

console.log('Cloud merge');
test('mergeItemMastery: union + pilih record terbaru', () => {
  const a = { id1: { ...perfectRun(1), itemId: 'id1', lastReviewedAt: '2026-01-01T00:00:00Z' } };
  const b = {
    id1: { ...perfectRun(2), itemId: 'id1', lastReviewedAt: '2026-02-01T00:00:00Z' },
    id2: { ...perfectRun(1), itemId: 'id2' },
  };
  const merged = mergeItemMastery(a as never, b as never);
  assert.deepEqual(Object.keys(merged).sort(), ['id1', 'id2']);
  assert.equal(merged.id1.lastReviewedAt, '2026-02-01T00:00:00Z');
});

test('mergeUserDecks: deck hanya-lokal & hanya-cloud sama-sama selamat; yang lebih baru menang', () => {
  const mk = (id: string, updatedAt: string, title = id): UserDeck =>
    ({ id, title, type: 'mixed', createdAt: updatedAt, updatedAt, items: [] } as UserDeck);
  const merged = mergeUserDecks(
    [mk('a', '2026-03-01T00:00:00Z', 'a-lokal'), mk('onlyLocal', '2026-01-01T00:00:00Z')],
    [mk('a', '2026-02-01T00:00:00Z', 'a-cloud'), mk('onlyCloud', '2026-01-01T00:00:00Z')]
  );
  assert.equal(merged.length, 3);
  assert.equal(merged.find(d => d.id === 'a')!.title, 'a-lokal');
});

test('mergeStageProgress: cleared & stars diambil nilai tertinggi, modul di-union', () => {
  const merged = mergeStageProgress(
    { s1: { stageId: 's1', cleared: false, stars: 1, clearedModules: ['kanji'], lastPlayedAt: '2026-01-01T00:00:00Z' } },
    { s1: { stageId: 's1', cleared: true, stars: 3, clearedModules: ['bunpou'], lastPlayedAt: '2025-01-01T00:00:00Z' } }
  );
  assert.equal(merged.s1.cleared, true);
  assert.equal(merged.s1.stars, 3);
  assert.deepEqual([...merged.s1.clearedModules].sort(), ['bunpou', 'kanji']);
});


console.log('Pemulihan HP');
const base = (o: Partial<PlayerStats>) => ({ hp: 10, maxHp: 100, mp: 0, maxMp: 40, gold: 100, inventory: ['pot_hp_small', 'pot_hp_small', 'scroll_exp_sm'] , ...o }) as PlayerStats;
test('HP setelah kalah = 10% maks (minimal 1)', () => {
  assert.equal(getGameOverHp(110), 11);
  assert.equal(getGameOverHp(0), 1);
});
test('biaya dojo: 0 bila penuh, minimal 10, 1 koin per 2 HP hilang', () => {
  assert.equal(getDojoRestCost(100, 100), 0);
  assert.equal(getDojoRestCost(98, 100), 10);
  assert.equal(getDojoRestCost(10, 100), 45);
});
test('istirahat memotong koin & memulihkan HP/MP; gagal bila koin kurang', () => {
  const ok = applyDojoRest(base({}));
  assert.equal(ok.hp, 100); assert.equal(ok.mp, 40); assert.equal(ok.gold, 55);
  const poor = base({ gold: 5 });
  assert.equal(applyDojoRest(poor), poor);
});
test('potion: hapus tepat satu ID, +30% HP, tidak melebihi maks', () => {
  const after = applyPotion(base({}));
  assert.equal(after.hp, 40); assert.equal(countPotions(after.inventory), 1);
  assert.deepEqual(after.inventory.filter(i => i !== 'pot_hp_small'), ['scroll_exp_sm']);
  const near = applyPotion(base({ hp: 95 }));
  assert.equal(near.hp, 100);
  const full = base({ hp: 100 });
  assert.equal(applyPotion(full), full);
});

console.log('Tower cloud merge');
const tower = (o: Partial<TowerCloudState['progress']>, eco: Partial<TowerCloudState['economy']>, ach: TowerCloudState['achievements'], at = '2026-01-01T00:00:00Z'): TowerCloudState => ({
  progress: { currentFloor: 1, highestFloorCleared: 0, flawlessFloorCount: 0, clearedFloors: {}, ...o },
  economy: { skillPoints: 3, allocatedSkills: {}, reviveTokens: 1, ...eco },
  achievements: ach, updatedAt: at,
});
test('lantai tertinggi menang & union lantai (yang lebih sedikit salah menang)', () => {
  const a = tower({ highestFloorCleared: 12, currentFloor: 13, clearedFloors: { 1: { clearedAt: 'x', mistakes: 2, score: 50 }, 12: { clearedAt: 'x', mistakes: 0, score: 90 } } }, {}, {});
  const b = tower({ highestFloorCleared: 30, currentFloor: 31, clearedFloors: { 1: { clearedAt: 'y', mistakes: 0, score: 40 }, 30: { clearedAt: 'y', mistakes: 1, score: 70 } } }, {}, {});
  const m = mergeTowerState(a, b)!;
  assert.equal(m.progress.highestFloorCleared, 30);
  assert.deepEqual(Object.keys(m.progress.clearedFloors).sort(), ['1', '12', '30']);
  assert.equal(m.progress.clearedFloors[1].mistakes, 0);
});
test('skill tree: level tertinggi per skill, SP sisa tidak digandakan', () => {
  const a = tower({}, { skillPoints: 2, allocatedSkills: { kanji_vision: 1 } }, {});     // total didapat 3 (1 terpakai + 2)
  const b = tower({}, { skillPoints: 0, allocatedSkills: { kanji_vision: 2 } }, {});     // total didapat 3 (1+2 terpakai)
  const m = mergeTowerState(a, b)!;
  assert.equal(m.economy.allocatedSkills.kanji_vision, 2);
  assert.equal(m.economy.skillPoints, 0);
});
test('achievement: unlocked bersifat OR, nilai maksimum; null aman', () => {
  const a = tower({}, {}, { x: { currentValue: 3, isUnlocked: false } });
  const b = tower({}, {}, { x: { currentValue: 1, isUnlocked: true } });
  const m = mergeTowerState(a, b)!;
  assert.deepEqual(m.achievements.x, { currentValue: 3, isUnlocked: true });
  assert.equal(mergeTowerState(null, null), null);
  assert.equal(mergeTowerState(a, null), a);
});


console.log('loadPlayerState');
const { loadInitialStats, loadStageProgress, loadDailyMissions } = await import('../src/state/loadPlayerState');
test('storage kosong -> state baru dengan userId unik', () => {
  mem.clear();
  const a = loadInitialStats(); const b = loadInitialStats();
  assert.ok(a.userId && b.userId && a.userId !== b.userId);
  assert.equal(a.level, 1); assert.equal(a.totalExp, 0);
  assert.ok(Array.isArray(a.userDecks) && a.userDecks.length >= 1);
});
test('JSON rusak -> fallback aman (tidak melempar)', () => {
  mem.set(STORAGE_KEY_STATS, '{not json'); mem.set(STORAGE_KEY_STAGES, '###'); mem.set(STORAGE_KEY_DAILY, '[[');
  assert.equal(loadInitialStats().level, 1);
  assert.deepEqual(loadStageProgress(), {});
  assert.ok(Array.isArray(loadDailyMissions()));
});
test('EXP/level/gold dibulatkan & NaN dibersihkan; userId yang ada dipertahankan', () => {
  mem.set(STORAGE_KEY_STATS, JSON.stringify({ totalExp: 123.7, level: 'abc', gold: null, userId: 'u-1', playerName: 'Aki', currentMapId: 'map_tidak_ada' }));
  const st = loadInitialStats();
  assert.equal(st.totalExp, 124); assert.equal(st.level, 1); assert.equal(st.gold, 0);
  assert.equal(st.userId, 'u-1'); assert.equal(st.playerName, 'Aki');
  assert.equal(st.currentMapId, 'map_kana_hiragana');   // peta tidak valid -> peta awal
});
test('nama lama Pemilik WebApp dimigrasi ke nama acak', () => {
  mem.set(STORAGE_KEY_STATS, JSON.stringify({ playerName: 'Pemilik WebApp', userId: 'u-2' }));
  assert.notEqual(loadInitialStats().playerName, 'Pemilik WebApp');
});


console.log('State turunan');
test('recallQueue tidak dipersistenkan, relasi mastery tetap; dihitung ulang dari itemMastery', () => {
  let rec: ItemMasteryRecord | undefined;
  for (let i = 0; i < 3; i++) rec = recordItemAttempt(rec, 'kotoba_0001', 'kotoba', 1, 5);
  const st = { level: 3, itemMastery: { kotoba_0001: rec! }, recallQueue: [{ id: 'x' }] } as unknown as PlayerStats;
  const persisted = stripDerivedStats(st) as Record<string, unknown>;
  assert.ok(!('recallQueue' in persisted));
  assert.equal((persisted.itemMastery as Record<string, unknown>).kotoba_0001, rec);
  const rebuilt = withDerivedStats(st);
  assert.ok(Array.isArray(rebuilt.recallQueue) && rebuilt.recallQueue!.length >= 1);
  assert.equal(rebuilt.recallQueue![0].itemId, 'kotoba_0001');
});


console.log('Identitas materi (satu materi = satu ID)');
test('tiap kanji & bunpou hanya terhitung satu kali di Object.values; lookup alias tetap bekerja', () => {
  const kv = Object.values(KANJI_DATABASE);
  assert.equal(kv.length, new Set(kv.map(k => k.id)).size, 'kanji terhitung ganda');
  const bv = Object.values(BUNPOU_DATABASE);
  assert.equal(bv.length, new Set(bv.map(b => b.id)).size);
  assert.equal(bv.length, 915);
  const first = kv.find(k => k.character)!;
  assert.equal(KANJI_DATABASE[first.character].id, first.id);          // alias karakter
  assert.equal(BUNPOU_DATABASE['bunpou_001'], BUNPOU_DATABASE['w1d1g1']); // alias lama = objek yang sama
  assert.equal(BUNPOU_DATABASE['bunpou_001'].id, 'w1d1g1');
});
test('canonicalEntityId: alias bunpou & karakter kanji -> ID kanonik; ID lain tetap', () => {
  assert.equal(canonicalEntityId('bunpou_003'), 'w1d1g3');
  const k = Object.values(KANJI_DATABASE)[0];
  assert.equal(canonicalEntityId(k.character), k.id);
  assert.equal(canonicalEntityId(k.id), k.id);
  assert.equal(canonicalEntityId('kotoba_0001'), 'kotoba_0001');
  assert.equal(canonicalEntityId('toString'), 'toString');
});
test('mastery di bawah alias & ID asli digabung (record terbaru menang), itemId dikanonikalkan', () => {
  const a = { ...perfectRun(1), itemId: 'bunpou_001', category: 'bunpou' as const, lastReviewedAt: '2026-01-01T00:00:00Z' };
  const b = { ...perfectRun(3), itemId: 'w1d1g1', category: 'bunpou' as const, lastReviewedAt: '2026-02-01T00:00:00Z' };
  const out = canonicalizeItemMastery({ bunpou_001: a, w1d1g1: b })!;
  assert.deepEqual(Object.keys(out), ['w1d1g1']);
  assert.equal(out.w1d1g1.itemId, 'w1d1g1');
  assert.equal(out.w1d1g1.lastReviewedAt, '2026-02-01T00:00:00Z');
  const clean = { w1d1g2: { ...perfectRun(1), itemId: 'w1d1g2' } };
  assert.equal(canonicalizeItemMastery(clean), clean);                   // tanpa perubahan -> referensi sama
});
test('deck: ref kanji berkarakter -> ID, customData duplikat master dibuang, item ganda dihapus', () => {
  const k = Object.values(KANJI_DATABASE)[0];
  const deck = { id: 'd', title: 't', type: 'mixed', createdAt: 'x', updatedAt: 'x', items: [
    { id: k.character, category: 'kanji', addedAt: 'x', customData: { word: k.character, meaning: 'AI' } },
    { id: k.id, category: 'kanji', addedAt: 'x' },
    { id: 'custom_deck_1', category: 'kotoba', addedAt: 'x', customData: { word: 'zzz', meaning: 'unik' } },
  ] } as unknown as UserDeck;
  const [out] = canonicalizeDecks([deck])!;
  assert.equal(out.items.length, 2);
  assert.equal(out.items[0].id, k.id);
  assert.ok(!out.items[0].customData);
  assert.ok(out.items[1].customData);                                    // materi tanpa master tetap kustom
  const same = [{ ...deck, items: [{ id: k.id, category: 'kanji', addedAt: 'x' }] }] as unknown as UserDeck[];
  assert.equal(canonicalizeDecks(same), same);
  assert.equal(canonicalizeStats({ itemMastery: {}, userDecks: undefined } as unknown as PlayerStats).userDecks, undefined);
});
test('resolveDeckItem: master menang atas customData; tanpa master customData dipakai', () => {
  const kotoba = Object.values(KOTOBA_DATABASE)[0];
  const withMaster = resolveDeckItem({ id: kotoba.id, category: 'kotoba', addedAt: 'x', customData: { word: 'PALSU', meaning: 'PALSU' } })!;
  assert.equal(withMaster.displayTitle, kotoba.word);
  const custom = resolveDeckItem({ id: 'custom_x_1', category: 'kotoba', addedAt: 'x', customData: { word: 'PALSU', meaning: 'arti' } })!;
  assert.equal(custom.displayTitle, 'PALSU');
  assert.equal(custom.kotoba!.exampleSentence, undefined);
});
test('adaptor identitas: relasi kanji lewat ID, bukan karakter', () => {
  const kt = Object.values(KOTOBA_DATABASE).find(k => /[一-鿿]/.test(k.word) && k.word.length >= 2)!;
  const v = toVocabularyEntity(kt);
  assert.equal(v.id, kt.id);
  assert.ok(v.kanjiIds.length >= 1);
  for (const id of v.kanjiIds) assert.equal(KANJI_DATABASE[id].id, id);   // semua kanjiIds adalah ID valid
  assert.equal(v.kanaOnly, false);
  const k = Object.values(KANJI_DATABASE)[0];
  assert.equal(toKanjiEntity(k).character, k.character);
  assert.equal(toGrammarEntity(BUNPOU_DATABASE['w1d1g1']).id, 'w1d1g1');
  assert.equal(getIdentityEntity('bunpou', 'bunpou_001')!.entity.id, 'w1d1g1');
  assert.equal(getIdentityEntity('kotoba', 'tidak_ada'), null);
});

console.log('Waktu');
test('getLocalIsoWeekId: batas tahun ISO & Senin/Minggu', () => {
  assert.equal(getLocalIsoWeekId(new Date(2026, 0, 1)), '2026-W01'); // Kamis
  assert.equal(getLocalIsoWeekId(new Date(2024, 11, 30)), '2025-W01'); // Senin, milik tahun ISO 2025
  assert.equal(getLocalIsoWeekId(new Date(2026, 9, 4)), '2026-W40'); // Minggu
  assert.equal(getLocalIsoWeekId(new Date(2026, 9, 5)), '2026-W41'); // Senin berikutnya
});

console.log(`\n${passed} tes lulus${process.exitCode ? ' (ADA YANG GAGAL)' : ''}`);
