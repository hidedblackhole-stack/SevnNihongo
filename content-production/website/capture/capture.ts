// Capture deterministik interaksi website nyata: tiap langkah NavigationPath → PNG keadaan layar + bounding box target.
// Remotion kemudian menggambar kursor/zoom/highlight sendiri di atas PNG ini (render tidak bergantung jaringan/website).
//   npx tsx website/capture/capture.ts <contentId> [pathId]      env: SEVNQUEST_URL (default http://localhost:3000), CHROME_PATH
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page, type Locator } from 'playwright-core';
import { getContent } from '../../mappings/content-registry';
import { NAVIGATION_PATHS } from '../../mappings/navigation-map';
import type { CaptureBeat, CaptureTimeline, Rect, ResolvedTopic } from '../../mappings/types';
import { SELECTORS, type LocatorCtx } from '../selectors';
import { GENERATED, CP_ROOT, readJson, writeJson, fail } from '../../scripts/common';

export const VIEWPORT = { width: 432, height: 768, deviceScaleFactor: 2.5 }; // = 1080x1920 piksel

const APP_URL = process.env.SEVNQUEST_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const STEP_TIMEOUT = 8000;

/** Tunggu sampai dua screenshot berurutan identik (animasi selesai) — kondisi, bukan timeout buta. */
async function settle(page: Page, name: string): Promise<Buffer> {
  await page.evaluate(() => document.fonts.ready);
  let prev = await page.screenshot({ animations: 'disabled' });
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(120);
    const cur = await page.screenshot({ animations: 'disabled' });
    if (cur.equals(prev)) return cur;
    prev = cur;
  }
  // Ada animasi dekoratif tak berhenti (napas avatar di Home, orb di tab Rumus). PNG yang disimpan = aset final; peringatan saja.
  console.warn(`  ! ${name}: ada animasi dekoratif yang tak berhenti, memakai frame terakhir`);
  return prev;
}

async function rectOf(loc: Locator): Promise<Rect> {
  const b = await loc.boundingBox();
  if (!b) throw new Error('boundingBox kosong');
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}

