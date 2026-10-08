// Spike: uji pengambilan caption Jepang untuk beberapa video.
// Pakai:  npx tsx scripts/spike_captions.ts <videoId|url> [...]
import { fetchCaptions, CaptionError } from '../api/captions';
import { parseYouTubeId } from '../src/utils/youtube';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Beri minimal satu videoId atau URL YouTube.');
  process.exit(1);
}

for (const arg of args) {
  const id = parseYouTubeId(arg);
  if (!id) {
    console.log(`✗ ${arg}  → bukan link YouTube`);
    continue;
  }
  const t0 = Date.now();
  try {
    const r = await fetchCaptions(id);
    const ms = Date.now() - t0;
    const last = r.lines[r.lines.length - 1];
    console.log(`✓ ${id}  ${r.kind}/${r.language}  ${r.lines.length} baris  ${ms}ms  selesai di ${last ? Math.round(last.endMs / 1000) : 0}s`);
    for (const l of r.lines.slice(0, 3)) console.log(`    [${(l.startMs / 1000).toFixed(1)}s] ${l.text}`);
  } catch (err) {
    console.log(`✗ ${id}  → ${err instanceof CaptionError ? err.message : String(err)}`);
  }
}
