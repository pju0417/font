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
    ctx.fillText(page.passage ? page.passage.title : '손글씨 폰트 양식', 150, 130);
    if (page.passage) {
      var w = ctx.measureText(page.passage.title).width;
      ctx.font = f(20);
      ctx.fillStyle = C_NOTE;
      ctx.fillText(page.passage.author +
        (page.parts > 1 ? '   (' + page.part + '/' + page.parts + ')' : ''), 150 + w + 16, 130);
      ctx.fillStyle = C_TEXT;
    }
    ctx.font = f(20);
    ctx.fillText({
      latin: '연한 파란 글자를 따라 검은 펜으로 쓰세요. 굵은 밑선에 글자를 앉히고, 소문자는 중간선까지.',
      jamo: '연한 파란 글자를 따라 검은 펜으로 쓰세요. 파란 영역을 채우듯이, 십자선을 기준 삼아.',
      passage: '원고지처럼 한 칸에 한 자씩, 연한 글자를 따라 검은 펜으로 옮겨 쓰세요.'
    }[meta.scope], 150, 168);
    ctx.font = f(22, 'bold');
    ctx.fillText((page.index + 1) + ' / ' + meta.totalPages + ' 쪽', 700, 222);
    ctx.font = f(18);
    ctx.fillStyle = C_NOTE;
    ctx.fillText(meta.scopeLabel, 805, 222);
    ctx.fillStyle = C_TEXT;

    // --- 칸 ---
    if (page.kind === 'passage') {
      // 빈 칸(띄어쓰기·줄 끝)도 테두리만 그려 원고지처럼 보이게 한다
      ctx.strokeStyle = C_LINE;
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      layout.passageRects.forEach(function (r) {
        ctx.strokeRect(r[0] + 0.5, r[1] + 0.5, r[2] - 1, r[3] - 1);
      });
    }
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
    if (cell.kind === 'mark') {
      /* 문장부호. 글이 글답게 읽히도록 자리를 잡아 주되, 칸에 맞춰 늘이지 않는다.
       * 쉼표를 칸만큼 키우면 커다란 덩어리가 되어 버린다.
       * 폰트에는 쓰이지 않는다(문장부호는 영문 시트에서 이미 받았다). */
      drawQuadrants(ctx, wr);
      ctx.fillStyle = C_HINT;
      ctx.font = f(Math.round(wr[3] * 0.6));
      var mm = ctx.measureText(cell.hint);
      var mw = mm.actualBoundingBoxLeft + mm.actualBoundingBoxRight;
      ctx.fillText(cell.hint, wr[0] + (wr[2] - mw) / 2 + mm.actualBoundingBoxLeft,
                   wr[1] + wr[3] * 0.8);
    } else if (cell.kind === 'syllable') {
      // 글자 한 자가 통째로 들어가는 칸. 십자선만 기준으로 준다.
      drawQuadrants(ctx, wr);
      ctx.fillStyle = C_HINT;
      fitText(ctx, cell.hint, 200,
              [wr[0] + wr[2] * 0.04, wr[1] + wr[3] * 0.04,
               wr[2] * 0.92, wr[3] * 0.92], 'syllable');
    } else if (cell.guide) {
      var g = cell.guide;
      var gr = [wr[0] + g[0] * wr[2], wr[1] + g[1] * wr[3],
                g[2] * wr[2], g[3] * wr[3]];
      ctx.fillStyle = C_FILL;
      ctx.fillRect(gr[0], gr[1], gr[2], gr[3]);
      drawQuadrants(ctx, wr);
      ctx.fillStyle = C_HINT;
      // 안내 글자를 안내 영역보다 살짝 작게 넣어 답답해 보이지 않게 한다
      var pad = 0.04;
      fitText(ctx, cell.hint, 200,
              [gr[0] + gr[2] * pad, gr[1] + gr[3] * pad,
               gr[2] * (1 - 2 * pad), gr[3] * (1 - 2 * pad)], cell.kind);
    } else {
      drawWritingLines(ctx, cell);
      ctx.fillStyle = C_HINT;
      fitTextBaseline(ctx, cell.hint, cell);
    }

    // 칸 테두리
    ctx.strokeStyle = C_LINE;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(r[0] + 1, r[1] + 1, r[2] - 2, r[3] - 2);

    // 칸 안 작은 설명 (예: 초성 ㄱ 칸에 '가')
    if (cell.note) {
      ctx.fillStyle = C_NOTE;
      ctx.font = f(16);
      ctx.fillText(cell.note, r[0] + 7, r[1] + 21);
    }
  }

  /* 안내선은 반드시 '짧은 점선'으로 그린다.
   *
   * 컬러로 인쇄하면 파랑 채널에서 알아서 사라지지만, 흑백 프린터로 뽑으면
   * 회색 실선이 되어 이진화에 걸릴 수 있다. 점선이면 조각 하나하나가 잡티
   * 제거 기준보다 작아 저절로 지워지고, 글자 획과 붙더라도 아주 짧은 꼬리만
   * 남는다. 실선으로 바꾸면 획에 가로줄이 달라붙는 폰트가 나올 수 있다. */
  function dash(ctx, x0, y0, x1, y1, pattern, width) {
    ctx.save();
    ctx.strokeStyle = C_LINE;
    ctx.lineWidth = width;
    ctx.setLineDash(pattern);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }

  /* 글꼴의 세로 비율(글자 크기 1 기준). 안내 글자를 선에 정확히 앉히는 데 쓴다. */
  var ratioCache = null;

  function latinRatios(ctx) {
    if (ratioCache) return ratioCache;
    var S = 200;
    ctx.save();
    ctx.font = f(S);
    ratioCache = {
      asc: ctx.measureText('bdfhklHT').actualBoundingBoxAscent / S,  // 키 큰 글자
      xh: ctx.measureText('xaceoz').actualBoundingBoxAscent / S,     // 소문자 높이
      desc: ctx.measureText('gpqy').actualBoundingBoxDescent / S     // 내려가는 획
    };
    ctx.restore();
    return ratioCache;
  }

  /* 안내 글자 크기는 '쓰기 띠'가 정한다.
   * 반대로 글자 크기에서 선 위치를 잡으면, 글꼴마다 띠 밖으로 삐져나가
   * 잘라낸 영역에서 꼬리가 잘리는 일이 생긴다. */
  function latinHintSize(ctx, cell) {
    return Math.round((cell.baselineY - cell.bandTop) / latinRatios(ctx).asc);
  }

  /* 영어 노트처럼 네 줄을 긋는다.
   * 소문자 높이(중간선)를 일정하게 잡아 주는 것이 폰트 품질에 특히 크게 작용한다. */
  function drawWritingLines(ctx, cell) {
    var r = cell.rect;
    var x0 = r[0] + 7, x1 = r[0] + r[2] - 7;
    var bl = cell.baselineY;
    var mean = bl - latinRatios(ctx).xh * latinHintSize(ctx, cell);

    dash(ctx, x0, cell.bandTop, x1, cell.bandTop, [3, 7], 1);              // 윗선
    dash(ctx, x0, mean, x1, mean, [4, 6], 1);                              // 중간선
    dash(ctx, x0, bl, x1, bl, [9, 4], 2);                                  // 밑선(가장 중요)
    var bot = cell.bandTop + cell.band;
    dash(ctx, x0, bot, x1, bot, [3, 7], 1);                                // 아랫선
  }

  /* 한글 칸을 십자로 4등분한다.
   * 칸 전체가 '음절 사각형'이고, 파란 영역은 그 안에서 이 자모가 차지하는 자리다.
   * 십자선이 있으면 자모가 음절의 어디쯤 앉는지 눈으로 가늠하기 쉬워진다. */
  function drawQuadrants(ctx, wr) {
    var cx = wr[0] + wr[2] / 2, cy = wr[1] + wr[3] / 2;
    dash(ctx, wr[0] + 4, cy, wr[0] + wr[2] - 4, cy, [4, 6], 1);
    dash(ctx, cx, wr[1] + 4, cx, wr[1] + wr[3] - 4, [4, 6], 1);
  }

  /* 라틴 글자는 비율(대문자 높이, 내려가는 획)이 살아 있어야 하므로
   * 늘이지 않고 베이스라인 위에 자연스러운 크기로 놓는다. */
  function fitTextBaseline(ctx, text, cell) {
    var r = cell.rect;
    ctx.font = f(latinHintSize(ctx, cell));
    var m = ctx.measureText(text);
    var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    var x = r[0] + (r[2] - w) / 2 + m.actualBoundingBoxLeft;
    ctx.fillText(text, x, cell.baselineY);
  }

  function renderPage(layout, pageIndex, scale) {
    scale = scale || 1;
    var cv = document.createElement('canvas');
    cv.width = Math.round(layout.pageW * scale);
    cv.height = Math.round(layout.pageH * scale);
    var ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    var page = layout.pages[pageIndex];
    drawPage(ctx, layout, page, {
      totalPages: layout.pages.length,
      scope: page.kind === 'passage' ? 'passage'
           : (page.cells[0].kind === 'latin' ? 'latin' : 'jamo'),
      scopeLabel: page.kind === 'passage'
        ? '필사 시트 (선택)'
        : HF.charset.SCOPES[layout.scope].label
    });
    return cv;
  }

  HF.template = { renderPage: renderPage, drawPage: drawPage, FONT_STACK: FONT_STACK };
})(typeof globalThis !== 'undefined' ? globalThis : this);
