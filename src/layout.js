/* 양식(종이)의 좌표 정의.
 *
 * 이 파일이 이 프로젝트의 중심이다. 양식을 "그리는 쪽"과 사진에서 글자를
 * "잘라내는 쪽"이 똑같은 좌표를 쓰기 때문에, 사진을 네 모서리 마커로 기준
 * 좌표계에 맞춰 펴기만 하면 칸 위치를 추측할 필요가 없다.
 *
 * 기준 좌표계: A4 @ 150DPI = 1240 x 1754 px
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var DPI = 150;
  var PAGE_W = 1240;
  var PAGE_H = 1754;

  var FID_SIZE = 60;      // 모서리 검은 사각형 한 변
  var FID_MARGIN = 70;    // 종이 가장자리에서 안쪽으로

  var CODE_X = 150, CODE_Y = 200, CODE_SIZE = 28, CODE_STEP = 42, CODE_BITS = 8;

  var GRID_TOP = 270, GRID_BOTTOM = 1600, GRID_LEFT = 150, GRID_RIGHT = 1090;
  var COLS = 6, ROWS = 8, GAP = 16;
  var PER_PAGE = COLS * ROWS;   // 48칸

  var CELL_INSET = 12;          // 칸 테두리 안쪽 여백(필기 권장 영역)
  /* 베이스라인 위치. 위쪽 공간이 대문자·ㅂㄷㅎ 같은 키 큰 글자,
   * 아래쪽 공간이 g·p·y 처럼 내려가는 획을 담는다.
   * 이 비율이 곧 완성된 폰트의 글자 크기를 정한다. */
  var BASELINE_RATIO = 0.72;

  var SCOPE_ID = { latin: 0, full: 1 };

  function fiducials() {
    var h = FID_SIZE / 2, m = FID_MARGIN;
    return [
      [m + h, m + h],
      [PAGE_W - m - h, m + h],
      [PAGE_W - m - h, PAGE_H - m - h],
      [m + h, PAGE_H - m - h]
    ];
  }

  function codeBoxes() {
    var boxes = [];
    for (var i = 0; i < CODE_BITS; i++) {
      boxes.push([CODE_X + i * CODE_STEP, CODE_Y, CODE_SIZE, CODE_SIZE]);
    }
    return boxes;
  }

  /* 쪽 번호와 문자셋을 8비트로 인코딩한다.
   * bit0-3: 쪽 번호(0-15), bit4-5: 문자셋, bit6-7: 앞 6비트 1의 개수 % 4
   * → 뒤집혀 찍힌 사진을 걸러내는 검사값 역할을 한다. */
  function encodeCode(pageIndex, scope) {
    var low = (pageIndex & 0x0F) | ((SCOPE_ID[scope] & 0x03) << 4);
    var ones = 0;
    for (var i = 0; i < 6; i++) if (low & (1 << i)) ones++;
    return low | ((ones & 0x03) << 6);
  }

  function decodeCode(byte) {
    var low = byte & 0x3F;
    var ones = 0;
    for (var i = 0; i < 6; i++) if (low & (1 << i)) ones++;
    if (((byte >> 6) & 0x03) !== (ones & 0x03)) return null;   // 검사값 불일치
    var scopeId = (low >> 4) & 0x03;
    var scope = null;
    for (var k in SCOPE_ID) if (SCOPE_ID[k] === scopeId) scope = k;
    if (!scope) return null;
    return { pageIndex: low & 0x0F, scope: scope };
  }

  function cellRects() {
    var cw = Math.floor((GRID_RIGHT - GRID_LEFT - GAP * (COLS - 1)) / COLS);
    var ch = Math.floor((GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) / ROWS);
    var rects = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        rects.push([GRID_LEFT + c * (cw + GAP), GRID_TOP + r * (ch + GAP), cw, ch]);
      }
    }
    return rects;
  }

  /* 문자셋 전체를 쪽 단위로 나눠 좌표를 붙인다. */
  function build(scope) {
    var cells = HF.charset.build(scope);
    var rects = cellRects();
    var pages = [];
    for (var p = 0; p * PER_PAGE < cells.length; p++) {
      var slice = cells.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
      var placed = slice.map(function (cell, i) {
        var r = rects[i];
        var out = {
          key: cell.key, kind: cell.kind, form: cell.form, idx: cell.idx,
          unicode: cell.unicode, hint: cell.hint, note: cell.note, guide: cell.guide,
          rect: r,
          writeRect: [r[0] + CELL_INSET, r[1] + CELL_INSET,
                      r[2] - 2 * CELL_INSET, r[3] - 2 * CELL_INSET],
          baselineY: r[1] + Math.round(r[3] * BASELINE_RATIO)
        };
        return out;
      });
      pages.push({ index: p, code: encodeCode(p, scope), cells: placed });
    }
    return {
      scope: scope, dpi: DPI, pageW: PAGE_W, pageH: PAGE_H,
      fiducials: fiducials(), fiducialSize: FID_SIZE,
      codeBoxes: codeBoxes(), codeBits: CODE_BITS,
      perPage: PER_PAGE, pages: pages, totalCells: cells.length
    };
  }

  HF.layout = {
    build: build, encodeCode: encodeCode, decodeCode: decodeCode,
    DPI: DPI, PAGE_W: PAGE_W, PAGE_H: PAGE_H,
    FID_SIZE: FID_SIZE, PER_PAGE: PER_PAGE,
    BASELINE_RATIO: BASELINE_RATIO
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
