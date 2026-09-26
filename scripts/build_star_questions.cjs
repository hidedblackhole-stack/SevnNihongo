const fs = require('fs');
const path = require('path');

function parseBlanksAndStar(prompt) {
  let p = prompt.replace(/＿/g, '_').replace(/　/g, ' ');
  const starIdx = p.indexOf('★');
  if (starIdx === -1) return null;

  const before = p.slice(0, starIdx);
  const after = p.slice(starIdx + 1);

  const blanksBefore = (before.match(/_{1,}/g) || []).length;
  let starIndex = Math.min(3, Math.max(0, blanksBefore));

  let prefix = '';
  const firstUnderscore = before.search(/_{1,}/);
  if (firstUnderscore !== -1) {
    prefix = before.slice(0, firstUnderscore).trim();
  } else {
    prefix = before.trim();
  }

  let suffix = '';
  const lastBlanks = [...after.matchAll(/_{1,}/g)];
  if (lastBlanks.length > 0) {
    const lb = lastBlanks[lastBlanks.length - 1];
    suffix = after.slice(lb.index + lb[0].length).trim();
  } else {
    suffix = after.trim();
  }

  prefix = prefix.replace(/_+/g, '').trim();
  suffix = suffix.replace(/_+/g, '').trim();

  return { prefix, suffix, starIndex };
}

const allQuestions = [];
const officialDir = path.resolve(__dirname, '../src/data/tryouts/official');
const tryoutsDir = path.resolve(__dirname, '../src/data/tryouts');

const filesToScan = [
  ...fs.readdirSync(officialDir).filter(f => f.endsWith('.json') && f !== 'manifest.json').map(f => path.join(officialDir, f)),
  path.join(tryoutsDir, 'n4_001.json'),
  path.join(tryoutsDir, 'n4_002.json'),
  path.join(tryoutsDir, 'n5_001.json')
];

for (const f of filesToScan) {
  try {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    let level = data.level || 'N3';
    const base = path.basename(f);
    if (base.startsWith('n1')) level = 'N1';
    else if (base.startsWith('n2')) level = 'N2';
    else if (base.startsWith('n3')) level = 'N3';
    else if (base.startsWith('n4')) level = 'N4';
    else if (base.startsWith('n5')) level = 'N5';

    let qList = [];
    if (data.sections) {
      const secs = Array.isArray(data.sections) ? data.sections : Object.values(data.sections);
      secs.forEach(s => { if (s && Array.isArray(s.questions)) qList.push(...s.questions); });
    } else if (Array.isArray(data.questions)) {
      qList.push(...data.questions);
    }

    for (const q of qList) {
      if (q.prompt && q.prompt.includes('★') && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === 'number') {
        const hasBadOption = q.options.some(opt => opt.length > 50 || opt.includes('２０２') || opt.includes('問題'));
        if (hasBadOption) continue;

        const parsed = parseBlanksAndStar(q.prompt);
        if (parsed) {
          allQuestions.push({
            id: q.id || 'star_' + allQuestions.length,
            level,
            prefix: parsed.prefix,
            suffix: parsed.suffix,
            starIndex: parsed.starIndex,
            options: q.options.map(o => o.trim()),
            correctIndex: q.correctIndex,
            explanation: (q.explanation || '').trim(),
            originalPrompt: q.prompt.trim()
          });
        }
      }
    }
  } catch(e) {}
}

const fileHeader = `/**
 * JLPT Star Questions (文の組み立て / Bun no Kumitate)
 * Authentic sentence scramble questions directly extracted from past official JLPT exams.
 */

export interface StarQuestion {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  prefix: string;
  suffix: string;
  starIndex: number; // 0, 1, 2, or 3
  options: string[]; // 4 options
  correctIndex: number; // 0, 1, 2, 3
  explanation?: string;
  originalPrompt?: string;
}

export const JLPT_STAR_QUESTIONS: StarQuestion[] = ` + JSON.stringify(allQuestions, null, 2) + `;

export function getRandomStarQuestions(
  levelFilter?: string,
  count = 20
): StarQuestion[] {
  let pool = JLPT_STAR_QUESTIONS;
  if (levelFilter && levelFilter !== 'all') {
    pool = pool.filter(q => q.level.toLowerCase() === levelFilter.toLowerCase());
  }
  if (pool.length === 0) pool = JLPT_STAR_QUESTIONS;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
`;

const outputPath = path.resolve(__dirname, '../src/data/starQuestionsData.ts');
fs.writeFileSync(outputPath, fileHeader, 'utf8');
console.log('Successfully generated', outputPath, 'with', allQuestions.length, 'questions!');
