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

  /* 한글 칸: 잘라내는 영역이 곧 '음절 사각형'이다. */
  var CELL_INSET = 12;

  /* 라틴 칸: '쓰기 띠'(윗선~아랫선)와 '잘라내는 영역'을 따로 둔다.
   *
   * 둘을 같게 두면 g·p·y 의 꼬리가 잘라낸 영역 밖으로 나가 평평하게 잘린다.
   * 그래서 잘라내는 영역을 띠보다 위아래로 LATIN_MARGIN 만큼 넓게 잡고,
   * 폰트의 크기 기준(em)은 잘라낸 높이가 아니라 '띠 높이'로 정한다.
   * 이렇게 하면 획이 조금 넘쳐도 담기고, 글자 크기는 일정하게 유지된다. */
  var LATIN_INSET = 5;
  var LATIN_MARGIN = 5;
  var LATIN_ASCENT_RATIO = 0.75;   // 띠에서 베이스라인 위쪽이 차지하는 비율

  var BASELINE_RATIO = 0.72;       // 한글 칸에서만 쓰는 참고값

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

  function place(cell, r) {
    var isLatin = cell.kind === 'latin';
    var inset = isLatin ? LATIN_INSET : CELL_INSET;
    var wr = [r[0] + inset, r[1] + inset, r[2] - 2 * inset, r[3] - 2 * inset];
    var out = {
      key: cell.key, kind: cell.kind, form: cell.form, idx: cell.idx,
      unicode: cell.unicode, hint: cell.hint, note: cell.note, guide: cell.guide,
      rect: r, writeRect: wr
    };
    if (isLatin) {
      out.band = wr[3] - 2 * LATIN_MARGIN;          // 윗선~아랫선 높이
      out.bandTop = wr[1] + LATIN_MARGIN;
      out.baselineY = out.bandTop + Math.round(LATIN_ASCENT_RATIO * out.band);
    } else {
      out.baselineY = r[1] + Math.round(r[3] * BASELINE_RATIO);
    }
    return out;
  }

  /* 문자셋 전체를 쪽 단위로 나눠 좌표를 붙인다.
   *
   * 기본 시트(라틴·자모)와 통글자 시트는 쪽을 나눠서 담는다. 섞어 담으면
   * '기본 몇 장, 추가 몇 장'이 흐려지고, 통글자 시트를 안 뽑은 사람도
   * 마지막 기본 시트에 통글자가 딸려 나온다. */
  function build(scope) {
    var rects = cellRects();
    var pages = [];

    function paginate(cells, kind) {
      for (var p = 0; p * PER_PAGE < cells.length; p++) {
        var slice = cells.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
        var index = pages.length;
        pages.push({
          index: index, kind: kind, code: encodeCode(index, scope),
          cells: slice.map(function (cell, i) { return place(cell, rects[i]); })
        });
      }
    }

    var base = HF.charset.build(scope);
    var extra = scope === 'full' ? HF.charset.buildSyllables() : [];
    paginate(base, 'base');
    paginate(extra, 'syllable');

    /* 쪽 번호는 종이에 4비트로 인쇄된다. 목록을 늘리다 16쪽을 넘기면
     * 17쪽이 1쪽으로 읽혀 엉뚱한 글자에 붙는데 오류가 나지 않는다.
     * 그런 일이 조용히 벌어지지 않도록 여기서 막는다. */
    if (pages.length > 16) {
      throw new Error('쪽 수가 16을 넘었습니다(' + pages.length + '쪽). ' +
                      'syllables.js 의 목록을 줄이거나 쪽 번호 비트를 늘려야 합니다.');
    }

    return {
      scope: scope, dpi: DPI, pageW: PAGE_W, pageH: PAGE_H,
      fiducials: fiducials(), fiducialSize: FID_SIZE,
      codeBoxes: codeBoxes(), codeBits: CODE_BITS,
      perPage: PER_PAGE, pages: pages,
      basePages: Math.ceil(base.length / PER_PAGE),
      syllablePages: Math.ceil(extra.length / PER_PAGE),
      totalCells: base.length + extra.length
    };
  }

  HF.layout = {
    build: build, encodeCode: encodeCode, decodeCode: decodeCode,
    DPI: DPI, PAGE_W: PAGE_W, PAGE_H: PAGE_H,
    FID_SIZE: FID_SIZE, PER_PAGE: PER_PAGE,
    BASELINE_RATIO: BASELINE_RATIO
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
