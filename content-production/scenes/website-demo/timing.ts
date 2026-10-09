// Perencana waktu murni (tanpa React) — dipakai Remotion DAN generate-video-data agar durasi 'auto' selalu sama.
import type { CaptureBeat } from '../../mappings/types';

export interface PlannedBeat {
  index: number;
  beat: CaptureBeat;
  start: number;
  /** Frame kursor bergerak menuju target sebelum aksi terjadi. */
  travel: number;
  end: number;
  /** Beat 'type' non-pertama: kursor sudah di input, hanya ketukan tombol. */
  isKeystroke: boolean;
}

const TRAVEL_CLICK = 20;
const TRAVEL_HIGHLIGHT = 14;

export function planBeats(beats: CaptureBeat[]): PlannedBeat[] {
  const out: PlannedBeat[] = [];
  let t = 0;
  beats.forEach((beat, index) => {
    const prev = beats[index - 1];
    const isKeystroke = beat.op === 'type' && prev?.op === 'type' && prev.stepId === beat.stepId;
    const travel = isKeystroke || beat.op === 'scroll' || beat.op === 'hold' ? 0
      : beat.op === 'highlight' ? TRAVEL_HIGHLIGHT : TRAVEL_CLICK;
    const end = t + travel + beat.holdFrames;
    out.push({ index, beat, start: t, travel, end, isKeystroke });
    t = end;
  });
  return out;
}

export const totalFrames = (beats: CaptureBeat[]) => {
  const p = planBeats(beats);
  return p.length ? p[p.length - 1].end : 0;
};
