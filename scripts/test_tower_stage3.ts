// ==============================================================================
// TEST SCRIPT: NIHONGO TOWER STAGE 3 & 4 VALIDATION
// ==============================================================================

import {
  generateFloorBlueprint,
  RoundOrchestrator,
  RoundResolver,
  RoundPhase,
  TowerState,
  CanvasAdapter,
  QuizAdapter,
  ConjugationAdapter,
  RewardEngine,
  TowerHpSystem,
  RoundStateMachine,
  generateRoundDifficulty,
  checkBossGate,
  updateMemoryState,
  calculateMasteryScore,
  TowerEvent,
  InscriptionRoundInput,
  IdentificationRoundInput,
  AlchemyRoundInput,
  SentenceRoundInput
} from '../src/engine/tower';

console.log('================================================================');
console.log('🧪 NIHONGO TOWER — STAGE 3 & 4 ARCHITECTURE & RUNTIME TEST SUITE');
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
// TEST 1: FLOOR SEED DETERMINISM
// ------------------------------------------------------------------------------
console.log('--- TEST 1: Floor Seed Determinism (100% Reproducibility) ---');

const seedA = 'SEVNQUEST-57-A';
const profileMock = {
  currentFloor: 57,
  highestFloorCleared: 56,
  lives: 3,
  weakVocabularyIds: ['kt_taberu', 'kt_nomu']
};

const bp1 = generateFloorBlueprint(57, profileMock, seedA);
const bp2 = generateFloorBlueprint(57, profileMock, seedA);

assert(bp1.seed === seedA, 'Blueprint records exact seed string');
assert(bp1.vocabulary.length === bp2.vocabulary.length, 'Vocabulary length matches');
assert(
  JSON.stringify(bp1.vocabulary.map(v => v.id)) === JSON.stringify(bp2.vocabulary.map(v => v.id)),
  'Exact identical vocabulary targets generated on repeated calls with same seed'
);
assert(
  JSON.stringify(bp1.kanji.map(k => k.kanji)) === JSON.stringify(bp2.kanji.map(k => k.kanji)),
  'Exact identical kanji targets generated on repeated calls with same seed'
);
assert(
  JSON.stringify(bp1.rounds) === JSON.stringify(bp2.rounds),
  'Exact identical round phases generated'
);

// ------------------------------------------------------------------------------
// TEST 2: ROUND RESOLVER & STRONGLY-TYPED ROUND INPUTS
// ------------------------------------------------------------------------------
console.log('\n--- TEST 2: Round Resolver & Strongly-Typed Round Inputs ---');

const blueprintFloor1 = generateFloorBlueprint(1, undefined, 'TEST-F1');
console.log(`Floor 1 Rounds: ${blueprintFloor1.rounds.join(' -> ')}`);

for (let rIdx = 0; rIdx < blueprintFloor1.rounds.length; rIdx++) {
  const roundInput = RoundResolver.resolveRound(blueprintFloor1, rIdx);
  assert(roundInput.roundIndex === rIdx, `Round ${rIdx} correctly indexed`);
  assert(roundInput.phase === blueprintFloor1.rounds[rIdx], `Round ${rIdx} phase matches blueprint (${roundInput.phase})`);
  assert(!!roundInput.difficultySettings, `Round ${rIdx} includes dynamic difficultySettings`);

  if (roundInput.phase === RoundPhase.INSCRIPTION) {
    const inp = roundInput as InscriptionRoundInput;
    assert(!!inp.targetKanji?.kanji, 'Inscription input contains valid targetKanji');
    assert(inp.minAccuracyScore >= 65, 'Inscription input specifies passing accuracy threshold');
  } else if (roundInput.phase === RoundPhase.IDENTIFICATION) {
    const inp = roundInput as IdentificationRoundInput;
    assert(inp.questions.length > 0, 'Identification input contains generated questions');
    assert(inp.questions[0].options.length >= 4, 'Identification questions include distractors');
  } else if (roundInput.phase === RoundPhase.ALCHEMY) {
    const inp = roundInput as AlchemyRoundInput;
    assert(inp.targets.length > 0, 'Alchemy input contains inflection targets');
    assert(!!inp.targets[0].expectedConjugated, 'Alchemy targets contain expected conjugation form');
  } else if (roundInput.phase === RoundPhase.SENTENCE) {
    const inp = roundInput as SentenceRoundInput;
    assert(inp.scrambledSegments.length > 0, 'Sentence input provides scrambled word tokens');
    assert(inp.correctOrder.length > 0, 'Sentence input provides correct order reference');
  }
}

// ------------------------------------------------------------------------------
// TEST 3: ROUND DIFFICULTY MODIFIER SCALING
// ------------------------------------------------------------------------------
console.log('\n--- TEST 3: Round Difficulty Scaling (Floor 1 vs Floor 800) ---');

