import { generateFloorBlueprint } from '../src/engine/tower/floorGenerator';
import { TowerArc, JLPTLevel, ConjugationTier, RoundPhase } from '../src/types/tower';

console.log('================================================================');
console.log('🧪 TESTING NIHONGO TOWER — TAHAP 1 & 2 GENERATOR EXECUTION');
console.log('================================================================\n');

// 1. Floor 1 (Foundation Debut)
const f1 = generateFloorBlueprint(1);
console.log('--- FLOOR 1 (FOUNDATION DEBUT) ---');
console.log(`Floor: ${f1.floor} | Arc: ${f1.arc} | JLPT: ${f1.jlptTarget}`);
console.log(`Theme: ${f1.theme}`);
console.log(`Difficulty: ${f1.difficulty} | Tier: ${f1.conjugationTier} | Review Ratio: ${f1.reviewRatio}`);
console.log(`Is Checkpoint: ${f1.isCheckpoint} | Is Boss: ${f1.isBossFloor}`);
console.log(`Rounds (${f1.rounds.length}):`, f1.rounds);
console.log(`Vocabulary (${f1.vocabulary.length}):`, f1.vocabulary.map(v => `${v.word} (${v.source})`));
console.log(`Grammar (${f1.grammar.length}):`, f1.grammar.map(g => g.pattern));
console.log(`Kanji (${f1.kanji.length}):`, f1.kanji.map(k => `${k.kanji} (write: ${k.writingRequired})`));
console.log(`Rewards:`, f1.reward);
console.log('\n');

// 2. Floor 57 (User's Example) - Standard Run
const f57_default = generateFloorBlueprint(57);
console.log('--- FLOOR 57 (STANDARD RUN WITHOUT PROFILE) ---');
console.log(`Floor: ${f57_default.floor} | Arc: ${f57_default.arc} | JLPT: ${f57_default.jlptTarget}`);
console.log(`Theme: ${f57_default.theme}`);
console.log(`Rounds:`, f57_default.rounds);
console.log(`Review Ratio: ${f57_default.reviewRatio}`);
console.log(`Vocabulary:`, f57_default.vocabulary.map(v => `${v.word} [${v.source}]`));
console.log('\n');

// 3. Floor 57 (User's Example) - WITH PROGRESSION MODEL (Player struggling with "食べる")
const f57_adaptive = generateFloorBlueprint(57, {
  currentFloor: 57,
  highestFloorCleared: 56,
  lives: 3,
  weakVocabularyIds: ['食べる'],
  masteryRecords: {
    '食べる': {
      wordId: '食べる',
      attempt: 5,
      correct: 1, // Only 20% accuracy!
      lastSeen: 50,
      masteryScore: 20
    }
  }
});
console.log('--- FLOOR 57 (ADAPTIVE PROGRESSION: PLAYER STRUGGLING WITH "食べる") ---');
console.log(`Review Ratio: ${f57_adaptive.reviewRatio}`);
console.log(`Vocabulary (${f57_adaptive.vocabulary.length}):`, f57_adaptive.vocabulary.map(v => `${v.word} [${v.source}]`));
const hasTaberuReview = f57_adaptive.vocabulary.some(v => v.word === '食べる' && v.source === 'review');
console.log(`✅ Did adaptive engine inject "食べる" as spiral review? -> ${hasTaberuReview ? 'YES! 🎯' : 'NO ❌'}`);
console.log('\n');

// 4. Floor 100 (JLPT N5 Boss Floor)
const f100 = generateFloorBlueprint(100);
console.log('--- FLOOR 100 (JLPT N5 BOSS FLOOR) ---');
console.log(`Floor: ${f100.floor} | Arc: ${f100.arc} | Is Boss: ${f100.isBossFloor}`);
console.log(`Theme: ${f100.theme}`);
console.log(`Rounds:`, f100.rounds);
console.log(`Rewards:`, f100.reward);
console.log('\n');

// 5. Floor 300 (Elementary N4 Boss Floor)
const f300 = generateFloorBlueprint(300);
console.log('--- FLOOR 300 (ELEMENTARY N4 BOSS FLOOR) ---');
console.log(`Floor: ${f300.floor} | Arc: ${f300.arc} | JLPT: ${f300.jlptTarget}`);
console.log(`Conjugation Tier: ${f300.conjugationTier}`);
console.log(`Theme: ${f300.theme}`);
console.log(`Rounds:`, f300.rounds);
console.log('\n');

// 6. Floor 500 (Intermediate N3 Floor)
const f500 = generateFloorBlueprint(500);
console.log('--- FLOOR 500 (INTERMEDIATE N3 FLOOR) ---');
console.log(`Floor: ${f500.floor} | Arc: ${f500.arc} | JLPT: ${f500.jlptTarget}`);
console.log(`Conjugation Tier: ${f500.conjugationTier}`);
console.log(`Rounds:`, f500.rounds);
console.log('\n');

// 7. Floor 1000 (Apex Master N1 Boss Floor)
const f1000 = generateFloorBlueprint(1000);
console.log('--- FLOOR 1000 (APEX MASTER N1 BOSS FLOOR) ---');
console.log(`Floor: ${f1000.floor} | Arc: ${f1000.arc} | JLPT: ${f1000.jlptTarget}`);
console.log(`Conjugation Tier: ${f1000.conjugationTier}`);
console.log(`Theme: ${f1000.theme}`);
console.log(`Difficulty: ${f1000.difficulty}`);
console.log(`Rounds:`, f1000.rounds);
console.log(`Rewards:`, f1000.reward);
console.log('\n');

console.log('✨ ALL 7 BENCHMARK TEST CASES EXECUTED SUCCESSFULLY!');
