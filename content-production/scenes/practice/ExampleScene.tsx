import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../../config/design-tokens';

export interface ExampleSceneProps {
  examples: { japanese: string; meaningId: string }[];
  /** Potongan teks yang disorot emas di setiap kalimat (mis. pola). */
  highlight?: string;
}

const Sentence: React.FC<{ text: string; highlight?: string }> = ({ text, highlight }) => {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (at < 0 || !highlight) return <>{text}</>;
  return <>{text.slice(0, at)}<span style={{ color: COLORS.gold }}>{highlight}</span>{text.slice(at + highlight.length)}</>;
};

/** Menampilkan contoh satu per satu; durasi dibagi rata. */
export const ExampleScene: React.FC<ExampleSceneProps> = ({ examples, highlight }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width: W, height: H } = useVideoConfig();
  const per = Math.floor(durationInFrames / Math.max(1, examples.length));
  const idx = Math.min(examples.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const ex = examples[idx];
  const t = spring({ frame: local, fps, config: { damping: 200 } });
  const out = interpolate(local, [per - 8, per], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const portrait = H > W;
  return (
    <AbsoluteFill style={{ background: COLORS.base, justifyContent: 'center', padding: '0 80px', color: COLORS.text, fontFamily: FONTS.body }}>
      <div style={{ position: 'absolute', inset: 36, border: `2px dashed ${COLORS.line}`, borderRadius: 40 }} />
      <div style={{ opacity: t * out, transform: `translateY(${(1 - t) * 40}px)`, display: 'flex', flexDirection: 'column', gap: 48 }}>
        <div style={{ fontFamily: FONTS.mono, color: COLORS.textMuted, fontSize: 40, letterSpacing: 6 }}>例 {idx + 1} / {examples.length}</div>
        <div style={{ fontFamily: FONTS.jp, fontWeight: 700, fontSize: portrait ? 86 : 80, lineHeight: 1.45 }}><Sentence text={ex.japanese} highlight={highlight} /></div>
        <div style={{ fontSize: 54, lineHeight: 1.45, color: COLORS.goldSoft, fontFamily: FONTS.heading }}>{ex.meaningId}</div>
      </div>
    </AbsoluteFill>
  );
};
