import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCaptionLines } from './captionAnalysis';

const lines = [
  { startMs: 1000, endMs: 4000, text: '昨日、友達と映画を見に行きました。' },
  { startMs: 4000, endMs: 8000, text: '毎日、友達と話せるようになりたい。' },
  { startMs: 8000, endMs: 9000, text: '友達と好きな本を読む' },
];

test('analyzeCaptionLines: satu hasil per baris, indeks dan waktu terjaga', () => {
  const a = analyzeCaptionLines(lines);
  assert.equal(a.perLine.length, 3);
  a.perLine.forEach((l, i) => {
    assert.equal(l.index, i);
    assert.equal(l.startMs, lines[i].startMs);
    assert.equal(l.text, lines[i].text);
  });
});

test('analyzeCaptionLines: kata yang sama di banyak baris dirangkum dengan indeks barisnya', () => {
  const a = analyzeCaptionLines(lines);
  const tomodachi = a.vocab.find(v => v.item.word === '友達');
  assert.ok(tomodachi, '友達 harus dikenali');
  assert.deepEqual(tomodachi.lines, [0, 1, 2]);
  // urutan = kemunculan pertama di video
  const firstLines = a.vocab.map(v => v.lines[0]);
  assert.deepEqual(firstLines, [...firstLines].sort((x, y) => x - y));
});

test('analyzeCaptionLines: pola yang span-nya satu kata utuh dibuang', () => {
  const a = analyzeCaptionLines([{ startMs: 0, endMs: 1000, text: '好きな本' }]);
  assert.equal(a.perLine[0].grammar.length, 0);
});

test('analyzeCaptionLines: baris kosong aman', () => {
  const a = analyzeCaptionLines([{ startMs: 0, endMs: 1, text: '' }]);
  assert.deepEqual(a.perLine[0].words, []);
  assert.deepEqual(a.vocab, []);
});
