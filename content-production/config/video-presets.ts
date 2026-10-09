import type { VideoFormat } from '../mappings/types';

export const FPS = 30;
export const FORMATS: Record<VideoFormat, { width: number; height: number }> = {
  'shorts-9-16': { width: 1080, height: 1920 },
  'landscape-16-9': { width: 1920, height: 1080 },
};