export async function capture(contentId: string, pathId?: string) {
  const entry = getContent(contentId) ?? fail(`Konten tidak terdaftar: ${contentId}`);
  const navId = pathId ?? entry.demoPaths[0];
  const nav = NAVIGATION_PATHS.find((p) => p.id === navId) ?? fail(`Jalur tidak ada: ${navId}`);
  if (nav.status !== 'available') fail(`Jalur "${navId}" berstatus ${nav.status}: ${nav.note ?? ''}`);
  const topic = readJson<ResolvedTopic>(path.join(GENERATED, 'content', `${contentId}.json`));
  const ctx: LocatorCtx = { query: entry.query, entityTitle: topic.bunpou?.title };

  // generated/ = arsip + debug; public/capture = yang dibaca Remotion (staticFile).
  const outDirs = [path.join(GENERATED, 'capture', nav.id, contentId), path.join(CP_ROOT, 'public', 'capture', nav.id, contentId)];
  for (const d of outDirs) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT.width, height: VIEWPORT.height }, deviceScaleFactor: VIEWPORT.deviceScaleFactor,
    locale: 'id-ID', timezoneId: 'Asia/Jakarta', colorScheme: 'dark', reducedMotion: 'reduce',
  });
  const fixture = readJson<{ localStorage: Record<string, string> }>(path.join(CP_ROOT, 'website/fixtures/player-state.json'));
  await context.addInitScript((ls) => { for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v as string); }, fixture.localStorage);
  // Stabilizer: timer belajar di header berdetak tiap detik → bekukan teksnya agar frame deterministik.
  // (string, bukan fungsi: tsx menyisipkan helper __name yang tidak ada di browser)
  await context.addInitScript({ content: `(() => {
    const freeze = () => document.querySelectorAll('[title^="Waktu Belajar"] span').forEach((el) => { if (el.textContent !== '52m') el.textContent = '52m'; });
    new MutationObserver(freeze).observe(document, { childList: true, subtree: true, characterData: true });
  })();` });
  // Isolasi: hanya app lokal + font; tidak ada panggilan cloud/akun nyata.
  await context.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(host) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  await page.goto(APP_URL, { waitUntil: 'commit' });
  await page.addStyleTag({ content: '*{caret-color:transparent!important;animation:none!important;scroll-behavior:auto!important}' });
  await SELECTORS['nav-library'].locate(page, ctx).waitFor({ state: 'visible', timeout: 60000 });

  const save = async (name: string) => { const buf = await settle(page, name); for (const d of outDirs) fs.writeFileSync(path.join(d, name), buf); };
  await save('initial.png');

  const beats: CaptureBeat[] = [];
  let n = 0;
  for (const step of nav.steps) {
    const def = SELECTORS[step.selector] ?? fail(`Selector tidak terdaftar: ${step.selector} (langkah ${step.id})`);
    const loc = def.locate(page, ctx);
    const base = { stepId: step.id, op: step.op, caption: step.caption, zoom: step.zoom ?? 1, holdFrames: step.holdFrames ?? 12 };
    const waitFor = async () => {
      if (step.waitFor) await SELECTORS[step.waitFor].locate(page, ctx).waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
    };
    try {
      await loc.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
      await loc.scrollIntoViewIfNeeded();
      const rect = await rectOf(loc);
      if (step.op === 'type') {
        const text = (step.text ?? '').replace('$query', ctx.query);
        await loc.evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollBy(0, -80)); // sisakan header sticky
        const rect2 = await rectOf(loc);
        await loc.click();
        let typed = '';
        for (const ch of text) {
          await page.keyboard.insertText(ch); // karakter Jepang apa adanya, tanpa IME
          typed += ch;
          const shot = `${String(++n).padStart(2, '0')}-${step.id}-${typed.length}.png`;
          await save(shot);
          beats.push({ ...base, shot, rect: rect2, typed, holdFrames: 3, caption: typed.length === 1 ? base.caption : undefined });
        }
        await waitFor();
        // Beat terakhir: hasil pencarian sudah muncul.
        const shot = `${String(++n).padStart(2, '0')}-${step.id}-results.png`;
        await save(shot);
        beats.push({ ...base, shot, rect: rect2, typed: text, caption: undefined });
        continue;
      }
      if (step.op === 'scroll') {
        await loc.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        const r = await rectOf(loc);
        const shot = `${String(++n).padStart(2, '0')}-${step.id}.png`;
        await save(shot);
        beats.push({ ...base, shot, rect: r });
        continue;
      }
      if (step.op === 'click') await loc.click();
      await waitFor();
      // Rect dihitung ulang setelah aksi (layout bisa bergeser, mis. highlight setelah ganti tab).
      const after = step.op === 'click' ? rect : await rectOf(loc);
      const shot = `${String(++n).padStart(2, '0')}-${step.id}.png`;
      await save(shot);
      beats.push({ ...base, shot, rect: after });
    } catch (e) {
      const dbg = path.join(outDirs[0], `FAILED-${step.id}.png`);
      await page.screenshot({ path: dbg }).catch(() => {});
      await browser.close();
      fail(`Langkah "${step.id}" gagal (selector "${step.selector}": ${def.description}). Cek ${def.anchor.file}. ${(e as Error).message.split('\n')[0]} — screenshot: ${dbg}`);
    }
  }
  await browser.close();

  const timeline: CaptureTimeline = { mappingId: nav.id, contentId, viewport: VIEWPORT, initialShot: 'initial.png', beats, capturedAt: new Date().toISOString(), appUrl: APP_URL };
  for (const d of outDirs) writeJson(path.join(d, 'timeline.json'), timeline);
  console.log(`✓ capture ${nav.id}/${contentId}: ${beats.length} beat → ${outDirs[1]}`);
}

if (process.argv[1]?.endsWith('capture.ts')) {
  const [contentId, pathId] = process.argv.slice(2);
  if (!contentId) fail('Pemakaian: tsx website/capture/capture.ts <contentId> [pathId]');
  await capture(contentId, pathId);
}
