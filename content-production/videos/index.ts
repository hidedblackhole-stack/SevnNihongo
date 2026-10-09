import type { VideoSpec } from '../mappings/types';
import { video as taHouGaIi } from './video-ta-hou-ga-ii';

export const VIDEOS: VideoSpec[] = [taHouGaIi];
export const getVideo = (id: string) => VIDEOS.find((v) => v.id === id);
