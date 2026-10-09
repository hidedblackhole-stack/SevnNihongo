// Template "grammar-explainer": spec scene + data topik + capture → props komponen scene.
import type { CaptureTimeline, ResolvedBunpou, SceneSpec } from '../../mappings/types';

export interface TemplateInput {
  scene: SceneSpec;
  bunpou: ResolvedBunpou;
  query: string;
  /** characterId → path relatif public/ (sudah disalin). */
  characterFile?: string;
  capture?: { dir: string; timeline: CaptureTimeline };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, s.lastIndexOf(' ', n)) + '…' : s);
/** Ambil kalimat pertama catatan agar muat di layar. */
const firstSentence = (s: string) => clip((s.split('Catatan:')[1] ?? s).trim().split(/(?<=[.。])\s/)[0], 150);

export function buildScene(i: TemplateInput): Record<string, unknown> {
  const { scene, bunpou: b, query } = i;
  const character = i.characterFile ? { file: i.characterFile, position: scene.character?.position } : undefined;
  switch (scene.type) {
    case 'intro':
      return { mode: 'hero', title: `〜${query.replace(/^[〜~]/, '')}`, level: b.level, meaning: b.meaningId, subtitle: scene.subtitle, character };
    case 'explanation':
      return { mode: 'detail', title: `〜${b.title}`, formula: b.formula.replace(/\s+/g, ' '), meaning: b.meaningId, note: firstSentence(b.explanation), subtitle: scene.subtitle, character };
    case 'website-demo':
      if (!i.capture) throw new Error('website-demo butuh hasil capture (npm run capture)');
      return { dir: i.capture.dir, timeline: i.capture.timeline };
    case 'examples':
      return { examples: b.examples.map(({ japanese, meaningId }) => ({ japanese, meaningId })), highlight: b.title };
    case 'outro':
      return { headline: 'Cari pola lain di Library SevnQuest', sub: 'Tata Bahasa · Kosakata · Kanji — semua ada di satu tempat.', character };
  }
}
