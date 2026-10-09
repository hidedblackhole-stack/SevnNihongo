// Token visual mengikuti DESIGN.md / src/index.css aplikasi (permukaan solid gelap, aksen emas & indigo; tanpa gradient).
export const COLORS = {
  base: '#12151d',
  card: '#1f242f',
  elevated: '#2a3040',
  inset: '#191d26',
  line: '#3a4256',
  text: '#f3ede1',
  textMuted: '#a7adbd',
  gold: '#f0be52',
  goldSoft: '#fde8a8',
  indigo: '#7f95e8',
} as const;

export const FONTS = {
  jp: '"Noto Sans JP", "Yu Gothic", "Hiragino Sans", sans-serif',
  heading: '"Noto Serif JP", "Plus Jakarta Sans", Georgia, serif',
  body: '"Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", Consolas, monospace',
} as const;
