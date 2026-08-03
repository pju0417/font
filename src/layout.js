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

  var CODE_X = 150, CODE_Y = 202, CODE_SIZE = 24, CODE_STEP = 34, CODE_BITS = 16;

  var GRID_TOP = 270, GRID_BOTTOM = 1600, GRID_LEFT = 150, GRID_RIGHT = 1090;
  var GAP = 16;
  var COLS = 6, ROWS = 8;                  // 기본 시트: 큼직하게 48칸
  var PER_PAGE = COLS * ROWS;

  /* 활동지는 줄마다 쓰기 방식이 다르다.
   *   ko — 원고지 네모 칸 8개
   *   en — 영어 노트처럼 가로줄 위에 16글자
   * 두 방식이 같은 줄 높이를 쓰므로 한 장에 섞여도 줄이 어긋나지 않는다.
   * 아래쪽은 학생이 생각을 쓰는 자리로 비운다(폰트 글자로 걷지 않는다). */
  var PASSAGE_ROWS = 10;
  var PASSAGE_GRID = {
    rows: PASSAGE_ROWS,
    ko: { cols: 8, gap: GAP },
    en: { cols: 16, gap: 4 }
  };
  var PASSAGE_GRID_BOTTOM = 1440;
  var REFLECT_TOP = 1462, REFLECT_BOTTOM = 1604;

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

  /* 활동지 영어 줄의 글자 크기는 '줄 높이'가 아니라 '칸 너비'가 정한다.
   * 줄 높이에 맞춰 키우면 m·w·W 처럼 넓은 글자가 칸을 넘어 좌우로 잘린다.
   * 가장 넓은 글자가 칸 안에 들어가는 크기를 거꾸로 계산한 값이다. */
  var EN_BAND_PER_WIDTH = 1.05;

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

  /* 쪽 번호와 문자셋을 16비트로 인코딩한다.
   * bit0-9: 쪽 번호(0-1023), bit10-11: 문자셋, bit12-15: 앞 12비트 1의 개수 % 16
   * 검사값은 뒤집혀 찍힌 사진이나 잘못 읽은 코드를 걸러낸다. */
  function encodeCode(pageIndex, scope) {
    var low = (pageIndex & 0x3FF) | ((SCOPE_ID[scope] & 0x03) << 10);
    return low | ((countBits(low, 12) & 0x0F) << 12);
  }

  function decodeCode(value) {
    var low = value & 0x0FFF;
    if (((value >> 12) & 0x0F) !== (countBits(low, 12) & 0x0F)) return null;
    var scopeId = (low >> 10) & 0x03;
    var scope = null;
    for (var k in SCOPE_ID) if (SCOPE_ID[k] === scopeId) scope = k;
    if (!scope) return null;
    return { pageIndex: low & 0x3FF, scope: scope };
  }

  function countBits(v, bits) {
    var n = 0;
    for (var i = 0; i < bits; i++) if (v & (1 << i)) n++;
    return n;
  }

  function cellRects(cols, rows, bottom) {
    bottom = bottom || GRID_BOTTOM;
    var cw = Math.floor((GRID_RIGHT - GRID_LEFT - GAP * (cols - 1)) / cols);
    var ch = Math.floor((bottom - GRID_TOP - GAP * (rows - 1)) / rows);
    var rects = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        rects.push([GRID_LEFT + c * (cw + GAP), GRID_TOP + r * (ch + GAP), cw, ch]);
      }
    }
    return rects;
  }

  /* 활동지 한 줄의 세로 자리 */
  function passageRowRect(row) {
    var rh = Math.floor((PASSAGE_GRID_BOTTOM - GRID_TOP - GAP * (PASSAGE_ROWS - 1)) / PASSAGE_ROWS);
    return [GRID_LEFT, GRID_TOP + row * (rh + GAP), GRID_RIGHT - GRID_LEFT, rh];
  }

  /* 활동지 한 칸의 자리. 줄 방식(ko/en)에 따라 칸 수와 사이 간격이 다르다. */
  function passageCellRect(row, col, style) {
    var g = PASSAGE_GRID[style] || PASSAGE_GRID.ko;
    var rr = passageRowRect(row);
    var cw = Math.floor((rr[2] - g.gap * (g.cols - 1)) / g.cols);
    return [rr[0] + col * (cw + g.gap), rr[1], cw, rr[3]];
  }

  /* 영어 줄 한 칸의 쓰기 띠. 양식을 그릴 때와 사진에서 잘라낼 때가
   * 같은 값을 써야 하므로 여기 한 곳에서만 계산한다. */
  function englishBand(rect) {
    var wr = [rect[0] + LATIN_INSET, rect[1] + LATIN_INSET,
              rect[2] - 2 * LATIN_INSET, rect[3] - 2 * LATIN_INSET];
    var band = Math.min(wr[3] - 2 * LATIN_MARGIN,
                        Math.round(wr[2] * EN_BAND_PER_WIDTH));
    var bandTop = wr[1] + Math.round((wr[3] - band) / 2);   // 줄 가운데에 놓는다
    return {
      writeRect: wr, band: band, bandTop: bandTop,
      baselineY: bandTop + Math.round(LATIN_ASCENT_RATIO * band)
    };
  }

  function place(cell, r) {
    // 영어 줄은 베이스라인이 있어야 하므로 라틴 칸과 같은 방식으로 잡는다
    var isEn = cell.style === 'en';
    var isLatin = isEn || (!cell.style && cell.kind === 'latin');
    var inset = isLatin ? LATIN_INSET : CELL_INSET;
    var wr = [r[0] + inset, r[1] + inset, r[2] - 2 * inset, r[3] - 2 * inset];
    var out = {
      key: cell.key, kind: cell.kind, form: cell.form, idx: cell.idx,
      unicode: cell.unicode, hint: cell.hint, note: cell.note, guide: cell.guide,
      style: cell.style, rect: r, writeRect: wr
    };
    if (isEn) {
      var b = englishBand(r);
      out.writeRect = b.writeRect;
      out.band = b.band;
      out.bandTop = b.bandTop;
      out.baselineY = b.baselineY;
    } else if (isLatin) {
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
    var baseRects = cellRects(COLS, ROWS);
    var pages = [];

    var base = HF.charset.build(scope);
    for (var p = 0; p * PER_PAGE < base.length; p++) {
      var slice = base.slice(p * PER_PAGE, (p + 1) * PER_PAGE);
      pages.push({
        index: pages.length, kind: 'base', code: encodeCode(pages.length, scope),
        cells: slice.map(function (cell, i) { return place(cell, baseRects[i]); })
      });
    }
    var basePages = pages.length;

    // 필사 시트: 글이 원고지처럼 자리를 잡으므로 칸 위치를 charset 이 정해 준다
    var passagePages = scope === 'full'
      ? HF.charset.buildPassagePages(PASSAGE_GRID) : [];
    passagePages.forEach(function (pg) {
      pages.push({
        index: pages.length, kind: 'passage', code: encodeCode(pages.length, scope),
        passage: pg.passage, part: pg.part, parts: pg.parts,
        rowStyles: pg.rowStyles,
        cells: pg.cells.map(function (cell) {
          return place(cell, passageCellRect(cell.row, cell.col, cell.style));
        })
      });
    });

    /* 쪽 번호는 종이에 10비트로 인쇄된다. 활동지를 늘리다 1024쪽을 넘기면
     * 1025쪽이 1쪽으로 읽혀 엉뚱한 글자에 붙는데 오류가 나지 않는다.
     * 그런 일이 조용히 벌어지지 않도록 여기서 막는다. */
    if (pages.length > 1024) {
      throw new Error('쪽 수가 1024를 넘었습니다(' + pages.length + '쪽). ' +
                      'src/data 의 활동지를 줄이거나 쪽 번호 비트를 늘려야 합니다.');
    }

    return {
      scope: scope, dpi: DPI, pageW: PAGE_W, pageH: PAGE_H,
      fiducials: fiducials(), fiducialSize: FID_SIZE,
      codeBoxes: codeBoxes(), codeBits: CODE_BITS,
      perPage: PER_PAGE, pages: pages,
      // 글자가 없는 칸·줄도 그려야 원고지와 영어 노트처럼 보인다
      passageGrid: PASSAGE_GRID,
      passageRowRect: passageRowRect,
      passageCellRect: passageCellRect,
      englishBand: englishBand,
      // 학생이 생각을 쓰는 자리 (폰트 글자로 걷지 않는다)
      reflectRect: [GRID_LEFT, REFLECT_TOP, GRID_RIGHT - GRID_LEFT, REFLECT_BOTTOM - REFLECT_TOP],
      basePages: basePages,
      passagePages: pages.length - basePages,
      totalCells: pages.reduce(function (n, pg) { return n + pg.cells.length; }, 0)
    };
  }

  HF.layout = {
    build: build, encodeCode: encodeCode, decodeCode: decodeCode,
    DPI: DPI, PAGE_W: PAGE_W, PAGE_H: PAGE_H,
    FID_SIZE: FID_SIZE, PER_PAGE: PER_PAGE,
    BASELINE_RATIO: BASELINE_RATIO
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
