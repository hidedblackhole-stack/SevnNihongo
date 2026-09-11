const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '../src/data/db');

console.log('--- Starting Identity Architecture Data Normalization ---');

// -----------------------------------------------------------------------------
// 1. NORMALIZE BUNPOU (Strip map_id and stage_id)
// -----------------------------------------------------------------------------
const bunpouPath = path.join(DB_DIR, 'bunpou.json');
if (fs.existsSync(bunpouPath)) {
  console.log('Normalizing bunpou.json...');
  const bunpouRaw = JSON.parse(fs.readFileSync(bunpouPath, 'utf8'));
  let strippedCount = 0;

  const normalizedBunpou = bunpouRaw.map(item => {
    const { map_id, stage_id, ...cleanItem } = item;
    if (map_id || stage_id) strippedCount++;
    return {
      ...cleanItem,
      version: cleanItem.version || 1,
      status: cleanItem.status || 'published'
    };
  });

  fs.writeFileSync(bunpouPath, JSON.stringify(normalizedBunpou, null, 2), 'utf8');
  console.log(`✓ bunpou.json normalized: ${strippedCount} items decoupled from map_id/stage_id.`);
}

// -----------------------------------------------------------------------------
// 2. EXTRACT KANJI QUESTIONS (Separate questions from kanji.json)
// -----------------------------------------------------------------------------
const kanjiPath = path.join(DB_DIR, 'kanji.json');
const kanjiQuestionsPath = path.join(DB_DIR, 'kanji_questions.json');

if (fs.existsSync(kanjiPath)) {
  console.log('Extracting questions from kanji.json...');
  const kanjiRaw = JSON.parse(fs.readFileSync(kanjiPath, 'utf8'));
  const allKanjiQuestions = [];
  const cleanKanjiDb = {};

  const entries = Object.entries(kanjiRaw);
  for (const [key, item] of entries) {
    if (!item) continue;
    
    const { questions, ...cleanItem } = item;
    
    // Add Unicode representation if missing
    let unicode = cleanItem.unicode;
    if (!unicode && cleanItem.character) {
      unicode = 'U+' + cleanItem.character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
    }

    cleanKanjiDb[key] = {
      ...cleanItem,
      unicode,
      version: cleanItem.version || 1,
      status: cleanItem.status || 'published'
    };

    if (Array.isArray(questions) && questions.length > 0) {
      questions.forEach((q, idx) => {
        allKanjiQuestions.push({
          id: q.id || `kj_q_${cleanItem.id}_${idx + 1}`,
          question_type: 'kanji_recognition',
          difficulty_level: 1,
          skill: 'recognition',
          prompt: q.prompt,
          ruby: q.ruby,
          options: q.options || [],
          correct_index: q.correctIndex !== undefined ? q.correctIndex : (q.correct_answer || 0),
          explanation: q.explanation || '',
          knowledge_refs: [cleanItem.id],
          kanji_refs: [cleanItem.id],
          version: 1,
          status: 'published'
        });
      });
    }
  }

  fs.writeFileSync(kanjiPath, JSON.stringify(cleanKanjiDb, null, 2), 'utf8');
  fs.writeFileSync(kanjiQuestionsPath, JSON.stringify(allKanjiQuestions, null, 2), 'utf8');
  console.log(`✓ kanji.json normalized: extracted ${allKanjiQuestions.length} questions into kanji_questions.json.`);
}

// -----------------------------------------------------------------------------
// 3. EXTRACT SENTENCE BANK (Sentences as First-Class Citizens)
// -----------------------------------------------------------------------------
const kotobaPath = path.join(DB_DIR, 'kotoba.json');
const sentencesPath = path.join(DB_DIR, 'sentences.json');
const sentenceLinksPath = path.join(DB_DIR, 'sentence_links.json');

const sentenceBank = [];
const sentenceVocabLinks = [];
const sentenceGrammarLinks = [];
const seenSentences = new Map(); // Japanese text -> sentence ID

// Extract from kotoba.json
if (fs.existsSync(kotobaPath)) {
  console.log('Extracting sentences from kotoba.json...');
  const kotobaRaw = JSON.parse(fs.readFileSync(kotobaPath, 'utf8'));
  for (const [id, item] of Object.entries(kotobaRaw)) {
    if (item && item.exampleSentence && item.exampleSentence.japanese) {
      const ex = item.exampleSentence;
      let sentenceId = seenSentences.get(ex.japanese);
      if (!sentenceId) {
        sentenceId = `sen_kt_${id}`;
        seenSentences.set(ex.japanese, sentenceId);
        sentenceBank.push({
          id: sentenceId,
          japanese: ex.japanese,
          reading: ex.reading || '',
          translation_id: ex.meaningId || '',
          translation_en: ex.meaningEn || '',
          source: 'kotoba_database',
          version: 1
        });
      }
      sentenceVocabLinks.push({
        sentence_id: sentenceId,
        vocabulary_id: id,
        role: 'target_word'
      });
    }
  }
}

// Extract from bunpou.json
if (fs.existsSync(bunpouPath)) {
  console.log('Extracting sentences from bunpou.json...');
  const bunpouRaw = JSON.parse(fs.readFileSync(bunpouPath, 'utf8'));
  bunpouRaw.forEach(item => {
    if (item && Array.isArray(item.examples)) {
      item.examples.forEach((ex, idx) => {
        if (ex && (ex.jp || ex.japanese)) {
          const jpText = ex.jp || ex.japanese;
          let sentenceId = seenSentences.get(jpText);
          if (!sentenceId) {
            sentenceId = `sen_bp_${item.id}_${idx + 1}`;
            seenSentences.set(jpText, sentenceId);
            sentenceBank.push({
              id: sentenceId,
              japanese: jpText,
              reading: ex.reading || '',
              translation_id: ex.id || ex.meaningId || '',
              translation_en: ex.en || ex.meaningEn || '',
              source: 'bunpou_database',
              version: 1
            });
          }
          sentenceGrammarLinks.push({
            sentence_id: sentenceId,
            grammar_id: item.id,
            usage: 'core_pattern'
          });
        }
      });
    }
  });
}

fs.writeFileSync(sentencesPath, JSON.stringify(sentenceBank, null, 2), 'utf8');
fs.writeFileSync(sentenceLinksPath, JSON.stringify({
  sentence_vocabulary: sentenceVocabLinks,
  sentence_grammar: sentenceGrammarLinks
}, null, 2), 'utf8');

console.log(`✓ sentences.json created: ${sentenceBank.length} standalone sentences.`);
console.log(`✓ sentence_links.json created: ${sentenceVocabLinks.length} vocab links, ${sentenceGrammarLinks.length} grammar links.`);
console.log('--- Identity Architecture Data Normalization Complete ---');
