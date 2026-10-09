import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { ResolvedVideo, ResolvedScene } from '../mappings/types';
import { ExplanationScene, type ExplanationProps } from '../scenes/explanation/ExplanationScene';
import { WebsiteDemoScene, type WebsiteDemoProps } from '../scenes/website-demo/WebsiteDemoScene';
import { ExampleScene, type ExampleSceneProps } from '../scenes/practice/ExampleScene';
import { OutroScene } from '../scenes/outro/OutroScene';

const FADE = 6;

const SceneSwitch: React.FC<{ scene: ResolvedScene }> = ({ scene }) => {
  const p = scene.props as never;
  switch (scene.type) {
    case 'intro':
    case 'explanation': return <ExplanationScene {...(p as ExplanationProps)} />;
    case 'website-demo': return <WebsiteDemoScene {...(p as WebsiteDemoProps)} />;
    case 'examples': return <ExampleScene {...(p as ExampleSceneProps)} />;
    case 'outro': return <OutroScene {...(p as React.ComponentProps<typeof OutroScene>)} />;
  }
};

/** Transisi sederhana: fade in/out di batas scene (tanpa menggeser durasi). */
const Faded: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, FADE], [0, 1], { extrapolateRight: 'clamp' }), interpolate(f, [duration - FADE, duration], [1, 0], { extrapolateLeft: 'clamp' }));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const VideoFromConfig: React.FC<{ video: ResolvedVideo }> = ({ video }) => (
  <AbsoluteFill style={{ background: '#12151d' }}>
    {video.scenes.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.durationFrames} name={s.type}>
        <Faded duration={s.durationFrames}><SceneSwitch scene={s} /></Faded>
        {s.voiceover && <Sequence from={s.voiceover.startFrame ?? 0}><Audio src={staticFile(s.voiceover.file)} /></Sequence>}
      </Sequence>
    ))}
  </AbsoluteFill>
);
