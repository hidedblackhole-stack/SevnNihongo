const fs = require('fs');
const path = require('path');

const PORTAL_URLS = {
  N1: 'https://soal-jlpt-n1.pages.dev/',
  N2: 'https://latihan-soal-jlpt-n2.pages.dev/',
  N3: 'https://latihan-soal-jlpt-n3.pages.dev/'
};

const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'tryouts', 'official');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return await res.text();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function parseChunk(chunk, prefix) {
  const markerRegex = /(<div\s+[^>]*class="[^"]*section-header[^"]*"[^>]*>|<div\s+[^>]*class="[^"]*question-card[^"]*"[^>]*>|<div\s+[^>]*class="[^"]*chapter-banner[^"]*"[^>]*>)/gi;
  const markers = [];
  let m;

  while ((m = markerRegex.exec(chunk)) !== null) {
    const rawTag = m[0];
    let type = 'unknown';
    let id = '';
    if (rawTag.includes('question-card')) {
      type = 'card';
      const idMatch = rawTag.match(/id="([^"]+)"/i);
      id = idMatch ? idMatch[1] : `q_${markers.length}`;
    } else if (rawTag.includes('section-header')) {
      type = 'header';
    } else if (rawTag.includes('chapter-banner')) {
      type = 'banner';
    }
    markers.push({ index: m.index, tag: rawTag, type, id });
  }

  const questions = [];
  let currentInstruction = '';
  let currentPassage = '';

  for (let i = 0; i < markers.length; i++) {
    const curr = markers[i];
    const nextIndex = (i + 1 < markers.length) ? markers[i + 1].index : chunk.length;
    const content = chunk.substring(curr.index, nextIndex);

    if (curr.type === 'header') {
      const headerMatch = content.match(/<div class="section-header"[^>]*>([\s\S]*?)<\/div>/);
      if (headerMatch) {
        currentInstruction = cleanText(headerMatch[1]);
      }
      currentPassage = ''; // reset passage on new section/mondai header
    } else if (curr.type === 'banner') {
      currentPassage = '';
    } else if (curr.type === 'card') {
      // Extract passage if any
      let passage = undefined;
      const passageMatch = content.match(/<div class="q-passage-box">[\s\S]*?<div class="q-passage-text">([\s\S]*?)<\/div>\s*<\/div>/);
      if (passageMatch) {
        passage = cleanText(passageMatch[1]);
        currentPassage = passage;
      } else if (currentPassage) {
        passage = currentPassage;
      }

      // Extract prompt
      const qTextMatch = content.match(/<div class="q-text"[^>]*>([\s\S]*?)<\/div>/);
      let prompt = qTextMatch ? cleanText(qTextMatch[1]) : '';

      // Extract options
      const optRegex = /<li class="q-option([^"]*)">[\s\S]*?<span class="q-opt-text"[^>]*>([\s\S]*?)<\/span><\/li>/g;
      let optMatch;
      const options = [];
      let correctIndex = -1;
      let oIdx = 0;

      while ((optMatch = optRegex.exec(content)) !== null) {
        const isAnswer = optMatch[1].includes('is-answer');
        const optText = cleanText(optMatch[2]);
        options.push(optText);
        if (isAnswer) {
          correctIndex = oIdx;
        }
        oIdx++;
      }

      // Fallback for answer if not marked on li
      if (correctIndex === -1) {
        const ansMatch = content.match(/<span class="q-answer-num">(\d+)<\/span>/);
        if (ansMatch) {
          const num = parseInt(ansMatch[1], 10);
          if (num >= 1 && num <= options.length) {
            correctIndex = num - 1;
          }
        }
      }

      // Extract explanation
      const expMatch = content.match(/<div class="q-explain-box">[\s\S]*?<div class="q-explain-item"[^>]*>([\s\S]*?)<\/div>/);
      const explanation = expMatch ? cleanText(expMatch[1]) : undefined;

      // Handle empty prompt
      if (!prompt) {
        if (prefix.endsWith('_ck')) {
          prompt = '（音声を聞いて、最もよいものを一つ選んでください）';
        } else if (currentInstruction) {
          prompt = `（${currentInstruction.substring(0, 80)}）`;
        } else {
          prompt = '（最もよいものを一つ選んでください）';
        }
      }

      // Validation check
      if (prompt && options.length >= 2 && correctIndex >= 0 && correctIndex < options.length) {
        const q = {
          id: `${prefix}_${curr.id}`,
          prompt,
          options,
          correctIndex,
        };
        if (currentInstruction) q.instruction = currentInstruction;
        if (passage) q.passage = passage;
        if (explanation) q.explanation = explanation;
        questions.push(q);
      }
    }
  }

  return questions;
}

