// Spike: ambil caption sebuah video lalu analisis per baris.  npx tsx scripts/spike_caption_analysis.ts <id|url>
import { fetchCaptions } from '../api/captions';
import { analyzeCaptionLines } from '../src/engine/textStudy/captionAnalysis';
import { parseYouTubeId } from '../src/utils/youtube';

const id = parseYouTubeId(process.argv[2] ?? '');
if (!id) {
  console.error('Beri videoId atau URL YouTube.');
  process.exit(1);
}

const { lines } = await fetchCaptions(id);
const t0 = Date.now();
const a = analyzeCaptionLines(lines);
console.log(`${lines.length} baris dianalisis dalam ${Date.now() - t0}ms · ${a.vocab.length} kotoba unik · ${a.grammar.length} pola unik\n`);

for (const l of a.perLine.slice(0, 12)) {
  console.log(`[${(l.startMs / 1000).toFixed(1)}s] ${l.text}`);
  console.log(`   kotoba: ${l.words.map(w => `${w.surface}${w.inflected ? `→${w.item.word}` : ''}`).join(' ') || '-'}`);
  console.log(`   pola  : ${l.grammar.map(g => `${g.matched}(${g.item.title})`).join(' ') || '-'}`);
}
const covered = a.perLine.filter(l => l.words.length > 0).length;
console.log(`\nbaris dengan ≥1 kotoba dikenali: ${covered}/${lines.length} · baris dengan pola: ${a.perLine.filter(l => l.grammar.length > 0).length}`);
