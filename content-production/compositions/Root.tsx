import React from 'react';
import { Composition, staticFile } from 'remotion';
import type { ResolvedVideo } from '../mappings/types';
import { VideoFromConfig } from './VideoFromConfig';

/**
 * Satu composition generik: video apa pun = public/video-data/<videoId>.json (hasil `npm run generate`).
 * Menambah video tidak perlu mengubah file ini; ganti prop `videoId` di Studio atau lewat scripts/render.ts.
 */
export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={VideoFromConfig as unknown as React.FC<Record<string, unknown>>}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    defaultProps={{ videoId: 'video-ta-hou-ga-ii' } as Record<string, unknown>}
    calculateMetadata={async ({ props }) => {
      const video: ResolvedVideo = await (await fetch(staticFile(`video-data/${props.videoId}.json`))).json();
      return { durationInFrames: video.durationInFrames, fps: video.fps, width: video.width, height: video.height, props: { ...props, video } };
    }}
  />
);
