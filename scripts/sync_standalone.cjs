const fs = require('fs');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..', 'dist');
const targetDir = path.resolve('c:/project/NihongoQuest_Standalone');

if (!fs.existsSync(sourceDir)) {
  console.error('❌ Folder dist tidak ditemukan! Jalankan "npm run build" terlebih dahulu.');
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Memperbarui folder produk jadi di:', targetDir);
copyDirRecursive(sourceDir, targetDir);
console.log('✅ SUKSES: NihongoQuest_Standalone telah disinkronkan dengan build terbaru!\n');
