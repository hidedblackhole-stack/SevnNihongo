import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CaptureTimeline, Rect } from '../../mappings/types';
import { COLORS, FONTS } from '../../config/design-tokens';
import { planBeats, type PlannedBeat } from './timing';

export interface WebsiteDemoProps {
  /** Folder aset capture relatif terhadap public/ (berisi PNG + timeline.json). */
  dir: string;
  timeline: CaptureTimeline;
}

interface Cam { cx: number; cy: number; s: number }
interface Pt { x: number; y: number }

const CAM_FRAMES = 24;
const ease = Easing.inOut(Easing.cubic);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Titik tujuan kursor untuk sebuah beat; beat tanpa gerak kursor mewarisi posisi sebelumnya. */
function cursorTarget(p: PlannedBeat, prev: Pt): Pt {
  if (p.isKeystroke || p.beat.op === 'scroll' || p.beat.op === 'hold') return prev;
  const r = p.beat.rect;
  return p.beat.op === 'type' ? { x: r.x + Math.min(r.w * 0.3, 120), y: r.y + r.h / 2 } : center(r);
}

const camFor = (p: PlannedBeat, vw: number, vh: number): Cam =>
  p.beat.zoom > 1 ? { ...(() => { const c = center(p.beat.rect); return { cx: c.x, cy: c.y }; })(), s: p.beat.zoom } : { cx: vw / 2, cy: vh / 2, s: 1 };

const Cursor: React.FC<{ s: number }> = ({ s }) => (
  <svg width={46 / s} height={46 / s} viewBox="0 0 24 24" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.55))' }}>
    <path d="M3 2 L3 19 L7.6 14.8 L10.6 21.5 L13.4 20.3 L10.4 13.7 L16.8 13.4 Z" fill="#fff" stroke="#12151d" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export const WebsiteDemoScene: React.FC<WebsiteDemoProps> = ({ dir, timeline }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const { width: vw, height: vh } = timeline.viewport;
  const planned = React.useMemo(() => planBeats(timeline.beats), [timeline]);
  const src = (name: string) => staticFile(`${dir}/${name}`);

  // Skala dari piksel CSS viewport capture ke kanvas video (letterbox bila rasio berbeda).
  const k = Math.min(W / vw, H / vh);
  const frameW = vw * k;
  const frameH = vh * k;
  const offX = (W - frameW) / 2;
  const offY = (H - frameH) / 2;

  const i = Math.max(0, planned.findIndex((p) => frame < p.end));
  const idx = planned.findIndex((p) => frame < p.end) === -1 ? planned.length - 1 : i;
  const p = planned[idx];

  // Posisi kursor & kamera per beat dihitung berurutan (murni dari data, deterministik).
  let cursorPrev: Pt = { x: vw / 2, y: vh * 0.82 };
  let camPrev: Cam = { cx: vw / 2, cy: vh / 2, s: 1 };
  let cursor = cursorPrev;
  let cam = camPrev;
  for (let j = 0; j <= idx; j++) {
    const pj = planned[j];
    const target = cursorTarget(pj, cursorPrev);
    const tCur = pj.travel > 0 ? ease(Math.min(1, Math.max(0, (frame - pj.start) / pj.travel))) : 1;
    const camTarget = camFor(pj, vw, vh);
    const tCam = ease(Math.min(1, Math.max(0, (frame - pj.start) / CAM_FRAMES)));
    if (j === idx) {
      cursor = { x: lerp(cursorPrev.x, target.x, tCur), y: lerp(cursorPrev.y, target.y, tCur) };
      cam = { cx: lerp(camPrev.cx, camTarget.cx, tCam), cy: lerp(camPrev.cy, camTarget.cy, tCam), s: lerp(camPrev.s, camTarget.s, tCam) };
    }
    cursorPrev = target;
    camPrev = camTarget;
  }

  const x0 = Math.min(Math.max(cam.cx - vw / (2 * cam.s), 0), vw - vw / cam.s);
  const y0 = Math.min(Math.max(cam.cy - vh / (2 * cam.s), 0), vh - vh / cam.s);

  const actionFrame = p.start + p.travel;
  const prevShot = idx > 0 ? planned[idx - 1].beat.shot : timeline.initialShot;
  const fade = interpolate(frame, [actionFrame, actionFrame + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const isClickLike = (p.beat.op === 'click' || (p.beat.op === 'type' && !p.isKeystroke));
  const sinceAction = frame - actionFrame;

  const caption = [...planned.slice(0, idx + 1)].reverse().find((q) => q.beat.caption)?.beat.caption;
  const captionIn = spring({ frame: frame - (p.start + 2), fps, config: { damping: 200 } });

  const hl = p.beat.op === 'highlight' && frame >= actionFrame ? spring({ frame: frame - actionFrame, fps, config: { damping: 18, stiffness: 140 } }) : 0;
  const pulse = 0.5 + 0.5 * Math.sin((frame - actionFrame) / 6);

  return (
    <AbsoluteFill style={{ background: COLORS.base }}>
      <div style={{ position: 'absolute', left: offX, top: offY, width: frameW, height: frameH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: frameW, height: frameH, transformOrigin: '0 0', transform: `scale(${cam.s}) translate(${-x0 * k}px, ${-y0 * k}px)` }}>
          <Img src={src(prevShot)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <Img src={src(p.beat.shot)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: fade }} />

          {hl > 0 && (
            <div style={{
              position: 'absolute', left: p.beat.rect.x * k - 8, top: p.beat.rect.y * k - 8, width: p.beat.rect.w * k + 16, height: p.beat.rect.h * k + 16,
              borderRadius: 26, border: `${4 / cam.s}px solid ${COLORS.gold}`, opacity: hl,
              boxShadow: `0 0 0 9999px rgba(8,10,16,${0.5 * hl}), 0 0 ${24 * pulse}px ${COLORS.gold}`,
            }} />
          )}

          {isClickLike && sinceAction >= 0 && sinceAction < 16 && (
            <div style={{
              position: 'absolute', left: cursor.x * k, top: cursor.y * k, width: 0, height: 0,
            }}>
              <div style={{
                position: 'absolute', width: 90 / cam.s, height: 90 / cam.s, marginLeft: -45 / cam.s, marginTop: -45 / cam.s, borderRadius: '50%',
                border: `${4 / cam.s}px solid ${COLORS.goldSoft}`, opacity: 1 - sinceAction / 16, transform: `scale(${0.3 + sinceAction / 16})`,
              }} />
            </div>
          )}

          <div style={{ position: 'absolute', left: cursor.x * k, top: cursor.y * k, width: 0, height: 0 }}>
            <Cursor s={cam.s} />
          </div>
        </div>
      </div>

      {caption && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: H > W ? 56 : H - 120, display: 'flex', justifyContent: 'center', opacity: captionIn, transform: `translateY(${(1 - captionIn) * -16}px)` }}>
          <div style={{
            background: COLORS.card, border: `2px solid ${COLORS.gold}`, color: COLORS.goldSoft, borderRadius: 22,
            padding: '16px 36px', fontFamily: FONTS.heading, fontWeight: 700, fontSize: H > W ? 44 : 40, boxShadow: '0 8px 20px rgba(0,0,0,.45)',
          }}>
            {caption}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
