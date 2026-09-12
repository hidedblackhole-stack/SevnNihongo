#!/usr/bin/env node
/**
 * AI Consultant Tool (ENX API)
 * Allows querying external models (Claude Opus 5, GPT-6 Astra, GPT-5.3 Codex, etc.)
 * for code reviews, second opinions, and complex architectural advice.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const API_KEY = process.env.ENX_API_KEY;
const BASE_URL = process.env.ENX_BASE_URL || 'https://enxapi.id/v1';
const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL || 'claude-opus-5';

if (!API_KEY) {
  console.error('❌ Error: ENX_API_KEY tidak ditemukan di file .env');
  process.exit(1);
}

// Parse simple CLI arguments
const args = process.argv.slice(2);
let model = DEFAULT_MODEL;
let filePaths = [];
let promptParts = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model' && args[i + 1]) {
    model = args[i + 1];
    i++;
  } else if (args[i] === '--file' && args[i + 1]) {
    filePaths.push(args[i + 1]);
    i++;
  } else {
    promptParts.push(args[i]);
  }
}

let userPrompt = promptParts.join(' ').trim();

if (!userPrompt) {
  console.log(`
ℹ️ Penggunaan:
  node scripts/ai_consultant.mjs [opsi] "Pertanyaan Anda"

Opsi:
  --model <model_id>   (Default: claude-opus-5 | Pilihan lain: gpt-6-astra, gpt-5.3-codex)
  --file <path>        (Lampirkan isi file ke prompt sebagai konteks)

Contoh:
  node scripts/ai_consultant.mjs --model gpt-6-astra "Review fungsi ini"
  node scripts/ai_consultant.mjs --file src/utils/rewards.ts "Bagaimana optimasi fungsi ini?"
`);
  process.exit(0);
}

// Attach file contents if requested
let contextContent = '';
for (const filePath of filePaths) {
  const fullPath = path.resolve(rootDir, filePath);
  if (fs.existsSync(fullPath)) {
    const fileData = fs.readFileSync(fullPath, 'utf8');
    contextContent += `\n\n--- [FILE: ${filePath}] ---\n${fileData}\n--- [END OF FILE] ---\n`;
  } else {
    console.warn(`⚠️ Warning: File ${filePath} tidak ditemukan.`);
  }
}

const finalMessageContent = contextContent
  ? `${contextContent}\n\nPertanyaan/Tugas:\n${userPrompt}`
  : userPrompt;

console.log(`🤖 Menghubungi [${model}] via ${BASE_URL}...`);

try {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Anda adalah konsultan pemrograman senior dan arsitek software kelas dunia. Berikan jawaban yang presisi, mendalam, dan langsung ke solusi teknis terbaik.',
        },
        {
          role: 'user',
          content: finalMessageContent,
        },
      ],
      max_tokens: 8192,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ HTTP Error ${response.status}:`, errText);
    process.exit(1);
  }

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  const answer = msg?.content || msg?.reasoning_content || JSON.stringify(msg, null, 2);

  console.log('\n=================== JAWABAN AI ===================\n');
  console.log(answer);
  console.log('\n==================================================');
  if (data.usage) {
    console.log(`📊 Token Digunakan: ${data.usage.total_tokens} (Prompt: ${data.usage.prompt_tokens}, Output: ${data.usage.completion_tokens})`);
  }
} catch (err) {
  console.error('❌ Terjadi kesalahan saat memanggil API:', err);
  process.exit(1);
}
