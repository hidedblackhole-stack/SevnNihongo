// VideoSpec + data topik (resolve) + capture → public/video-data/<id>.json (satu-satunya input data Remotion).
//   npx tsx scripts/generate-video-data.ts [videoId]
import fs from 'node:fs';
import path from 'node:path';
import { VIDEOS, getVideo } from '../videos';
import { getContent } from '../mappings/content-registry';
import { ASSETS } from '../mappings/asset-registry';
import { FORMATS, FPS } from '../config/video-presets';
import { buildScene } from '../templates/grammar-explainer/build';
import { totalFrames } from '../scenes/website-demo/timing';
import type { CaptureTimeline, ResolvedScene, ResolvedTopic, ResolvedVideo } from '../mappings/types';
import { CP_ROOT, GENERATED, REPO_ROOT, readJson, writeJson, fail } from './common';

function stageCharacter(characterId: string): string {
  const a = ASSETS.find((x) => x.id === characterId) ?? fail(`Aset tidak terdaftar: ${characterId}`);
  if (a.status !== 'available' || !a.file) fail(`Aset "${characterId}" berstatus ${a.status} (belum ada file)`);
  const src = path.join(REPO_ROOT, a.file!);
  if (!fs.existsSync(src)) fail(`File aset hilang: ${a.file}`);
  const rel = `assets/characters/${characterId}${path.extname(src)}`;
  fs.mkdirSync(path.join(CP_ROOT, 'public', path.dirname(rel)), { recursive: true });
  fs.copyFileSync(src, path.join(CP_ROOT, 'public', rel));
  return rel;
}

export function generateVideo(videoId: string): ResolvedVideo {
  const spec = getVideo(videoId) ?? fail(`Video tidak terdaftar: ${videoId}`);
  const entry = getContent(spec.topicId) ?? fail(`Konten tidak terdaftar: ${spec.topicId}`);
  const topicFile = path.join(GENERATED, 'content', `${spec.topicId}.json`);
  if (!fs.existsSync(topicFile)) fail(`Data topik belum di-resolve. Jalankan: npm run resolve`);
  const topic = readJson<ResolvedTopic>(topicFile);
  if (!topic.bunpou) fail(`Template grammar-explainer butuh topik bunpou`);

  const { width, height } = FORMATS[spec.format];
  let from = 0;
  const scenes: ResolvedScene[] = spec.scenes.map((sc) => {
    let capture: { dir: string; timeline: CaptureTimeline } | undefined;
    if (sc.type === 'website-demo') {
      const pathId = sc.pathId ?? entry.demoPaths[0];
      const dir = `capture/${pathId}/${spec.topicId}`;
      const tlFile = path.join(CP_ROOT, 'public', dir, 'timeline.json');
      if (!fs.existsSync(tlFile)) fail(`Capture belum ada untuk ${pathId}/${spec.topicId}. Jalankan: npm run capture`);
      capture = { dir, timeline: readJson<CaptureTimeline>(tlFile) };
    }
    let durationFrames: number;
    if (sc.durationFrames !== 'auto') durationFrames = sc.durationFrames;
    else if (capture) durationFrames = totalFrames(capture.timeline.beats) + 15;
    else fail(`Scene "${sc.type}" memakai durasi 'auto' tapi tidak punya capture/voice-over yang bisa diukur`);

    const resolved: ResolvedScene = {
      type: sc.type, from, durationFrames: durationFrames!, voiceover: sc.voiceover,
      props: buildScene({ scene: sc, bunpou: topic.bunpou!, query: topic.query, characterFile: sc.character && stageCharacter(sc.character.characterId), capture }),
    };
    from += durationFrames!;
    return resolved;
  });

  const video: ResolvedVideo = { id: spec.id, format: spec.format, width, height, fps: FPS, durationInFrames: from, topicId: spec.topicId, scenes };
  writeJson(path.join(CP_ROOT, 'public', 'video-data', `${spec.id}.json`), video);
  return video;
}

if (process.argv[1]?.endsWith('generate-video-data.ts')) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : VIDEOS.map((v) => v.id);
  for (const id of ids) {
    const v = generateVideo(id);
    console.log(`✓ ${id}: ${v.scenes.length} scene, ${v.durationInFrames} frame (${(v.durationInFrames / v.fps).toFixed(1)} dtk) ${v.width}x${v.height}`);
    v.scenes.forEach((s) => console.log(`    ${s.type.padEnd(13)} @${String(s.from).padStart(4)} +${s.durationFrames}`));
  }
}