function parseSectionsFromHtml(html, packageId, level) {
  // Find all chapter banners by their opening tag and id
  const bannerRegex = /<div class="chapter-banner"[^>]*id="([^"]*)"[^>]*>/g;
  const sectionsFound = [];
  let bm;
  while ((bm = bannerRegex.exec(html)) !== null) {
    const rawId = bm[1];
    const bannerSnippet = html.substring(bm.index, bm.index + 400);
    let secType = 'bunpouDokkai';
    if (bannerSnippet.includes('聴解') || bannerSnippet.toLowerCase().includes('chokai')) {
      secType = 'choukai';
    } else if (bannerSnippet.includes('文字') || bannerSnippet.includes('語彙') || bannerSnippet.toLowerCase().includes('mojigoi')) {
      secType = 'mojiGoi';
    } else if (bannerSnippet.includes('文法') || bannerSnippet.includes('読解') || bannerSnippet.toLowerCase().includes('bunpou') || bannerSnippet.toLowerCase().includes('dokkai')) {
      secType = 'bunpouDokkai';
    }
    sectionsFound.push({ id: rawId, startIndex: bm.index, secType });
  }

  // Fallback if no chapter-banner tags were found
  if (sectionsFound.length === 0) {
    const idxB1 = html.indexOf('id="bagian-1"');
    const idxB2 = html.indexOf('id="bagian-2"');
    const idxB3 = html.indexOf('id="bagian-3"');
    if (idxB1 !== -1) sectionsFound.push({ id: 'bagian-1', startIndex: idxB1, secType: 'mojiGoi' });
    if (idxB2 !== -1) sectionsFound.push({ id: 'bagian-2', startIndex: idxB2, secType: 'bunpouDokkai' });
    if (idxB3 !== -1) sectionsFound.push({ id: 'bagian-3', startIndex: idxB3, secType: 'choukai' });
  }

  // Sort sections by startIndex
  sectionsFound.sort((a, b) => a.startIndex - b.startIndex);

  let mojiGoi = [];
  let bunpouDokkai = [];
  let choukai = [];

  for (let i = 0; i < sectionsFound.length; i++) {
    const s = sectionsFound[i];
    const endIndex = (i + 1 < sectionsFound.length) ? sectionsFound[i + 1].startIndex : html.length;
    const chunk = html.substring(s.startIndex, endIndex);

    const prefix = `${packageId}_${s.secType === 'mojiGoi' ? 'mg' : s.secType === 'bunpouDokkai' ? 'bd' : 'ck'}`;
    const qs = parseChunk(chunk, prefix);

    if (s.secType === 'mojiGoi') {
      mojiGoi.push(...qs);
    } else if (s.secType === 'bunpouDokkai') {
      bunpouDokkai.push(...qs);
    } else if (s.secType === 'choukai') {
      choukai.push(...qs);
    }
  }

  return { mojiGoi, bunpouDokkai, choukai };
}

