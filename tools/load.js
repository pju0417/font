/* Node 도구들이 브라우저와 같은 순서로 모듈을 올리게 해 준다.
 * index.html 의 <script> 순서와 맞아야 한다. */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

module.exports = function load(extra) {
  ['hangul', 'passages'].forEach(m => require(path.join(SRC, m + '.js')));
  // 활동지 콘텐츠 (파일 이름 순서는 상관없다. id 가 겹치면 passages.js 가 막는다)
  fs.readdirSync(path.join(SRC, 'data'))
    .filter(f => f.endsWith('.js')).sort()
    .forEach(f => require(path.join(SRC, 'data', f)));
  (extra || ['charset', 'layout', 'trace', 'ttf', 'fontbuild'])
    .forEach(m => require(path.join(SRC, m + '.js')));
  return globalThis.HF;
};
