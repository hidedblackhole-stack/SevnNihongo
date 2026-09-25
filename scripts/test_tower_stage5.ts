// ==============================================================================
// TEST SCRIPT: NIHONGO TOWER STAGE 5 WORLD BUILDING & PROGRESSION TEST SUITE
// ==============================================================================

import {
  getRegionForFloor,
  getAllRegions,
  generateFloorNarrative,
  generateFloorBlueprint,
  TowerAchievementManager,
  SkillTreeManager,
  TOWER_PASSIVE_SKILLS,
  loadTowerProgress,
  saveTowerProgress,
  recordFloorClear,
  buildTowerPlayerProfile
} from '../src/engine/tower';

console.log('================================================================');
console.log('🧪 NIHONGO TOWER — STAGE 5 WORLD BUILDING & NARRATIVE TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// ------------------------------------------------------------------------------
// TEST 1: TOWER REGION ENGINE
// ------------------------------------------------------------------------------
console.log('--- TEST 1: Tower Region Engine (10 Lore Regions Across 1000 Floors) ---');

const regions = getAllRegions();
assert(regions.length === 10, 'All 10 thematic regions registered', `got ${regions.length}`);

const r1 = getRegionForFloor(1);
assert(r1.id === 'beginning_gate', 'Floor 1 belongs to Beginning Gate (初めの門)');
assert(r1.jlptTier === 'N5', 'Beginning Gate is JLPT N5');

const r57 = getRegionForFloor(57);
assert(r57.id === 'beginning_gate', 'Floor 57 belongs to Beginning Gate');

const r150 = getRegionForFloor(150);
assert(r150.id === 'forest_shrine', 'Floor 150 belongs to Forest Shrine (森の社)');
assert(r150.jlptTier === 'N5', 'Forest Shrine is JLPT N5');

const r350 = getRegionForFloor(350);
assert(r350.id === 'ancient_archive', 'Floor 350 belongs to Ancient Archive (古文書の書庫)');
assert(r350.jlptTier === 'N3', 'Ancient Archive is JLPT N3');

const r550 = getRegionForFloor(550);
assert(r550.id === 'misty_peaks', 'Floor 550 belongs to Misty Peaks (霧の霊峰)');
assert(r550.jlptTier === 'N3', 'Misty Peaks is JLPT N3');

const r750 = getRegionForFloor(750);
assert(r750.id === 'moonlit_tower', 'Floor 750 belongs to Moonlit Spire (月影の尖塔)');
assert(r750.jlptTier === 'N2', 'Moonlit Spire is JLPT N2');

const r1000 = getRegionForFloor(1000);
assert(r1000.id === 'celestial_zenith', 'Floor 1000 belongs to Celestial Zenith (天上の頂)');
assert(r1000.jlptTier === 'N1', 'Celestial Zenith is JLPT N1');

// ------------------------------------------------------------------------------
// TEST 2: FLOOR NARRATIVE ENGINE
// ------------------------------------------------------------------------------
console.log('\n--- TEST 2: Floor Narrative Engine (Story & Objective Procedural Generation) ---');

// Standard Floor 57
const bp57 = generateFloorBlueprint(57);
const n57 = generateFloorNarrative(57, bp57);
assert(n57.floor === 57, 'Narrative generated for Floor 57');
assert(n57.japaneseIntro.includes('「'), 'Contains authentic Japanese quote format');
assert(n57.indonesianIntro.length > 10, 'Contains Indonesian contextual lore');
assert(n57.objective.length > 5, 'Contains clear gameplay objective');
assert(n57.npcName.length > 0, 'NPC guide assigned');

// Checkpoint Floor 10
const bp10 = generateFloorBlueprint(10);
const n10 = generateFloorNarrative(10, bp10);
assert(n10.japaneseIntro.includes('社') || n10.japaneseIntro.includes('茶'), 'Checkpoint narrative contains rest shrine atmosphere');
assert(n10.npcRole.includes('Istirahat') || n10.npcRole.includes('Kuil'), 'Rest shrine NPC assigned');

// Boss Floor 100
const bp100 = generateFloorBlueprint(100);
const n100 = generateFloorNarrative(100, bp100);
assert(n100.japaneseIntro.includes(r1.bossName), 'Boss narrative mentions boss name');
assert(n100.objective.includes('JLPT N5'), 'Boss objective highlights JLPT trial level');
assert(n100.npcRole === r1.bossTitle, 'Boss title matches region');

// Boss Prep Floor 98
const bp98 = generateFloorBlueprint(98);
const n98 = generateFloorNarrative(98, bp98);
assert(n98.objective.includes('Sintesis') || n98.indonesianIntro.includes('kehadiran'), 'Boss preparation narrative warns of approaching gate');

// ------------------------------------------------------------------------------
// TEST 3: TOWER ECONOMY & PASSIVE SKILL TREE
// ------------------------------------------------------------------------------
console.log('\n--- TEST 3: Tower Economy & Passive Skill Tree ---');

assert(TOWER_PASSIVE_SKILLS.length === 5, '5 passive skills defined (Kanji Vision, Grammar Insight, Iron Resolve, Mnemonic Resonance, Vitality Surge)');

const kanjiVision = TOWER_PASSIVE_SKILLS.find(s => s.id === 'kanji_vision');
assert(kanjiVision !== undefined && kanjiVision.maxLevel === 3, 'Kanji Vision has 3 levels');
assert(kanjiVision?.effects[0].type === 'accuracy_boost', 'Kanji Vision gives accuracy boost');

const ironResolve = TOWER_PASSIVE_SKILLS.find(s => s.id === 'iron_resolve');
assert(ironResolve?.effects[0].type === 'starting_shield', 'Iron Resolve grants starting shield');

// ------------------------------------------------------------------------------
// TEST 4: TOWER PROGRESSION PERSISTENCE & ADAPTIVE PROFILE
// ------------------------------------------------------------------------------
console.log('\n--- TEST 4: Tower Progression Persistence & Adaptive Profile ---');

// Mock localStorage in Node environment
const mockStorage: Record<string, string> = {};
(global as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; }
  }
};

