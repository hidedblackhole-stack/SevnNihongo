import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../../config/design-tokens';
import { Subtitle } from '../shared/Subtitle';
import { Character, type CharacterProps } from '../shared/Character';

export interface ExplanationProps {
  /** 'hero' = judul pola besar (intro); 'detail' = rumus + arti + catatan. */
  mode: 'hero' | 'detail';
  title: string;
  level?: string;
  formula?: string;
  meaning?: string;
  note?: string;
  subtitle?: string;
  character?: CharacterProps;
}

const useIn = (delay: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 200 } });
};

const Pop: React.FC<{ delay: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay, children, style }) => {
  const t = useIn(delay);
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 40}px)`, ...style }}>{children}</div>;
};

export const ExplanationScene: React.FC<ExplanationProps> = ({ mode, title, level, formula, meaning, note, subtitle, character }) => {
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  return (
    <AbsoluteFill style={{ background: COLORS.base, fontFamily: FONTS.body, color: COLORS.text, padding: portrait ? '160px 72px' : '90px 120px' }}>
      <div style={{ position: 'absolute', inset: 36, border: `2px dashed ${COLORS.line}`, borderRadius: 40 }} />
      {mode === 'hero' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginTop: portrait ? 260 : 60, alignItems: 'flex-start' }}>
          <Pop delay={0}><span style={{ fontFamily: FONTS.mono, letterSpacing: 6, color: COLORS.textMuted, fontSize: 38 }}>POLA KALIMAT{level ? ` · JLPT ${level}` : ''}</span></Pop>
          <Pop delay={8}><div style={{ fontFamily: FONTS.jp, fontWeight: 700, fontSize: portrait ? 128 : 128, lineHeight: 1.1, color: COLORS.gold }}>{title}</div></Pop>
          {meaning && <Pop delay={20}><div style={{ fontFamily: FONTS.heading, fontSize: 64, color: COLORS.text }}>{meaning}</div></Pop>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40, marginTop: portrait ? 120 : 0 }}>
          <Pop delay={0}><div style={{ fontFamily: FONTS.jp, fontWeight: 700, fontSize: 120, color: COLORS.gold }}>{title}</div></Pop>
          {formula && (
            <Pop delay={10}>
              <div style={{ background: COLORS.inset, border: `2px solid ${COLORS.line}`, borderRadius: 28, padding: '36px 44px' }}>
                <div style={{ fontFamily: FONTS.mono, color: COLORS.indigo, fontSize: 32, letterSpacing: 4, marginBottom: 16 }}>RUMUS</div>
                <div style={{ fontFamily: FONTS.jp, fontSize: 54, fontWeight: 700, lineHeight: 1.35 }}>{formula}</div>
              </div>
            </Pop>
          )}
          {meaning && <Pop delay={22}><div style={{ fontFamily: FONTS.heading, fontSize: 70, color: COLORS.goldSoft }}>{meaning}</div></Pop>}
          {note && <Pop delay={34}><div style={{ fontSize: 40, lineHeight: 1.5, color: COLORS.textMuted }}>{note}</div></Pop>}
        </div>
      )}
      {character && <Character {...character} />}
      {subtitle && <Subtitle text={subtitle} />}
    </AbsoluteFill>
  );
};

