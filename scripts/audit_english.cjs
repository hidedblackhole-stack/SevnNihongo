const fs = require('fs');
const path = require('path');

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') scanDir(full);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.json')) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  if (filePath.includes('furigana') || filePath.includes('kanaStroke')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  const matches = [];
  const lines = content.split('\n');
  const englishRegex = /(['"`])((?:Noun|Verb|Adjective|This pattern|used to|expresses|indicates|shows|means|when|because|although|in order to|instead of)[^'"`]*)\1/i;

  lines.forEach((line, idx) => {
    const match = line.match(englishRegex);
    if (match) {
      matches.push({ line: idx + 1, text: match[2].slice(0, 80) });
    }
  });

  if (matches.length > 0) {
    console.log(filePath + ' (' + matches.length + ' matches):');
    matches.slice(0, 3).forEach(m => console.log('  L' + m.line + ': ' + m.text));
  }
}

scanDir('src');