const initialProg = loadTowerProgress();
assert(initialProg.currentFloor === 1, 'Initial progress starts at Floor 1');
assert(initialProg.highestFloorCleared === 0, 'Initial highest cleared is 0');

// Clear Floor 1 with 100% and 0 mistakes (Flawless)
const progAfterF1 = recordFloorClear(1, 100, 0);
assert(progAfterF1.highestFloorCleared === 1, 'Highest cleared updated to 1');
assert(progAfterF1.currentFloor === 2, 'Current floor unlocked to 2');
assert(progAfterF1.flawlessFloorCount === 1, 'Flawless clear count incremented to 1');

// Clear Floor 2 with 1 mistake
const progAfterF2 = recordFloorClear(2, 85, 1);
assert(progAfterF2.highestFloorCleared === 2, 'Highest cleared updated to 2');
assert(progAfterF2.currentFloor === 3, 'Current floor unlocked to 3');
assert(progAfterF2.flawlessFloorCount === 1, 'Flawless clear count remains 1 on mistake');

// Build profile from RPG itemMastery
const mockStats = {
  userId: 'HeroOfTokyo',
  level: 12,
  streakDays: 5
};
const mockMastery = {
  'kt_taberu': {
    attemptsCount: 6,
    mistakeCount: 4,
    masteryPercentage: 33
  }
};

const generatedProfile = buildTowerPlayerProfile(mockStats, mockMastery);
assert(generatedProfile.userId === 'HeroOfTokyo', 'Profile captures player name');
assert(generatedProfile.currentFloor === 3, 'Profile currentFloor reflects progression');
assert(generatedProfile.weakVocabularyIds?.includes('kt_taberu') === true, 'Profile extracts weak vocabulary from player stats');

// ------------------------------------------------------------------------------
// TEST 5: TOWER ACHIEVEMENTS
// ------------------------------------------------------------------------------
console.log('\n--- TEST 5: Tower Achievement Milestones ---');

const unlocked = TowerAchievementManager.recordProgress('climb', 10);
const allAch = TowerAchievementManager.load();
const climb10 = allAch.find(a => a.id === 'climb_10');
assert(climb10?.isUnlocked === true, 'Reaching Floor 10 unlocks "Pos Pemeriksaan Pertama"');

console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
