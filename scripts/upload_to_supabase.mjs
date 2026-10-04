import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load environment variables from .env if present
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
// Prioritize service_role key to bypass RLS for admin seeding; fallback to anon key if temp policy exists
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlva2hkaHFucHNscHdzeHNwdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjQyMDUsImV4cCI6MjEwNDAwMDIwNX0.8o2UFh4VXRUObjvBq_rVRxIar7yZSU7vrCgaHutYyPE';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const DB_DIR = path.join(ROOT_DIR, 'src', 'data', 'db');

async function batchUpsert(table, items, batchSize = 100) {
  console.log(`\n📦 Mulai upload ke tabel '${table}' (Total: ${items.length} data)...`);
  let successCount = 0;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Gagal pada chunk ${i} - ${i + chunk.length} di '${table}':`, error.message);
      if (error.message.includes('row-level security')) {
        console.error(`⚠️ PERINGATAN: Row Level Security menolak INSERT dengan anon key!`);
        console.error(`👉 Masukkan SUPABASE_SERVICE_ROLE_KEY di .env atau izinkan temporary INSERT policy di SQL Editor Supabase.`);
        return false;
      }
    } else {
      successCount += chunk.length;
      process.stdout.write(`\r🚀 Terupload: ${successCount} / ${items.length} (${Math.round((successCount / items.length) * 100)}%)`);
    }
  }
  console.log(`\n✅ Berhasil mengupload ${successCount} baris ke '${table}'.`);
  return true;
}

// 1. Upload Kanji
async function uploadKanji() {
  const file = path.join(DB_DIR, 'kanji.json');
  if (!fs.existsSync(file)) return;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  
  const mapped = list.filter(k => k && k.id && k.character).map(k => ({
    id: k.id,
    character: k.character,
    unicode: k.unicode || null,
    jlpt_level: k.jlpt || k.jlptLevel || 'N5',
    stroke_count: k.strokeCount || 1,
    onyomi: k.onyomi || [],
    kunyomi: k.kunyomi || [],
    nanori: k.nanori || [],
    meanings: k.meanings || (k.meaningId ? [k.meaningId] : []),
    meaning_id: k.meaningId || null,
    meaning_en: k.meaningEn || null,
    radical: k.radical || null,
    radical_name: k.radicalName || null,
    status: 'published',
    version: 1
  }));

  return await batchUpsert('kanji', mapped, 150);
}

// 2. Upload Vocabulary (Kotoba)
async function uploadVocabulary() {
  const file = path.join(DB_DIR, 'kotoba.json');
  if (!fs.existsSync(file)) return;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  
  const mapped = list.filter(v => v && v.id && v.word).map(v => ({
    id: v.id,
    word: v.word,
    reading: v.reading || '',
    meaning_id: v.meaningId || null,
    meaning_en: v.meaningEn || null,
    meaning_ja: v.meaningJa || null,
    jlpt_level: v.jlpt || 'N5',
    part_of_speech: v.wordType ? [v.wordType] : [],
    kanji_ids: v.kanjiComponents || [],
    collocations: v.collocations || [],
    tags: v.tags || [],
    status: 'published',
    version: 1
  }));

  return await batchUpsert('vocabulary', mapped, 150);
}

// 3. Upload Grammar (Bunpou)
async function uploadGrammar() {
  const file = path.join(DB_DIR, 'bunpou.json');
  if (!fs.existsSync(file)) return;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : Object.values(raw);
  
  const mapped = list.filter(g => g && g.id && (g.title || g.name)).map(g => ({
    id: g.id,
    pattern: g.formula || g.pattern || g.title || 'N/A',
    name: g.title || g.name || 'N/A',
    formula: g.formula || g.title || 'N/A',
    meaning_id: g.meaning_id || g.meaningId || 'N/A',
    meaning_en: g.meaning_en || g.meaningEn || '',
    explanation_note: g.explanation_note || g.explanationNote || null,
    jlpt_level: g.jlpt || g.jlpt_level || 'N3',
    status: 'published',
    version: 1
  }));

  return await batchUpsert('grammar', mapped, 100);
}

async function run() {
  console.log('====================================================');
  console.log('   📤 NIHONGO QUEST: SUPABASE DATA SEEDER');
  console.log('====================================================');
  console.log(`Target URL: ${supabaseUrl}`);
  console.log(`Key Type: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '🔑 SERVICE_ROLE (Admin Bypassing RLS)' : '🌐 ANON KEY (Public)'}`);

  const kanjiOk = await uploadKanji();
  if (!kanjiOk) return;

  const vocabOk = await uploadVocabulary();
  if (!vocabOk) return;

  const grammarOk = await uploadGrammar();
  if (!grammarOk) return;

  console.log('\n🎉 SEMUA MATERI UTAMA BERHASIL DIUPLOAD KE SUPABASE!');
}

run();
