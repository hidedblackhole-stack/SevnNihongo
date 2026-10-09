import type { VideoSpec } from '../mappings/types';

/** Definisi video: urutan scene + durasi. 'auto' = ikut timeline capture (atau voice-over bila ada). */
export const video: VideoSpec = {
  id: 'video-ta-hou-ga-ii',
  format: 'shorts-9-16',
  topicId: 'bunpou-ta-hou-ga-ii',
  scenes: [
    { type: 'intro', durationFrames: 90, character: { characterId: 'character-male-tier-3' }, subtitle: 'Kapan kita bilang "sebaiknya kamu ~"?' },
    { type: 'explanation', durationFrames: 210, character: { characterId: 'character-male-tier-3' }, subtitle: 'Kata kerja bentuk-た + ほうがいい = sebaiknya melakukan ~' },
    { type: 'website-demo', durationFrames: 'auto', subtitle: undefined },
    { type: 'examples', durationFrames: 240 },
    { type: 'outro', durationFrames: 90, character: { characterId: 'character-male-tier-3' } },
  ],
};
