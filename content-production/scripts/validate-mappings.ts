// Validasi statis + data: mapping rusak, konten tidak ditemukan, selector berubah, aset hilang.   npm run validate
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_REGISTRY } from '../mappings/content-registry';
import { NAVIGATION_PATHS } from '../mappings/navigation-map';
import { PAGES } from '../mappings/page-registry';
import { ASSETS } from '../mappings/asset-registry';
import { SELECTORS } from '../website/selectors';
import { VIDEOS } from '../videos';
import { REPO_ROOT, CP_ROOT } from './common';
import type { CaptureTimeline } from '../mappings/types';

const errors: string[] = [];
const warns: string[] = [];
const err = (m: string) => errors.push(m);
const readRepo = (f: string) => { try { return fs.readFileSync(path.join(REPO_ROOT, f), 'utf8'); } catch { return null; } };

// 1. Selector: anchor harus masih ada di source aplikasi (deteksi UI berubah tanpa membuka browser).
for (const s of Object.values(SELECTORS)) {
  const src = readRepo(s.anchor.file);
  if (src === null) err(`selector "${s.id}": file ${s.anchor.file} tidak ada`);
  else if (!src.includes(s.anchor.contains)) err(`selector "${s.id}": anchor "${s.anchor.contains}" tidak lagi ada di ${s.anchor.file} (UI berubah?)`);
}

// 2. Jalur navigasi.
const pathIds = new Set<string>();
for (const p of NAVIGATION_PATHS) {
  if (pathIds.has(p.id)) err(`jalur duplikat: ${p.id}`);
  pathIds.add(p.id);
  if (p.status === 'available' && p.steps.length === 0) err(`jalur "${p.id}" available tapi tanpa langkah`);
  if (p.status === 'future' && !p.note) warns.push(`jalur "${p.id}" future tanpa catatan`);
  const stepIds = new Set<string>();
  for (const st of p.steps) {
    if (stepIds.has(st.id)) err(`jalur "${p.id}": langkah duplikat ${st.id}`);
    stepIds.add(st.id);
    if (!SELECTORS[st.selector]) err(`jalur "${p.id}" langkah "${st.id}": selector "${st.selector}" tidak terdaftar`);
    if (st.waitFor && !SELECTORS[st.waitFor]) err(`jalur "${p.id}" langkah "${st.id}": waitFor "${st.waitFor}" tidak terdaftar`);
    if (st.op === 'type' && !st.text) err(`jalur "${p.id}" langkah "${st.id}": op type tanpa text`);
  }
}

// 3. Halaman.
for (const pg of PAGES) {
  if (readRepo(pg.sourceFile) === null) err(`halaman "${pg.id}": sourceFile ${pg.sourceFile} tidak ada`);
  if (pg.openVia && !SELECTORS[pg.openVia]) err(`halaman "${pg.id}": openVia "${pg.openVia}" tidak terdaftar`);
}

// 4. Aset.
const assetIds = new Set<string>();
for (const a of ASSETS) {
  if (assetIds.has(a.id)) err(`aset duplikat: ${a.id}`);
  assetIds.add(a.id);
  if (a.status === 'available') {
    if (!a.file) err(`aset "${a.id}" available tanpa file`);
    else if (!fs.existsSync(path.join(REPO_ROOT, a.file))) err(`aset "${a.id}": file hilang ${a.file}`);
  }
}

// 5. Konten: jalur ada & tersedia, data asli ditemukan (lewat engine pencarian asli).
const resolverPath = './resolve-content';
const { resolveContent } = await import(resolverPath);
for (const c of CONTENT_REGISTRY) {
  for (const pid of c.demoPaths) {
    const p = NAVIGATION_PATHS.find((x) => x.id === pid);
    if (!p) err(`konten "${c.id}": jalur "${pid}" tidak ada`);
    else if (p.status !== 'available') warns.push(`konten "${c.id}": jalur "${pid}" berstatus ${p.status}`);
    else if (!p.appliesTo.includes(c.type)) err(`konten "${c.id}": jalur "${pid}" tidak berlaku untuk tipe ${c.type}`);
  }
  if (!c.demoPaths.some((pid) => NAVIGATION_PATHS.find((x) => x.id === pid)?.status === 'available')) err(`konten "${c.id}": tidak punya jalur demo available`);
  try {
    const t = await resolveContent(c.id);
    console.log(`  ✓ konten ${c.id} → ${t.bunpou?.entityId} "${t.bunpou?.title}"`);
  } catch (e) { err(`konten "${c.id}" tidak ter-resolve: ${(e as Error).message}`); }
}

// 6. Video.
for (const v of VIDEOS) {
  if (!CONTENT_REGISTRY.some((c) => c.id === v.topicId)) err(`video "${v.id}": topik "${v.topicId}" tidak terdaftar`);
  for (const s of v.scenes) {
    if (s.character && !ASSETS.some((a) => a.id === s.character!.characterId && a.status === 'available')) err(`video "${v.id}": karakter "${s.character.characterId}" tidak tersedia`);
    if (s.character?.expression || s.character?.gesture) warns.push(`video "${v.id}": ekspresi/gesture belum ada aset resmi — diabaikan`);
    if (s.voiceover && s.durationFrames === 'auto') err(`video "${v.id}": voice-over + durasi auto belum didukung (durasi audio tidak diukur)`);
    if (s.voiceover && !fs.existsSync(path.join(CP_ROOT, 'public', s.voiceover.file))) err(`video "${v.id}": file voice-over hilang ${s.voiceover.file}`);
    if (s.type === 'website-demo') {
      const c = CONTENT_REGISTRY.find((x) => x.id === v.topicId);
      const pid = s.pathId ?? c?.demoPaths[0];
      if (!NAVIGATION_PATHS.find((p) => p.id === pid && p.status === 'available')) err(`video "${v.id}": jalur demo "${pid}" tidak available`);
    }
  }
}

// 7. Hasil capture yang sudah ada: semua PNG di timeline harus ada.
const capRoot = path.join(CP_ROOT, 'public', 'capture');
if (fs.existsSync(capRoot)) {
  for (const pid of fs.readdirSync(capRoot)) for (const cid of fs.readdirSync(path.join(capRoot, pid))) {
    const dir = path.join(capRoot, pid, cid);
    const tl = path.join(dir, 'timeline.json');
    if (!fs.existsSync(tl)) { err(`capture ${pid}/${cid}: timeline.json hilang`); continue; }
    const t = JSON.parse(fs.readFileSync(tl, 'utf8')) as CaptureTimeline;
    for (const f of [t.initialShot, ...t.beats.map((b) => b.shot)]) if (!fs.existsSync(path.join(dir, f))) err(`capture ${pid}/${cid}: PNG hilang ${f}`);
    console.log(`  ✓ capture ${pid}/${cid}: ${t.beats.length} beat, semua PNG ada`);
  }
}

warns.forEach((w) => console.warn(`  ! ${w}`));
if (errors.length) { errors.forEach((e) => console.error(`  ✗ ${e}`)); console.error(`\n${errors.length} error`); process.exit(1); }
console.log(`\n✓ Mapping valid (${Object.keys(SELECTORS).length} selector, ${NAVIGATION_PATHS.length} jalur, ${CONTENT_REGISTRY.length} konten, ${ASSETS.length} aset, ${VIDEOS.length} video)`);
