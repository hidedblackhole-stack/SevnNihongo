import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Pecah bundle supaya (1) kode aplikasi yang sering berubah tidak ikut meng-invalidasi cache
// dependency & dataset besar (JSON puluhan MB), dan (2) browser mengunduh potongan secara paralel.
function manualChunks(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');

  if (normalized.includes('/node_modules/')) {
    if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalized)) return 'vendor-react';
    if (normalized.includes('/node_modules/@supabase/')) return 'vendor-supabase';
    if (/\/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(normalized)) return 'vendor-motion';
    if (normalized.includes('/node_modules/hanzi-writer')) return 'vendor-hanzi';
    if (normalized.includes('/node_modules/lucide-react/')) return 'vendor-icons';
    return 'vendor';
  }

  const json = normalized.match(/\/src\/data\/db\/([^/]+)\.json/);
  if (json) return `data-${json[1].replace(/_/g, '-')}`;
  if (normalized.includes('/src/data/tryouts/')) return 'data-tryouts';
  if (normalized.includes('/src/data/furiganaDictionary.json')) return 'data-furigana';
  if (normalized.includes('/src/data/world/') && normalized.endsWith('.json')) return 'data-world';
  return undefined;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Target proxy dev/preview. Bisa diganti lewat VITE_SUPABASE_URL tanpa mengubah kode.
  const supabaseTarget = env.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
  const supabaseProxy = {
    '/supabase-proxy': {
      target: supabaseTarget,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/supabase-proxy/, ''),
      secure: true,
    },
  };

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {manualChunks},
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: supabaseProxy,
    },
    preview: {
      proxy: supabaseProxy,
    },
  };
});
