// ==============================================================================
// TEST SUITE: JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE)
// ==============================================================================

import {
  detectVerbGroup,
  conjugateVerb,
  conjugateAdjective,
  synthesizeSentence,
  generateSentenceExercise,
  validateSentenceSubmission,
  validateParticlePairing,
  PATTERN_SCHEMAS,
} from '../src/engine';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

console.log('\n======================================================');
console.log('🧪 TESTING JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE)');
console.log('======================================================\n');

// ─────────────────────────────────────────────────────────────
// 1. MORPHOLOGY & VERB CONJUGATION TESTS
// ─────────────────────────────────────────────────────────────
console.log('1. Testing Verb Group Detection & Conjugation...');

// Ichidan
const vTaberu = conjugateVerb('食べる', 'たべる');
assert(vTaberu.group === 'ichidan', '食べる is detected as Ichidan');
assert(vTaberu.forms.te.japanese === '食べて', '食べる -> te: 食べて');
assert(vTaberu.forms.nai.japanese === '食べない', '食べる -> nai: 食べない');
assert(vTaberu.forms.potential.japanese === '食べられる', '食べる -> potential: 食べられる');
assert(vTaberu.forms.volitional.japanese === '食べよう', '食べる -> volitional: 食べよう');

// Godan exceptions ending in -iru / -eru
assert(detectVerbGroup('帰る', 'かえる') === 'godan', '帰る (kaeru) exception is detected as Godan');
const vKaeru = conjugateVerb('帰る', 'かえる');
assert(vKaeru.forms.te.japanese === '帰って', '帰る -> te: 帰って (not kaete)');
assert(vKaeru.forms.nai.japanese === '帰らない', '帰る -> nai: 帰らない (not kaenai)');

assert(detectVerbGroup('入る', 'はいる') === 'godan', '入る (hairu) exception is detected as Godan');
const vHairu = conjugateVerb('入る', 'はいる');
assert(vHairu.forms.te.japanese === '入って', '入る -> te: 入って (not haite)');

assert(detectVerbGroup('走る', 'はしる') === 'godan', '走る (hashiru) exception is detected as Godan');
const vHashiru = conjugateVerb('走る', 'はしる');
assert(vHashiru.forms.te.japanese === '走って', '走る -> te: 走って (not hashite)');

// Godan Onbin shifts
// ku -> ite
const vKaku = conjugateVerb('書く', 'かく');
assert(vKaku.forms.te.japanese === '書いて', '書く -> te: 書いて (ku -> ite)');
assert(vKaku.forms.nai.japanese === '書かない', '書く -> nai: 書かない');
assert(vKaku.forms.passive.japanese === '書かれる', '書く -> passive: 書かれる');

// gu -> ide
const vOyogu = conjugateVerb('泳ぐ', 'およぐ');
assert(vOyogu.forms.te.japanese === '泳いで', '泳ぐ -> te: 泳いで (gu -> ide)');

// mu/bu/nu -> nde
const vNomu = conjugateVerb('飲む', 'のむ');
assert(vNomu.forms.te.japanese === '飲んで', '飲む -> te: 飲んで (mu -> nde)');

const vAsobu = conjugateVerb('遊ぶ', 'あそぶ');
assert(vAsobu.forms.te.japanese === '遊んで', '遊ぶ -> te: 遊んで (bu -> nde)');

const vShinu = conjugateVerb('死ぬ', 'しぬ');
assert(vShinu.forms.te.japanese === '死んで', '死ぬ -> te: 死んで (nu -> nde)');

// su -> shite
const vHanasu = conjugateVerb('話す', 'はなす');
assert(vHanasu.forms.te.japanese === '話して', '話す -> te: 話して (su -> shite)');

// Special Irregular: 行く -> 行って (not iite)
const vIku = conjugateVerb('行く', 'いく');
assert(vIku.forms.te.japanese === '行って', '行く -> te: 行って (irregular onbin)');
assert(vIku.forms.ta.japanese === '行った', '行く -> ta: 行った (irregular onbin)');

// Suru verbs
const vBenkyou = conjugateVerb('勉強する', 'べんきょうする');
assert(vBenkyou.group === 'suru', '勉強する is detected as Suru');
assert(vBenkyou.forms.te.japanese === '勉強して', '勉強する -> te: 勉強して');
assert(vBenkyou.forms.potential.japanese === '勉強できる', '勉強する -> potential: 勉強できる');
assert(vBenkyou.forms.volitional.japanese === '勉強しよう', '勉強する -> volitional: 勉強しよう');

// Kuru verbs
const vKuru = conjugateVerb('来る', 'くる');
assert(vKuru.group === 'kuru', '来る is detected as Kuru');
assert(vKuru.forms.te.japanese === '来て', '来る -> te: 来て (kite)');
assert(vKuru.forms.te.reading === 'きて', '来る -> te reading: きて');
assert(vKuru.forms.nai.japanese === '来ない', '来る -> nai: 来ない (konai)');
assert(vKuru.forms.nai.reading === 'こない', '来る -> nai reading: こない');

// ─────────────────────────────────────────────────────────────
// 2. ADJECTIVE CONJUGATION TESTS
// ─────────────────────────────────────────────────────────────
console.log('\n2. Testing Adjective Conjugations...');

