/* rendercells.py 가 만든 마스크 묶음으로 폰트를 만든다.
 *   node tools/buildfromcells.js tools/cells.json tools/cells.bin out.ttf
 */
'use strict';
const fs = require('fs');
const path = require('path');
const HF = require('./load')();

function readCells(binPath) {
  const buf = fs.readFileSync(binPath);
  const n = buf.readUInt32LE(0);
  let o = 4;
  const out = {};
  for (let i = 0; i < n; i++) {
    const klen = buf.readUInt16LE(o); o += 2;
    const key = buf.toString('utf8', o, o + klen); o += klen;
    const w = buf.readUInt16LE(o); o += 2;
    const h = buf.readUInt16LE(o); o += 2;
    out[key] = { w, h, mask: new Uint8Array(buf.subarray(o, o + w * h)) };
    o += w * h;
  }
  return out;
}

function inkBBox(mask, w, h) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function main() {
  const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const bin = readCells(process.argv[3]);
  const out = process.argv[4] || path.join(__dirname, 'realtest-out.ttf');

  const collected = {};
  let empty = 0;
  spec.cells.forEach(cell => {
    const b = bin[cell.key];
    if (!b) return;
    const bbox = inkBBox(b.mask, b.w, b.h);
    if (!bbox) { empty++; return; }
    collected[cell.key] = {
      key: cell.key, kind: cell.kind, form: cell.form, unicode: cell.unicode,
      hint: cell.hint, mask: b.mask, w: b.w, h: b.h, bbox,
      ink: 1, status: 'ok', baselineLocal: cell.baselineLocal
    };
  });

  const t0 = Date.now();
  const res = HF.fontbuild.build(collected, {
    familyName: 'Real Test Hand', familyNameKo: '실제시험손글씨'
  });
  const r = res.report;
  let pts = 0, maxPts = 0;
  Object.values(r.glyphs).forEach(g => {
    if (g.points) { pts += g.points; maxPts = Math.max(maxPts, g.points); }
  });
  console.log(`빈 칸 ${empty} · 라틴 ${r.latin} · 자모 ${r.jamo} · 한글 ${r.syllables}`);
  console.log(`글리프 ${r.glyphCount} · ${(r.byteLength / 1024).toFixed(0)} KB · ${Date.now() - t0}ms`);
  console.log(`윤곽선 점: 평균 ${(pts / (r.latin + r.jamo)).toFixed(0)} · 최대 ${maxPts}`);
  fs.writeFileSync(out, Buffer.from(res.ttf));
  console.log('저장:', out);
}

main();