async function scrapeExamPage(level, pageUrl, fileName) {
  const html = await fetchHtml(pageUrl);

  const nameMatch = fileName.match(/N[123]-(\d{2})-(\d{4})\.html/i);
  let month = 7;
  let year = 2024;
  if (nameMatch) {
    month = parseInt(nameMatch[1], 10);
    year = parseInt(nameMatch[2], 10);
  }

  const monthName = month === 7 ? 'Juli' : month === 12 ? 'Desember' : `Bulan ${month}`;
  const packageCode = `${year}-${String(month).padStart(2, '0')}`;
  const packageId = `${level.toLowerCase()}_${year}_${String(month).padStart(2, '0')}`;
  const title = `JLPT ${level} — ${monthName} ${year} (Resmi)`;

  const { mojiGoi, bunpouDokkai, choukai } = parseSectionsFromHtml(html, packageId, level);

  const tryOutData = {
    id: packageId,
    title,
    level,
    code: packageCode,
    year,
    month,
    passingScore: level === 'N1' ? 100 : level === 'N2' ? 90 : 95,
    maxScore: 180,
    sections: {
      mojiGoi: {
        title: '言語知識（文字・語彙）',
        timeLimitMinutes: level === 'N1' ? 40 : level === 'N2' ? 35 : 30,
        questions: mojiGoi
      },
      bunpouDokkai: {
        title: '言語知識（文法）・読解',
        timeLimitMinutes: level === 'N1' ? 70 : level === 'N2' ? 70 : 70,
        questions: bunpouDokkai
      },
      choukai: {
        title: '聴解',
        timeLimitMinutes: level === 'N1' ? 60 : level === 'N2' ? 50 : 40,
        questions: choukai
      }
    }
  };

  const totalQuestions = mojiGoi.length + bunpouDokkai.length + choukai.length;
  const outFilePath = path.join(OUTPUT_DIR, `${packageId}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(tryOutData, null, 2), 'utf-8');

  console.log(`✅ [${level}] ${title} (${totalQuestions} soal: ${mojiGoi.length} MG + ${bunpouDokkai.length} BD + ${choukai.length} CK)`);

  return {
    id: packageId,
    level,
    title,
    code: packageCode,
    year,
    month,
    totalQuestions,
    fileName: `${packageId}.json`,
    filePath: `./official/${packageId}.json`
  };
}

async function run() {
  const args = process.argv.slice(2);
  const targetLevel = args.find(a => a.startsWith('--level='))?.split('=')[1]?.toUpperCase();
  const limitPerLevel = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '999', 10);
  const minYear = parseInt(args.find(a => a.startsWith('--min-year='))?.split('=')[1] || '2020', 10);

  const levelsToScrape = targetLevel ? [targetLevel] : ['N1', 'N2', 'N3'];
  console.log(`🚀 Memulai Scraper Ujian Resmi JLPT untuk: ${levelsToScrape.join(', ')} (min tahun: ${minYear})...`);

  const manifest = [];

  for (const lvl of levelsToScrape) {
    const portalUrl = PORTAL_URLS[lvl];
    if (!portalUrl) continue;

    console.log(`\n==================================================`);
    console.log(`Mengambil daftar ujian ${lvl} dari ${portalUrl}`);
    console.log(`==================================================`);
    const portalHtml = await fetchHtml(portalUrl);

    const regex = /href="([^"]+\.html)"/g;
    let match;
    const rawPages = [];
    while ((match = regex.exec(portalHtml)) !== null) {
      const file = match[1];
      if (file.toLowerCase().startsWith(lvl.toLowerCase()) && !rawPages.includes(file)) {
        rawPages.push(file);
      }
    }

    // Sort pages by year DESC, then month DESC (e.g. 2024-12 before 2024-07 before 2023-12)
    const sortedPages = rawPages
      .map(file => {
        const m = file.match(/N[123]-(\d{2})-(\d{4})\.html/i);
        return {
          file,
          month: m ? parseInt(m[1], 10) : 0,
          year: m ? parseInt(m[2], 10) : 0
        };
      })
      .filter(item => item.year >= minYear)
      .sort((a, b) => b.year - a.year || b.month - a.month)
      .map(item => item.file);

    console.log(`Ditemukan ${sortedPages.length} periode ujian (tahun >= ${minYear}). Memproses hingga ${limitPerLevel}...`);
    const selectedPages = sortedPages.slice(0, limitPerLevel);

    for (const pageFile of selectedPages) {
      const pageUrl = new URL(pageFile, portalUrl).href;
      try {
        const meta = await scrapeExamPage(lvl, pageUrl, pageFile);
        manifest.push(meta);
        await sleep(100); // safe polite delay
      } catch (err) {
        console.error(`❌ Gagal scrape ${lvl} ${pageFile}:`, err.message);
      }
    }
  }

  // Sort overall manifest
  manifest.sort((a, b) => {
    const lvlOrder = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5 };
    const diffLvl = (lvlOrder[a.level] || 99) - (lvlOrder[b.level] || 99);
    if (diffLvl !== 0) return diffLvl;
    return b.year - a.year || b.month - a.month;
  });

  // Save manifest.json
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  // Generate an official index file: src/data/tryouts/official/index.ts
  generateOfficialIndex(manifest);

  console.log(`\n🎉 SELESAI: ${manifest.length} paket ujian resmi berhasil disimpan ke ${OUTPUT_DIR}`);
}

function generateOfficialIndex(manifest) {
  const lines = [
    `// Auto-generated official JLPT exam packages from themarsjlpt.dev`,
    `import { TryOutMeta } from '../index';`,
    `import { TryOutData } from '../../../types/content';`,
    ``
  ];

  // Import each package
  manifest.forEach((m) => {
    lines.push(`import ${m.id} from './${m.id}.json';`);
  });

  lines.push(``);
  lines.push(`export const OFFICIAL_TRYOUTS: TryOutMeta[] = [`);

  manifest.forEach((m) => {
    lines.push(`  {`);
    lines.push(`    id: '${m.id}',`);
    lines.push(`    level: '${m.level}',`);
    lines.push(`    title: '${m.title}',`);
    lines.push(`    code: '${m.code}',`);
    lines.push(`    totalQuestions: (${m.id}.sections.mojiGoi?.questions?.length || 0) + (${m.id}.sections.bunpouDokkai?.questions?.length || 0) + (${m.id}.sections.choukai?.questions?.length || 0),`);
    lines.push(`    data: ${m.id} as unknown as TryOutData`);
    lines.push(`  },`);
  });

  lines.push(`];`);
  lines.push(``);

  const indexPath = path.join(OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  console.log(`📁 Berhasil men-generate: ${indexPath}`);
}

run().catch(console.error);
