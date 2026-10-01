// Regresi SRS / mastery + merge cloud. Jalankan: npx tsx scripts/test_srs.ts
import assert from 'node:assert/strict';
import { recordItemAttempt, recordItemInteraction } from '../src/utils/mastery';
import { mergeItemMastery, mergeUserDecks, mergeStageProgress } from '../src/utils/cloudMerge';
import { getLocalIsoWeekId } from '../src/utils/time';
import type { ItemMasteryRecord } from '../src/types/content';
import type { UserDeck } from '../src/types/rpg';

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

console.log('Waktu');
test('getLocalIsoWeekId: batas tahun ISO & Senin/Minggu', () => {
  assert.equal(getLocalIsoWeekId(new Date(2026, 0, 1)), '2026-W01'); // Kamis
  assert.equal(getLocalIsoWeekId(new Date(2024, 11, 30)), '2025-W01'); // Senin, milik tahun ISO 2025
  assert.equal(getLocalIsoWeekId(new Date(2026, 9, 4)), '2026-W40'); // Minggu
  assert.equal(getLocalIsoWeekId(new Date(2026, 9, 5)), '2026-W41'); // Senin berikutnya
});

console.log(`\n${passed} tes lulus${process.exitCode ? ' (ADA YANG GAGAL)' : ''}`);
