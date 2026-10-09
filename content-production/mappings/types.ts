// Tipe inti sistem produksi konten. Sengaja hanya tipe: tidak ada data pembelajaran di sini.

export type ContentType = 'bunpou' | 'kotoba' | 'kanji' | 'comparison' | 'feature';
export type Availability = 'available' | 'future';

/** Sumber data asli SevnQuest. `dataset` menentukan resolver mana yang dipakai. */
export interface ContentSource {
  dataset: 'bunpou' | 'kotoba' | 'kanji';
  /** Teks yang dicari lewat engine pencarian universal (src/engine/search). */
  lookupKey: string;
  /** Opsional: kunci id kanonik agar hasil tidak bergantung pada ranking pencarian. */
  expectedEntityId?: string;
}

export type SceneType = 'intro' | 'explanation' | 'website-demo' | 'examples' | 'outro';

export interface ContentEntry {
  id: string;
  type: ContentType;
  /** Teks yang diketik di kolom pencarian Library pada video. */
  query: string;
  source: ContentSource;
  /** Id jalur navigasi (navigation-map), urut dari yang paling relevan. */
  demoPaths: string[];
  sceneSequence: SceneType[];
}

// ---------- Website ----------

/** Selector bernama. `anchor` = bukti di source repo bahwa elemen itu ada (dicek validate-mappings). */
export interface SelectorDef {
  id: string;
  description: string;
  anchor: { file: string; contains: string };
}

export type StepOp = 'click' | 'type' | 'scroll' | 'highlight' | 'hold';

export interface NavStep {
  id: string;
  op: StepOp;
  selector: string;
  /** Untuk op 'type': '$query' diganti query konten. */
  text?: string;
  /** Selector yang harus terlihat setelah langkah ini (kondisi tunggu, bukan timeout). */
  waitFor?: string;
  /** Teks callout di video. */
  caption?: string;
  /** Skala kamera saat langkah ini (1 = tanpa zoom). */
  zoom?: number;
  /** Lama tahan pada akhir langkah (frame @30fps). */
  holdFrames?: number;
}

export interface NavigationPath {
  id: string;
  label: string;
  status: Availability;
  /** Jika future: alasan / apa yang belum ada di website. */
  note?: string;
  appliesTo: ContentType[];
  steps: NavStep[];
}

export interface PageEntry {
  id: string;
  label: string;
  status: Availability;
  /** Cara membuka halaman: id selector navigasi, atau null bila halaman awal. */
  openVia: string | null;
  sourceFile: string;
  note?: string;
}

// ---------- Aset ----------

export interface AssetEntry {
  id: string;
  kind: 'character' | 'expression' | 'gesture' | 'background' | 'icon' | 'audio' | 'overlay';
  status: Availability;
  /** Path relatif terhadap root repo SevnQuest. Wajib ada bila status 'available'. */
  file?: string;
  variant?: Record<string, string>;
  width?: number;
  height?: number;
  transparent?: boolean;
  source: string;
  usage: string;
}

// ---------- Hasil resolve & capture ----------

export interface ResolvedBunpou {
  entityId: string;
  title: string;
  level: string;
  formula: string;
  meaningId: string;
  meaningEn: string;
  explanation: string;
  examples: { japanese: string; reading: string; meaningId: string }[];
  matchType: string;
  score: number;
}

export interface ResolvedTopic {
  contentId: string;
  type: ContentType;
  query: string;
  bunpou?: ResolvedBunpou;
}

export interface Rect { x: number; y: number; w: number; h: number }

/** Satu "beat" interaksi hasil capture: keadaan layar SETELAH aksi dilakukan. */
export interface CaptureBeat {
  stepId: string;
  op: StepOp;
  /** Nama file PNG relatif terhadap folder capture. */
  shot: string;
  /** Bounding box target (piksel CSS viewport). */
  rect: Rect;
  caption?: string;
  zoom: number;
  holdFrames: number;
  /** Untuk op 'type': teks yang sudah terketik pada beat ini. */
  typed?: string;
}

export interface CaptureTimeline {
  mappingId: string;
  contentId: string;
  viewport: { width: number; height: number; deviceScaleFactor: number };
  initialShot: string;
  beats: CaptureBeat[];
  capturedAt: string;
  appUrl: string;
}

// ---------- Video ----------

export type VideoFormat = 'shorts-9-16' | 'landscape-16-9';

export interface SceneSpec {
  type: SceneType;
  /** Angka tetap, atau 'auto' (dihitung dari voice-over / timeline capture). */
  durationFrames: number | 'auto';
  /** Untuk website-demo: id jalur navigasi (default: demoPaths[0] konten). */
  pathId?: string;
  /** Untuk narasi/subtitle: teks ditampilkan; voiceover opsional ber-timestamp. */
  subtitle?: string;
  voiceover?: { file: string; startFrame?: number };
  character?: { characterId: string; expression?: string; gesture?: string; position?: 'bottom-right' | 'bottom-left' };
}

export interface VideoSpec {
  id: string;
  format: VideoFormat;
  topicId: string;
  scenes: SceneSpec[];
}

// ---------- Hasil generate (dibaca Remotion dari public/video-data/<id>.json) ----------

export interface ResolvedScene {
  type: SceneType;
  from: number;
  durationFrames: number;
  /** Props siap pakai untuk komponen scene (dibangun oleh template). */
  props: Record<string, unknown>;
  voiceover?: { file: string; startFrame?: number };
}

export interface ResolvedVideo {
  id: string;
  format: VideoFormat;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  topicId: string;
  scenes: ResolvedScene[];
}
