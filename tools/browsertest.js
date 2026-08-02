/* 브라우저에서 돌리는 종단간 시험.
 *
 * 실제 손글씨 대신 시스템 글꼴로 칸을 채우고, 그 종이를 비스듬히 찍은 것처럼
 * 원근 왜곡·조명 얼룩·흐림·잡티를 입혀 '가짜 사진'을 만든다.
 * 그 사진을 앱과 똑같은 경로로 처리해 인식률과 폰트 생성을 확인한다.
 *
 * 콘솔에서:  await HFTest.run()
 */
(function (root) {
  'use strict';
  var HF = root.HF;

  function rnd(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s ^ (s >>> 15), 2246822519) + 1) >>> 0;
      return s / 4294967296;
    };
  }

  // ---------- 가짜 손글씨 ----------

  function writeOnPage(cv, layout, page, seed) {
    var ctx = cv.getContext('2d');
    var r = rnd(seed);
    ctx.fillStyle = '#101010';
    ctx.textBaseline = 'alphabetic';

    page.cells.forEach(function (cell) {
      if (r() < 0.02) return;                    // 가끔 빈 칸을 남겨 본다
      var wr = cell.writeRect;
      ctx.save();
      // 손으로 쓸 때처럼 조금 기울이고 흔든다
      var cx = wr[0] + wr[2] / 2, cy = wr[1] + wr[3] / 2;
      ctx.translate(cx, cy);
      ctx.rotate((r() - 0.5) * 0.09);
      ctx.translate(-cx + (r() - 0.5) * 6, -cy + (r() - 0.5) * 6);

      if (cell.kind === 'mark') {
        ctx.font = '600 ' + Math.round(wr[3] * 0.6) + 'px "Malgun Gothic",sans-serif';
        var mm = ctx.measureText(cell.hint);
        ctx.fillText(cell.hint,
          wr[0] + (wr[2] - (mm.actualBoundingBoxLeft + mm.actualBoundingBoxRight)) / 2 +
          mm.actualBoundingBoxLeft, wr[1] + wr[3] * 0.8);
      } else if (cell.kind === 'syllable') {
        fitText(ctx, cell.hint,
          [wr[0] + wr[2] * 0.04, wr[1] + wr[3] * 0.04, wr[2] * 0.92, wr[3] * 0.92], 'syllable');
      } else if (cell.guide) {
        var g = cell.guide, pad = 0.04;
        fitText(ctx, cell.hint,
          [wr[0] + (g[0] + g[2] * pad) * wr[2], wr[1] + (g[1] + g[3] * pad) * wr[3],
           g[2] * (1 - 2 * pad) * wr[2], g[3] * (1 - 2 * pad) * wr[3]], cell.kind);
      } else {
        var size = Math.round(cell.rect[3] * 0.84);
        ctx.font = '600 ' + size + 'px "Malgun Gothic",sans-serif';
        var m = ctx.measureText(cell.hint);
        var w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        ctx.fillText(cell.hint,
          cell.rect[0] + (cell.rect[2] - w) / 2 + m.actualBoundingBoxLeft, cell.baselineY);
      }
      ctx.restore();
    });
    return cv;
  }

  /* 양식의 안내 글자와 같은 규칙으로 그린다 (사용자가 따라 쓴 셈) */
  function fitText(ctx, text, rect, kind) {
    ctx.font = '600 200px "Malgun Gothic",sans-serif';
    var m = ctx.measureText(text);
    var x0 = -m.actualBoundingBoxLeft, y0 = -m.actualBoundingBoxAscent;
    var w0 = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    var h0 = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (w0 < 1 || h0 < 1) return;
    var s = HF.hangul.fitScale(w0, h0, rect[2], rect[3], kind);
    ctx.save();
    ctx.translate(rect[0] + (rect[2] - w0 * s.sx) / 2 - x0 * s.sx,
                  rect[1] + (rect[3] - h0 * s.sy) / 2 - y0 * s.sy);
    ctx.scale(s.sx, s.sy);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  // ---------- 가짜 사진 ----------

  function fakePhoto(pageCanvas, seed, opts) {
    opts = opts || {};
    var r = rnd(seed);
    var PW = opts.width || 1700;
    var PH = Math.round(PW * 1.32);
    var src = pageCanvas.getContext('2d').getImageData(0, 0, pageCanvas.width, pageCanvas.height);

    // 종이 네 귀퉁이가 사진 안에서 놓일 자리 (비스듬히 찍은 것처럼)
    var j = opts.jitter != null ? opts.jitter : 0.055;
    var pad = 0.07;
    var quad = [
      [PW * (pad + r() * j), PH * (pad + r() * j)],
      [PW * (1 - pad - r() * j), PH * (pad + r() * j)],
      [PW * (1 - pad - r() * j), PH * (1 - pad - r() * j)],
      [PW * (pad + r() * j), PH * (1 - pad - r() * j)]
    ];
    var pageQuad = [[0, 0], [pageCanvas.width, 0],
                    [pageCanvas.width, pageCanvas.height], [0, pageCanvas.height]];
    var Hm = HF.imageproc.homography(quad, pageQuad);   // 사진 좌표 → 종이 좌표

    var out = new ImageData(PW, PH);
    var od = out.data, sd = src.data, sw = src.width, sh = src.height;
    var lightCx = PW * (0.3 + r() * 0.4), lightCy = PH * (0.3 + r() * 0.4);
    var maxR = Math.hypot(PW, PH);

    for (var y = 0, o = 0; y < PH; y++) {
      for (var x = 0; x < PW; x++, o += 4) {
        var d = Hm[6] * x + Hm[7] * y + Hm[8];
        var sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / d;
        var sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / d;
        var rr = 210, gg = 210, bb = 214;                 // 책상 바닥
        if (sx >= 0 && sy >= 0 && sx < sw - 1 && sy < sh - 1) {
          var x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
          var i00 = (y0 * sw + x0) * 4, i10 = i00 + 4;
          var i01 = i00 + sw * 4, i11 = i01 + 4;
          rr = mix(sd, i00, i10, i01, i11, 0, fx, fy);
          gg = mix(sd, i00, i10, i01, i11, 1, fx, fy);
          bb = mix(sd, i00, i10, i01, i11, 2, fx, fy);
        }
        // 조명 얼룩 + 잡티
        var lit = 1 - 0.28 * (Math.hypot(x - lightCx, y - lightCy) / maxR);
        var n = (r() - 0.5) * 14;
        od[o] = clamp(rr * lit + n);
        od[o + 1] = clamp(gg * lit + n);
        od[o + 2] = clamp(bb * lit + n);
        od[o + 3] = 255;
      }
    }

    var cv = document.createElement('canvas');
    cv.width = PW; cv.height = PH;
    var ctx = cv.getContext('2d');
    ctx.putImageData(out, 0, 0);
    // 초점이 조금 나간 느낌
    ctx.filter = 'blur(0.7px)';
    ctx.drawImage(cv, 0, 0);
    ctx.filter = 'none';
    return cv;
  }

  function mix(d, i00, i10, i01, i11, c, fx, fy) {
    var t = d[i00 + c] * (1 - fx) + d[i10 + c] * fx;
    var b = d[i01 + c] * (1 - fx) + d[i11 + c] * fx;
    return t * (1 - fy) + b * fy;
  }
  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  // ---------- 시험 ----------

  function run(scope) {
    scope = scope || 'full';
    var layout = HF.layout.build(scope);
    var log = [];
    var collected = {};
    var totalCells = 0, ok = 0, faint = 0, empty = 0;

    for (var p = 0; p < layout.pages.length; p++) {
      var page = HF.template.renderPage(layout, p, 1);
      writeOnPage(page, layout, layout.pages[p], 1234 + p * 77);
      var photo = fakePhoto(page, 9000 + p * 31);

      var t0 = performance.now();
      var res = HF.imageproc.processImage(photo, { layouts: { latin: HF.layout.build('latin'), full: HF.layout.build('full') } });
      var ms = Math.round(performance.now() - t0);

      if (!res.ok) {
        log.push((p + 1) + '쪽: 인식 실패 (' + res.reason + ')');
        continue;
      }
      var stat = { ok: 0, faint: 0, empty: 0 };
      res.cells.forEach(function (c) {
        stat[c.status]++;
        if (c.status !== 'empty') collected[c.key] = c;
      });
      totalCells += res.cells.length; ok += stat.ok; faint += stat.faint; empty += stat.empty;
      log.push((p + 1) + '쪽 → ' + (res.pageIndex + 1) + '쪽 인식 [' + res.scope + '] · ' +
               'ok ' + stat.ok + ' / 흐림 ' + stat.faint + ' / 빈칸 ' + stat.empty + ' · ' + ms + 'ms');
      if (res.pageIndex !== p) log.push('  ✗ 쪽 번호가 틀렸습니다');
      if (res.scope !== scope) log.push('  ✗ 문자셋이 틀렸습니다');
    }

    var t1 = performance.now();
    var out = HF.fontbuild.build(collected, { familyName: 'Browser Test', familyNameKo: '브라우저시험' });
    var buildMs = Math.round(performance.now() - t1);
    var r = out.report;

    var summary = {
      pages: layout.pages.length,
      cells: totalCells, ok: ok, faint: faint, empty: empty,
      recognizedRatio: totalCells ? ((ok + faint) / totalCells) : 0,
      latin: r.latin, jamo: r.jamo, syllables: r.syllables,
      glyphs: r.glyphCount, kb: Math.round(r.byteLength / 1024),
      missing: r.missing, buildMs: buildMs, log: log
    };

    var buf = out.ttf.buffer.slice(out.ttf.byteOffset, out.ttf.byteOffset + out.ttf.byteLength);
    return new FontFace('BrowserTestFont', buf).load().then(function (f) {
      document.fonts.add(f);
      summary.fontFaceLoads = true;
      root.HFTestResult = { summary: summary, ttf: out.ttf };
      return summary;
    }, function (e) {
      summary.fontFaceLoads = false;
      summary.fontFaceError = String(e);
      root.HFTestResult = { summary: summary, ttf: out.ttf };
      return summary;
    });
  }

  root.HFTest = { run: run, fakePhoto: fakePhoto, writeOnPage: writeOnPage };
})(window);