const aTakai = conjugateAdjective('高い', 'たかい', 'i');
assert(aTakai.forms.negative.japanese === '高くない', '高い -> negative: 高くない');
assert(aTakai.forms.past.japanese === '高かった', '高い -> past: 高かった');
assert(aTakai.forms.te.japanese === '高くて', '高い -> te: 高くて');
assert(aTakai.forms.sou_appearance.japanese === '高そう', '高い -> sou: 高そう');

// Special i-adjective: いい
const aIi = conjugateAdjective('いい', 'いい', 'i');
assert(aIi.forms.negative.japanese === 'よくない', 'いい -> negative: よくない (irregular yoi)');
assert(aIi.forms.past.japanese === 'よかった', 'いい -> past: よかった');
assert(aIi.forms.sou_appearance.japanese === 'よさそう', 'いい -> sou: よさそう');

// na-adjective: 静か
const aShizuka = conjugateAdjective('静か', 'しずか', 'na');
assert(aShizuka.forms.negative.japanese === '静かじゃない', '静か -> negative: 静かじゃない');
assert(aShizuka.forms.te.japanese === '静かで', '静か -> te: 静かで');
assert(aShizuka.forms.attributive.japanese === '静かな', '静か -> attributive: 静かな');

// ─────────────────────────────────────────────────────────────
// 3. SYNTAX & PARTICLE RULES TESTS
// ─────────────────────────────────────────────────────────────
console.log('\n3. Testing Particle Rules & Logic...');

const checkLocationDe = validateParticlePairing('勉強する', '図書館', 'で', 'location');
assert(checkLocationDe.isValid, '図書館で勉強する: particle で is valid for active location');

const checkLocationNiWrong = validateParticlePairing('勉強する', '図書館', 'に', 'location');
assert(!checkLocationNiWrong.isValid, '図書館に勉強する: particle に rejected for action venue');

const checkMovementNi = validateParticlePairing('行く', '学校', 'に', 'location');
assert(checkMovementNi.isValid, '学校に行く: particle に is valid for destination of movement');

// ─────────────────────────────────────────────────────────────
// 4. DYNAMIC SENTENCE SYNTHESIS TESTS
// ─────────────────────────────────────────────────────────────
console.log('\n4. Testing Dynamic Sentence Synthesis...');

const synthProhibition = synthesizeSentence({
  patternId: 'te_wa_ikenai',
  verbWord: '吸う',
  verbReading: 'すう',
  verbMeaningId: 'merokok',
  objectWord: 'たばこ',
  objectMeaningId: 'rokok',
  locationWord: 'ここ',
  locationMeaningId: 'sini',
});
assert(
  synthProhibition.japanese === 'ここできたばこを吸ってはいけない。' ||
  synthProhibition.japanese === 'ここでたばこを吸ってはいけない。',
  `Synthesized Prohibition: ${synthProhibition.japanese}`
);
assert(synthProhibition.meaningId.includes('Tidak boleh'), `Meaning ID: ${synthProhibition.meaningId}`);

const synthAdvice = synthesizeSentence({
  patternId: 'ta_hou_ga_ii',
  verbWord: '飲む',
  verbReading: 'のむ',
  verbMeaningId: 'minum',
  objectWord: '薬',
  objectMeaningId: 'obat',
});
assert(synthAdvice.japanese.includes('薬を飲んだほうがいい'), `Synthesized Advice: ${synthAdvice.japanese}`);
assert(synthAdvice.meaningId.includes('Sebaiknya'), `Meaning ID: ${synthAdvice.meaningId}`);

// ─────────────────────────────────────────────────────────────
// 5. SENTENCE BUILDER PRACTICE & VALIDATION TESTS
// ─────────────────────────────────────────────────────────────
console.log('\n5. Testing Sentence Builder Practice (Sakubun Engine)...');

const exercise = generateSentenceExercise({
  patternId: 'te_wa_ikenai',
  includeDistractors: true,
});

assert(exercise.availableTiles.length >= 4, `Exercise generated with ${exercise.availableTiles.length} tiles`);
assert(exercise.validSequences.length >= 1, `Exercise has ${exercise.validSequences.length} valid sequence permutations`);

const hasDistractor = exercise.availableTiles.some(t => t.isDistractor);
assert(hasDistractor, 'Exercise includes educational distractor tiles');

// Test submitting a 100% correct sequence
const correctSequence = exercise.validSequences[0];
const correctFeedback = validateSentenceSubmission(exercise, correctSequence);
assert(correctFeedback.isCorrect, 'Correct sequence accepted with 100% score');
assert(correctFeedback.score === 100, 'Score is 100');

// Test submitting a distractor tile (e.g. wrong verb form or wrong particle)
const distractorTile = exercise.availableTiles.find(t => t.isDistractor);
if (distractorTile) {
  const badSequenceWithDistractor = [...correctSequence.slice(0, 2), distractorTile.id];
  const distractorFeedback = validateSentenceSubmission(exercise, badSequenceWithDistractor);
  assert(!distractorFeedback.isCorrect, 'Submission with distractor tile correctly rejected');
  assert(
    distractorFeedback.errorType === 'wrong_particle' || distractorFeedback.errorType === 'wrong_conjugation',
    `Identified specific mistake: ${distractorFeedback.errorType}`
  );
  assert(distractorFeedback.pedagogicalAdvice.length > 0, `Pedagogical advice provided: ${distractorFeedback.pedagogicalAdvice}`);
}

// ─────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────
console.log('\n======================================================');
console.log(`🏁 TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('======================================================\n');

if (failCount > 0) {
  process.exit(1);
}
