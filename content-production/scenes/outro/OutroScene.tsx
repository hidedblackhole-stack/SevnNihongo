import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../../config/design-tokens';
import { Character, type CharacterProps } from '../shared/Character';

export const OutroScene: React.FC<{ headline: string; sub: string; character?: CharacterProps }> = ({ headline, sub, character }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: COLORS.base, color: COLORS.text, justifyContent: 'center', padding: '0 80px', fontFamily: FONTS.body }}>
      <div style={{ position: 'absolute', inset: 36, border: `2px dashed ${COLORS.line}`, borderRadius: 40 }} />
      <div style={{ opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>
        <div style={{ fontFamily: FONTS.heading, fontSize: 96, fontWeight: 700, color: COLORS.gold, lineHeight: 1.2 }}>{headline}</div>
        <div style={{ marginTop: 36, fontSize: 52, color: COLORS.textMuted, lineHeight: 1.45 }}>{sub}</div>
      </div>
      {character && <Character {...character} />}
    </AbsoluteFill>
  );
};
