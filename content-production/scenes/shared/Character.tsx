import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export interface CharacterProps {
  /** Path relatif terhadap public/ (hasil resolve asset-registry). */
  file: string;
  position?: 'bottom-right' | 'bottom-left';
}

export const Character: React.FC<CharacterProps> = ({ file, position = 'bottom-right' }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = spring({ frame: frame - 6, fps, config: { damping: 15, stiffness: 110 } });
  const size = Math.min(W, H) * 0.42;
  const bob = Math.sin(frame / 14) * 6;
  return (
    <Img
      src={staticFile(file)}
      style={{
        position: 'absolute', width: size, height: size, objectFit: 'contain', imageRendering: 'pixelated',
        bottom: (H > W ? 260 : 120) + bob, [position === 'bottom-right' ? 'right' : 'left']: 60,
        opacity: interpolate(t, [0, 1], [0, 1]), transform: `translateY(${(1 - t) * 120}px)`,
      }}
    />
  );
};
