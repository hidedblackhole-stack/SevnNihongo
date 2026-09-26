// Standalone Zero-Dependency Server for Nihongo Quest
// Run with: node serve.js (or double-click Jalankan_Nihongo_Quest.bat)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 4173;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let decodedUrl = '/';
  try {
    decodedUrl = decodeURI(req.url.split('?')[0]);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('400 Bad Request');
    return;
  }

  // Proxy /supabase-proxy requests to Supabase directly
  if (req.url && req.url.startsWith('/supabase-proxy')) {
    const https = require('https');
    const targetPath = req.url.replace(/^\/supabase-proxy/, '');
    const options = {
      hostname: 'iokhdhqnpslpwsxspvaj.supabase.co',
      port: 443,
      path: targetPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: 'iokhdhqnpslpwsxspvaj.supabase.co'
      }
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    });
    req.pipe(proxyReq, { end: true });
    return;
  }

  // Prevent Path Traversal
  const cleanPath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.resolve(ROOT, cleanPath === '.' || cleanPath === '/' || cleanPath === '\\' ? 'index.html' : '.' + path.sep + cleanPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback
      filePath = path.join(ROOT, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
      });
      res.end(content);
    });
  });
});

const os = require('os');

function getLocalIp() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.')) {
          return net.address;
        }
      }
    }
  } catch (_) {}
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const url = `http://localhost:${PORT}`;
  const lanIp = getLocalIp();
  const lanUrl = lanIp !== 'localhost' ? `http://${lanIp}:${PORT}` : null;
  console.log('========================================================');
  console.log('  🏮 NIHONGO QUEST - STANDALONE RUNNER');
  console.log(`  PC Lokal:  ${url}`);
  if (lanUrl) {
    console.log(`  Mobile/HP: ${lanUrl} (Buka URL ini di browser HP)`);
  }
  console.log('  Tekan Ctrl + C di jendela ini untuk menghentikan server');
  console.log('========================================================\n');

  // Buka browser secara otomatis (Cross-platform)
  const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    exec(`${startCmd} ${url}`);
  } catch (_) {}
});