const diffF1 = generateRoundDifficulty(1, RoundPhase.IDENTIFICATION);
const diffF800 = generateRoundDifficulty(800, RoundPhase.IDENTIFICATION);

assert(diffF1.questionCount <= diffF800.questionCount, 'Question count scales up from Floor 1 to 800');
assert(diffF1.distractorLevel < diffF800.distractorLevel, 'Distractor subtlety increases at higher floors');
assert(diffF1.accuracyRequired < diffF800.accuracyRequired, 'Accuracy requirement increases from Floor 1 to 800');

// ------------------------------------------------------------------------------
// TEST 4: MEMORY STATE & EBBINGHAUS FORGETTING RATE
// ------------------------------------------------------------------------------
console.log('\n--- TEST 4: MemoryState & Spaced Repetition Forgetting Curve ---');

let mem = updateMemoryState(undefined, true, 10);
assert(mem.reviewCount === 1, 'MemoryState initialized with 1 review');
assert(mem.intervalFloors > 5, 'Interval expands on correct answer');

// Correct review at Floor 20
mem = updateMemoryState(mem, true, 20);
assert(mem.intervalFloors > 10, 'Interval expands further on second correct review');

// Mistake review at Floor 50
const memWrong = updateMemoryState(mem, false, 50);
assert(memWrong.intervalFloors < mem.intervalFloors, 'Interval shrinks on mistake');
assert(memWrong.forgettingRate > mem.forgettingRate, 'Forgetting rate increases on mistake');

// Score decay check after long absence
const scoreFresh = calculateMasteryScore(5, 5, 20, 20, mem);
const scoreDecayed = calculateMasteryScore(5, 5, 20, 80, mem);
assert(scoreDecayed < scoreFresh, 'Mastery score decays over time due to forgetting curve');

// ------------------------------------------------------------------------------
// TEST 5: BOSS FLOOR GATE REQUIREMENTS
// ------------------------------------------------------------------------------
console.log('\n--- TEST 5: Boss Floor Gate Enforcement ---');

const gateF50 = checkBossGate(50, profileMock);
assert(gateF50.canEnter === true, 'Regular Floor 50 has no gate restrictions');

const gateF100LowMastery = checkBossGate(100, {
  ...profileMock,
  masteryRecords: {
    kt_1: { wordId: 'kt_1', attempt: 2, correct: 1, lastSeen: 1, masteryScore: 50 }
  }
});
assert(gateF100LowMastery.canEnter === false, 'Floor 100 Boss gate blocks entry when mastery is below requirements');
assert(gateF100LowMastery.weaknesses.length > 0, 'Gate returns detailed list of weak areas');
assert(gateF100LowMastery.recommendedFloors[0] < 100, 'Gate recommends review floor range for preparation');

// ------------------------------------------------------------------------------
// TEST 6: ROUND STATE MACHINE & COMBAT
// ------------------------------------------------------------------------------
console.log('\n--- TEST 6: Round State Machine & HP Combat ---');

const sm = new RoundStateMachine(TowerState.IDLE);
assert(sm.transition(TowerState.FLOOR_ACTIVE), 'Transition IDLE -> FLOOR_ACTIVE succeeds');
assert(sm.transition(TowerState.ROUND_STARTED), 'Transition FLOOR_ACTIVE -> ROUND_STARTED succeeds');
assert(sm.transition(TowerState.ROUND_ACTIVE), 'Transition ROUND_STARTED -> ROUND_ACTIVE succeeds');

const hp = new TowerHpSystem(3, 3);
hp.addShield();
const shieldHit = hp.takeDamage(1);
assert(shieldHit.shieldAbsorbed && hp.getHp() === 3, 'Shield absorbed hit with 0 damage to HP');

// ------------------------------------------------------------------------------
// TEST 7: ADAPTERS & ORCHESTRATOR FULL LOOP
// ------------------------------------------------------------------------------
console.log('\n--- TEST 7: Complete Floor Cycle with Event Dispatches ---');

const orchestrator = new RoundOrchestrator();
const capturedEvents: TowerEvent[] = [];

orchestrator.subscribe(({ type }) => {
  capturedEvents.push(type);
});

const { blueprint: floorBlueprint, gateResult } = orchestrator.startFloor(1, profileMock, 'ORCH-RUN-1');
assert(gateResult.canEnter, 'Floor 1 gate passed');
assert(capturedEvents.includes(TowerEvent.FLOOR_START), 'TowerEvent.FLOOR_START captured');
assert(capturedEvents.includes(TowerEvent.ROUND_STARTED), 'TowerEvent.ROUND_STARTED captured');

const totalRounds = floorBlueprint.rounds.length;

