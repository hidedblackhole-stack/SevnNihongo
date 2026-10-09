import React from 'react';
import { useVideoConfig } from 'remotion';
import { COLORS, FONTS } from '../../config/design-tokens';

export const Subtitle: React.FC<{ text: string }> = ({ text }) => {
  const { width: W, height: H } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 72, right: 72, bottom: H > W ? 150 : 60, display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(18,21,29,.92)', border: `2px solid ${COLORS.line}`, color: COLORS.text, fontFamily: FONTS.body, fontWeight: 600, fontSize: 42, lineHeight: 1.4, padding: '18px 34px', borderRadius: 24, textAlign: 'center' }}>
        {text}
      </div>
    </div>
  );
};
