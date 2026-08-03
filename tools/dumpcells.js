/* 칸 규격을 JSON 으로 뽑아 준다 (rendercells.py 가 이걸 보고 가짜 손글씨를 그린다).
 *   node tools/dumpcells.js full > tools/cells.json
 */
'use strict';
const path = require('path');
const HF = require('./load')(['charset', 'layout']);

const scope = process.argv[2] || 'full';
const S = 1.4;                       // imageproc 의 WARP_SCALE 과 같아야 한다
const layout = HF.layout.build(scope);
const cells = [];

layout.pages.forEach(page => page.cells.forEach(cell => {
  cells.push({
    key: cell.key, kind: cell.kind, form: cell.form || null,
    unicode: cell.unicode || null, hint: cell.hint,
    w: Math.round(cell.writeRect[2] * S),
    h: Math.round(cell.writeRect[3] * S),
    baselineLocal: (cell.baselineY - cell.writeRect[1]) * S,
    guide: cell.guide || null,
    // 안내 글자 크기는 '칸 높이' 기준이라 '필기 영역 높이' 기준으로 바꿔 준다
    latinHintRatio: 0.84 * cell.rect[3] / cell.writeRect[3]
  });
}));

process.stdout.write(JSON.stringify({ scope, scale: S, cells }, null, 1));