for (let i = 0; i < totalRounds; i++) {
  const currentPhase = floorBlueprint.rounds[i];
  const roundRes = {
    roundIndex: i,
    phase: currentPhase,
    score: 100,
    correct: true,
    mistakes: [],
    hpDamage: 0,
    timeSpentMs: 2500,
    masteryUpdates: [
      {
        targetId: `item_${i}`,
        targetType: 'vocabulary' as const,
        previousScore: 70,
        newScore: 85,
        delta: 15,
        isCorrect: true
      }
    ]
  };

  const outcome = orchestrator.submitAnswer(roundRes);

  if (i < totalRounds - 1) {
    orchestrator.startNextRound();
  } else {
    assert(outcome.state === TowerState.FLOOR_CLEAR, 'Final round completion triggers FLOOR_CLEAR');
    assert(capturedEvents.includes(TowerEvent.PERFECT_ROUND), 'TowerEvent.PERFECT_ROUND captured on 100% score');
    assert(capturedEvents.includes(TowerEvent.FLOOR_CLEAR), 'TowerEvent.FLOOR_CLEAR captured upon completion');
    assert(outcome.floorReport?.isFlawless === true, 'Clearing with full HP and 0 mistakes earns Flawless Victor');
  }
}

// ------------------------------------------------------------------------------
// TEST 8: TOWER REGION BOUNDARIES (STAGE 5.1)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 8: Tower Region Engine (10 Lore Regions) ---');

const { getRegionForFloor, getAllRegions, generateFloorNarrative, SkillTreeManager, TowerAchievementManager } = await import('../src/engine/tower');

const allRegs = getAllRegions();
assert(allRegs.length === 10, 'All 10 thematic regions registered');

const regF1 = getRegionForFloor(1);
const regF100 = getRegionForFloor(100);
const regF101 = getRegionForFloor(101);
const regF300 = getRegionForFloor(300);
const regF301 = getRegionForFloor(301);
const regF1000 = getRegionForFloor(1000);

assert(regF1.id === 'beginning_gate', 'Floor 1 belongs to beginning_gate');
assert(regF100.id === 'beginning_gate', 'Floor 100 belongs to beginning_gate');
assert(regF101.id === 'forest_shrine', 'Floor 101 belongs to forest_shrine');
assert(regF300.id === 'wind_canyon', 'Floor 300 belongs to wind_canyon');
assert(regF301.id === 'ancient_archive', 'Floor 301 belongs to ancient_archive');
assert(regF1000.id === 'celestial_zenith', 'Floor 1000 belongs to celestial_zenith');

// ------------------------------------------------------------------------------
// TEST 9: FLOOR NARRATIVE ENGINE (STAGE 5.2)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 9: Floor Narrative Engine (Story & Objective Hooks) ---');

const bpRegular = generateFloorBlueprint(57, undefined, 'TEST-NAR-1');
const narRegular = generateFloorNarrative(57, bpRegular);
assert(narRegular.floor === 57, 'Narrative generated for floor 57');
assert(narRegular.japaneseIntro.length > 10, 'Japanese intro quote provided');
assert(narRegular.indonesianIntro.length > 10, 'Indonesian context explanation provided');
assert(!!narRegular.objective, 'Clear gameplay objective stated');

const bpBoss = generateFloorBlueprint(100, undefined, 'TEST-NAR-BOSS');
const narBoss = generateFloorNarrative(100, bpBoss);
assert(narBoss.npcName.includes('墨の守護者'), 'Boss floor features specific region guardian');
assert(narBoss.objective.includes('JLPT N5'), 'Boss objective highlights JLPT trial level');

// ------------------------------------------------------------------------------
// TEST 10: TOWER ECONOMY & PASSIVE SKILL TREE (STAGE 5.3)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 10: Passive Skill Tree & Economy Manager ---');

SkillTreeManager.addSkillPoints(10);
const successUp = SkillTreeManager.upgradeSkill('kanji_vision');
assert(successUp, 'Kanji Vision successfully upgraded with SP');
assert(SkillTreeManager.getSkillLevel('kanji_vision') >= 1, 'Skill level reflects upgrade');

const bonuses = SkillTreeManager.getActiveBonuses();
assert(bonuses.accuracyBonus > 0, 'Active bonuses compute positive accuracy boost from Kanji Vision');

// ------------------------------------------------------------------------------
// TEST 11: TOWER ACHIEVEMENT ENGINE (STAGE 5.4)
// ------------------------------------------------------------------------------
console.log('\n--- TEST 11: Tower Achievement Milestone Tracking ---');

const newUnlocks = TowerAchievementManager.recordProgress('climb', 10);
assert(newUnlocks.some(a => a.id === 'climb_10'), 'Reaching floor 10 unlocks "Pos Pemeriksaan Pertama" achievement');

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
