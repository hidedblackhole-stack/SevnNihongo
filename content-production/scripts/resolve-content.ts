// Resolve satu konten → data asli SevnQuest (hanya topik itu, bukan seluruh dataset) → generated/content/<id>.json
// Dijalankan di Node via tsx; mengimpor engine pencarian & dataset asli dari src/ (single source of truth).
import { CONTENT_REGISTRY, getContent } from '../mappings/content-registry';
import type { ResolvedTopic } from '../mappings/types';
import { GENERATED, writeJson } from './common';
const fail = (m: string): never => { throw new Error(m); };
import path from 'node:path';

export async function resolveContent(contentId: string): Promise<ResolvedTopic> {
  const entry = getContent(contentId) ?? fail(`Konten tidak terdaftar: ${contentId}`);
  if (entry.source.dataset !== 'bunpou') fail(`Resolver untuk dataset "${entry.source.dataset}" belum diimplementasi`);

  const { searchJapanese } = await import('../../src/engine/search/universalSearch');
  const hits = searchJapanese(entry.source.lookupKey, { entityTypes: ['bunpou'], limit: 5 });
  const hit = entry.source.expectedEntityId
    ? hits.find((h) => h.entityId === entry.source.expectedEntityId)
    : hits[0];
  if (!hit || hit.entityType !== 'bunpou') {
    fail(`"${entry.source.lookupKey}" tidak ditemukan di data Bunpou` +
      (entry.source.expectedEntityId ? ` (diharapkan ${entry.source.expectedEntityId}; hasil: ${hits.map((h) => h.entityId).join(', ') || 'kosong'})` : ''));
  }
  const b = (hit as Extract<typeof hit, { entityType: 'bunpou' }>).entity;
  return {
    contentId, type: entry.type, query: entry.query,
    bunpou: {
      entityId: b.id, title: b.title, level: b.level, formula: b.formula,
      meaningId: b.meaningId, meaningEn: b.meaningEn, explanation: b.explanation,
      examples: b.examples.map((e) => ({ japanese: e.japanese, reading: e.reading, meaningId: e.meaningId })),
      matchType: hit.matchType, score: hit.score,
    },
  };
}

if (process.argv[1]?.endsWith('resolve-content.ts')) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : CONTENT_REGISTRY.map((c) => c.id);
  for (const id of ids) {
    const t = await resolveContent(id);
    writeJson(path.join(GENERATED, 'content', `${id}.json`), t);
    console.log(`✓ ${id} → ${t.bunpou?.entityId} "${t.bunpou?.title}" (${t.bunpou?.matchType}, score ${t.bunpou?.score.toFixed(2)}), ${t.bunpou?.examples.length} contoh`);
  }
}
