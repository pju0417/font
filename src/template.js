/* 양식(손글씨 쓰는 종이)을 캔버스에 그린다.
 *
 * 색 설계: 인쇄되는 안내선·안내글자는 전부 '푸른 계열'로 그린다.
 * 사진에서 글자를 뽑을 때 파랑 채널을 보면 이 안내선들은 흰 종이와 거의
 * 구별되지 않아 자동으로 사라지고, 검은 펜 자국만 남는다.
 * (흑백 인쇄를 해도 안내선이 충분히 연해서 이진화 단계에서 걸러진다.)
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var FONT_STACK = '"Malgun Gothic","맑은 고딕","Apple SD Gothic Neo",' +
                   '"Noto Sans KR","Nanum Gothic",sans-serif';

  var C_LINE = 'rgb(150,185,225)';   // 칸 테두리 · 베이스라인
  var C_FILL = 'rgb(238,244,252)';   // 자모 배치 안내 영역
  var C_HINT = 'rgb(193,214,238)';   // 따라 쓸 안내 글자
  var C_TEXT = 'rgb(90,105,125)';    // 머리말 · 꼬리말
  var C_NOTE = 'rgb(150,175,205)';   // 칸 안 작은 설명
  var C_BLACK = 'rgb(0,0,0)';

  function f(size, weight) {
    return (weight ? weight + ' ' : '') + size + 'px ' + FONT_STACK;
  }

  /* 안내 글자를 상자 안에 맞춰 그린다.
   * 획 하나짜리 자모(ㅣ ㅡ)가 굵은 막대로 뭉개지지 않도록
   * 가로세로 배율 차이를 제한한 뒤 상자 가운데에 놓는다. */
  function fitText(ctx, text, size, rect, kind) {
    ctx.font = f(size);
    var m = ctx.measureText(text);
    var x0 = -m.actualBoundingBoxLeft;
    var y0 = -m.actualBoundingBoxAscent;
    var w0 = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    var h0 = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (!(w0 > 0.5) || !(h0 > 0.5)) return;
    var s = HF.hangul.fitScale(w0, h0, rect[2], rect[3], kind);
    ctx.save();
    ctx.translate(rect[0] + (rect[2] - w0 * s.sx) / 2 - x0 * s.sx,
                  rect[1] + (rect[3] - h0 * s.sy) / 2 - y0 * s.sy);
    ctx.scale(s.sx, s.sy);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function drawPage(ctx, layout, page, meta) {
    var W = layout.pageW, H = layout.pageH;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // --- 네 모서리 마커: 사진을 반듯하게 펴는 기준점 ---
    var fs = layout.fiducialSize;
    ctx.fillStyle = C_BLACK;
    layout.fiducials.forEach(function (p) {
      ctx.fillRect(p[0] - fs / 2, p[1] - fs / 2, fs, fs);
    });

    // --- 쪽 번호 코드: 어느 쪽인지 프로그램이 스스로 알아본다 ---
    layout.codeBoxes.forEach(function (b, i) {
      ctx.fillStyle = (page.code >> i) & 1 ? C_BLACK : '#fff';
      ctx.fillRect(b[0], b[1], b[2], b[3]);
      ctx.strokeStyle = C_LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(b[0] + 0.5, b[1] + 0.5, b[2] - 1, b[3] - 1);
    });

    // --- 머리말 ---
    ctx.fillStyle = C_TEXT;
    ctx.font = f(30, 'bold');
    ctx.fillText('손글씨 폰트 양식', 150, 130);
    ctx.font = f(20);
    ctx.fillText('연한 파란 글자를 따라 검은 펜으로 크고 진하게 쓰세요. 칸 밖으로 나가지 않게.',
                 150, 168);
    ctx.font = f(22, 'bold');
    ctx.fillText((page.index + 1) + ' / ' + meta.totalPages + ' 쪽', 560, 222);
    ctx.font = f(18);
    ctx.fillText(meta.scopeLabel, 660, 222);

    // --- 칸 ---
    page.cells.forEach(function (cell) {
      drawCell(ctx, cell);
    });

    // --- 꼬리말 ---
    ctx.fillStyle = C_TEXT;
    ctx.font = f(17);
    ctx.fillText('A4 실제 크기(100%)로 인쇄 · 네 모서리 검은 사각형이 사진에 모두 보이게 촬영하세요.',
                 150, 1645);
  }

  function drawCell(ctx, cell) {
    var r = cell.rect, wr = cell.writeRect;

    // 자모 칸: 어느 위치·크기로 써야 하는지 옅은 배경으로 알려 준다
    if (cell.guide) {
      var g = cell.guide;
      var gr = [wr[0] + g[0] * wr[2], wr[1] + g[1] * wr[3],
                g[2] * wr[2], g[3] * wr[3]];
      ctx.fillStyle = C_FILL;
      ctx.fillRect(gr[0], gr[1], gr[2], gr[3]);
      ctx.fillStyle = C_HINT;
      // 안내 글자를 안내 영역보다 살짝 작게 넣어 답답해 보이지 않게 한다
      var pad = 0.04;
      fitText(ctx, cell.hint, 200,
              [gr[0] + gr[2] * pad, gr[1] + gr[3] * pad,
               gr[2] * (1 - 2 * pad), gr[3] * (1 - 2 * pad)], cell.kind);
    }

    // 칸 테두리
    ctx.strokeStyle = C_LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(r[0] + 1, r[1] + 1, r[2] - 2, r[3] - 2);

    if (!cell.guide) {
      // 라틴 칸: 베이스라인이 폰트 품질을 좌우하므로 뚜렷하게 표시한다
      ctx.beginPath();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      ctx.moveTo(r[0] + 8, cell.baselineY);
      ctx.lineTo(r[0] + r[2] - 8, cell.baselineY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = C_HINT;
      fitTextBaseline(ctx, cell.hint, r, cell.baselineY);
    }

    // 칸 안 작은 설명 (예: 초성 ㄱ 칸에 '가')
    if (cell.note) {
      ctx.fillStyle = C_NOTE;
      ctx.font = f(16);
      ctx.fillText(cell.note, r[0] + 7, r[1] + 21);
    }
  }

  /* 라틴 글자는 비율(대문자 높이, 내려가는 획)이 살아 있어야 하므로
   * 늘이지 않고 베이스라인 위에 자연스러운 크기로 놓는다.
   * 이 크기가 곧 완성된 폰트의 글자 크기가 되므로, 키 큰 글자가 칸 위쪽에
   * 거의 닿을 만큼 크게 잡는다. 작게 쓰면 폰트도 작게 나온다. */
  var LATIN_HINT_RATIO = 0.84;

  function fitTextBaseline(ctx, text, rect, baselineY) {
    var size = Math.round(rect[3] * LATIN_HINT_RATIO);
    ctx.font = f(size);
    var m = ctx.measureText(text);
    var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    var x = rect[0] + (rect[2] - w) / 2 + m.actualBoundingBoxLeft;
    ctx.fillText(text, x, baselineY);
  }

  function renderPage(layout, pageIndex, scale) {
    scale = scale || 1;
    var cv = document.createElement('canvas');
    cv.width = Math.round(layout.pageW * scale);
    cv.height = Math.round(layout.pageH * scale);
    var ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    drawPage(ctx, layout, layout.pages[pageIndex], {
      totalPages: layout.pages.length,
      scopeLabel: HF.charset.SCOPES[layout.scope].label
    });
    return cv;
  }

  HF.template = { renderPage: renderPage, drawPage: drawPage, FONT_STACK: FONT_STACK };
})(typeof globalThis !== 'undefined' ? globalThis : this);
