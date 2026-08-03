/* 브라우저 없이 엔진을 검증한다.
 *   node tools/selftest.js [out.ttf]
 * 손글씨 대신 규칙적으로 만든 가짜 획으로 칸을 채워 폰트를 만들어 본다.
 * 만들어진 .ttf 는 fontTools 로 다시 열어 확인한다(tools/validate.py).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const HF = require('./load')();

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* 굵기 있는 선을 원반을 이어 붙여 그린다 */
function strokeMask(w, h, key) {
  const mask = new Uint8Array(w * h);
  let seed = hash(key);
  const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519) >>> 0) / 4294967296);

  const n = 3 + Math.floor(rnd() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push([w * (0.18 + rnd() * 0.64), h * (0.18 + rnd() * 0.64)]);
  }
  const r = Math.max(3, Math.round(Math.min(w, h) * 0.055));

  const disc = (cx, cy) => {
    for (let y = Math.max(0, cy - r | 0); y <= Math.min(h - 1, cy + r | 0); y++) {
      for (let x = Math.max(0, cx - r | 0); x <= Math.min(w - 1, cx + r | 0); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) mask[y * w + x] = 1;
      }
    }
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) disc(x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps);
  }
  return mask;
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
  const scope = 'full';
  const layout = HF.layout.build(scope);
  const S = 1.4;
  const collected = {};
  let ink = 0;

  layout.pages.forEach(page => {
    page.cells.forEach(cell => {
      const w = Math.round(cell.writeRect[2] * S);
      const h = Math.round(cell.writeRect[3] * S);
      const mask = strokeMask(w, h, cell.key);
      const bbox = inkBBox(mask, w, h);
      let cellInk = 0;
      for (let i = 0; i < mask.length; i++) cellInk += mask[i];
      ink += cellInk;
      // 앱과 같은 규칙: 같은 글자가 여러 칸에 나오면 진한 쪽을 남긴다
      // (기본 시트 칸이 활동지 칸보다 커서 보통 기본 시트가 이긴다)
      const prev = collected[cell.key];
      if (prev && prev.inkCount >= cellInk) return;
      collected[cell.key] = {
        inkCount: cellInk,
        key: cell.key, kind: cell.kind, form: cell.form, idx: cell.idx,
        unicode: cell.unicode, hint: cell.hint,
        mask, w, h, bbox, ink: 1, status: 'ok',
        baselineLocal: (cell.baselineY - cell.writeRect[1]) * S,
        bandHeight: (cell.band || cell.writeRect[3]) * S
      };
    });
  });

  console.log(`문자셋: ${scope} · ${layout.totalCells}칸 · ${layout.pages.length}쪽`);
  const t0 = Date.now();
  const res = HF.fontbuild.build(collected, {
    familyName: 'Selftest Hand', familyNameKo: '자체검사손글씨',
    styleName: 'Regular', version: '1.000'
  });
  const ms = Date.now() - t0;

  const r = res.report;
  console.log(`라틴 ${r.latin}자 · 자모 ${r.jamo}개 · 한글 음절 ${r.syllables}자`);
  console.log(`글리프 ${r.glyphCount}개 · ${(r.byteLength / 1024).toFixed(0)} KB · ${ms}ms`);
  if (r.missing.length) console.log('빠진 자모:', r.missing.join(' '));
  if (r.skipped.length) console.log('건너뛴 칸:', r.skipped.length);

  const out = process.argv[2] || path.join(__dirname, 'selftest-out.ttf');
  fs.writeFileSync(out, Buffer.from(res.ttf));
  console.log('저장:', out);
}

main();
