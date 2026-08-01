/* 사진 → 반듯하게 편 양식 → 칸별 글자 비트맵.
 *
 * 흐름
 *  1) 사진을 줄여서 네 모서리 검은 마커를 찾는다
 *  2) 그 네 점을 기준 좌표계(A4 150DPI)로 보내는 투영 변환을 구한다
 *  3) 사진 전체를 그 변환으로 펴서 '기준 이미지'를 만든다
 *  4) 머리말의 코드 사각형을 읽어 몇 쪽인지 알아낸다 (틀리면 90도씩 돌려 재시도)
 *  5) layout 의 칸 좌표대로 잘라 이진화·정리한다
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var MAX_WORK = 2600;    // 왜곡 보정에 쓸 원본 최대 변 길이
  var MAX_DETECT = 1000;  // 마커 탐색용 축소 크기
  var WARP_SCALE = 1.4;   // 기준 좌표계 대비 확대 배율(획을 더 곱게 따기 위해)

  // ---------- 기본 도구 ----------

  function toImageData(source, maxSide) {
    var w = source.width, h = source.height;
    var s = Math.min(1, maxSide / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * s)), chh = Math.max(1, Math.round(h * s));
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = chh;
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, 0, 0, cw, chh);
    return ctx.getImageData(0, 0, cw, chh);
  }

  function luminance(img) {
    var n = img.width * img.height;
    var g = new Uint8Array(n);
    var d = img.data;
    for (var i = 0, j = 0; i < n; i++, j += 4) {
      g[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
    }
    return g;
  }

  function otsu(hist, total) {
    var sum = 0, i;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, thr = 128;
    for (i = 0; i < 256; i++) {
      wB += hist[i];
      if (!wB) continue;
      var wF = total - wB;
      if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; thr = i; }
    }
    return thr;
  }

  function histogramOf(arr) {
    var h = new Uint32Array(256);
    for (var i = 0; i < arr.length; i++) h[arr[i]]++;
    return h;
  }

  /* 4-이웃 라벨링. mask 는 0/1. 반환 {labels, stats:[{x,y,w,h,area}]} */
  function connectedComponents(mask, w, h) {
    var labels = new Int32Array(w * h);
    var stats = [];
    var stack = new Int32Array(w * h);
    for (var start = 0; start < w * h; start++) {
      if (!mask[start] || labels[start]) continue;
      var id = stats.length + 1;
      var sp = 0;
      stack[sp++] = start;
      labels[start] = id;
      var minX = w, minY = h, maxX = -1, maxY = -1, area = 0;
      while (sp > 0) {
        var p = stack[--sp];
        var x = p % w, y = (p - x) / w;
        area++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = id; stack[sp++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = id; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - w] && !labels[p - w]) { labels[p - w] = id; stack[sp++] = p - w; }
        if (y < h - 1 && mask[p + w] && !labels[p + w]) { labels[p + w] = id; stack[sp++] = p + w; }
      }
      stats.push({ id: id, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area: area });
    }
    return { labels: labels, stats: stats };
  }

  // ---------- 1) 마커 찾기 ----------

  function findMarkers(img) {
    var g = luminance(img);
    var w = img.width, h = img.height;
    var thr = otsu(histogramOf(g), g.length);
    var mask = new Uint8Array(g.length);
    for (var i = 0; i < g.length; i++) mask[i] = g[i] < thr ? 1 : 0;

    var cc = connectedComponents(mask, w, h);
    var imgArea = w * h;
    var cand = cc.stats.filter(function (s) {
      if (s.area < imgArea * 0.00008 || s.area > imgArea * 0.03) return false;
      var aspect = s.w / s.h;
      if (aspect < 0.65 || aspect > 1.55) return false;
      return s.area / (s.w * s.h) > 0.78;      // 속이 꽉 찬 사각형인가
    });
    if (cand.length < 4) return null;

    // 쪽 번호 코드 사각형은 모서리 마커보다 훨씬 작다 → 큰 것만 남긴다
    var maxArea = cand.reduce(function (m, s) { return Math.max(m, s.area); }, 0);
    var big = cand.filter(function (s) { return s.area >= maxArea * 0.35; });
    if (big.length < 4) return null;

    var pts = big.map(function (s) {
      return [s.x + s.w / 2, s.y + s.h / 2];
    });
    var quad = extremeQuad(pts);
    return validQuad(quad, imgArea) ? quad : null;
  }

  /* 점들 중 좌상·우상·우하·좌하 극점을 고른다 */
  function extremeQuad(pts) {
    var tl = pts[0], tr = pts[0], br = pts[0], bl = pts[0];
    pts.forEach(function (p) {
      if (p[0] + p[1] < tl[0] + tl[1]) tl = p;
      if (p[0] + p[1] > br[0] + br[1]) br = p;
      if (p[0] - p[1] > tr[0] - tr[1]) tr = p;
      if (p[0] - p[1] < bl[0] - bl[1]) bl = p;
    });
    return [tl, tr, br, bl];
  }

  function validQuad(q, imgArea) {
    var seen = {};
    for (var i = 0; i < 4; i++) {
      var k = Math.round(q[i][0]) + ',' + Math.round(q[i][1]);
      if (seen[k]) return false;
      seen[k] = 1;
    }
    var area = Math.abs(polyArea(q));
    if (area < imgArea * 0.10) return false;
    var wTop = dist(q[0], q[1]), wBot = dist(q[3], q[2]);
    var hL = dist(q[0], q[3]), hR = dist(q[1], q[2]);
    var ratio = ((wTop + wBot) / 2) / ((hL + hR) / 2);
    return ratio > 0.50 && ratio < 0.98;    // A4 세로(0.707) 언저리
  }

  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }

  function polyArea(p) {
    var s = 0;
    for (var i = 0; i < p.length; i++) {
      var j = (i + 1) % p.length;
      s += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return s / 2;
  }

  // ---------- 2) 투영 변환 ----------

  /* src 4점 → dst 4점 으로 보내는 3x3 행렬을 구한다(h33=1). */
  function homography(src, dst) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    var s = solve(A, b);
    if (!s) return null;
    return [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], 1];
  }

  function solve(A, b) {
    var n = b.length;
    for (var i = 0; i < n; i++) {
      var piv = i;
      for (var r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      if (Math.abs(A[piv][i]) < 1e-10) return null;
      var t = A[i]; A[i] = A[piv]; A[piv] = t;
      var tb = b[i]; b[i] = b[piv]; b[piv] = tb;
      for (r = i + 1; r < n; r++) {
        var f = A[r][i] / A[i][i];
        if (!f) continue;
        for (var c = i; c < n; c++) A[r][c] -= f * A[i][c];
        b[r] -= f * b[i];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var sum = b[i];
      for (var c2 = i + 1; c2 < n; c2++) sum -= A[i][c2] * x[c2];
      x[i] = sum / A[i][i];
    }
    return x;
  }

  /* 기준 좌표계 → 원본 사진 의 역변환으로 픽셀을 끌어온다(쌍선형 보간). */
  function warp(img, srcQuad, layout, scale) {
    var W = Math.round(layout.pageW * scale), H = Math.round(layout.pageH * scale);
    var dst = layout.fiducials.map(function (p) { return [p[0] * scale, p[1] * scale]; });
    var Hm = homography(dst, srcQuad);        // 목적지 → 원본 (역방향을 바로 구한다)
    if (!Hm) return null;

    var out = new Uint8ClampedArray(W * H * 4);
    var sd = img.data, sw = img.width, sh = img.height;
    var o = 0;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++, o += 4) {
        var d = Hm[6] * x + Hm[7] * y + Hm[8];
        var sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / d;
        var sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / d;
        if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) {
          out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = 255;
          continue;
        }
        var x0 = sx | 0, y0 = sy | 0;
        var x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
        var fx = sx - x0, fy = sy - y0;
        var i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4;
        var i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
        for (var c = 0; c < 3; c++) {
          var top = sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx;
          var bot = sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx;
          out[o + c] = top * (1 - fy) + bot * fy;
        }
        out[o + 3] = 255;
      }
    }
    return { data: out, width: W, height: H, scale: scale };
  }

  // ---------- 3) 쪽 번호 코드 읽기 ----------

  function readCode(warped, layout) {
    var s = warped.scale, byte = 0;
    for (var i = 0; i < layout.codeBits; i++) {
      var b = layout.codeBoxes[i];
      var m = meanLuma(warped, b[0] * s, b[1] * s, b[2] * s, b[3] * s, 0.30);
      if (m < 128) byte |= (1 << i);
    }
    return layout.decodeCode ? layout.decodeCode(byte) : HF.layout.decodeCode(byte);
  }

  function meanLuma(warped, x, y, w, h, inset) {
    var ix = Math.round(x + w * inset), iy = Math.round(y + h * inset);
    var iw = Math.max(1, Math.round(w * (1 - 2 * inset)));
    var ih = Math.max(1, Math.round(h * (1 - 2 * inset)));
    var d = warped.data, W = warped.width;
    var sum = 0, n = 0;
    for (var yy = iy; yy < iy + ih; yy++) {
      if (yy < 0 || yy >= warped.height) continue;
      for (var xx = ix; xx < ix + iw; xx++) {
        if (xx < 0 || xx >= W) continue;
        var o = (yy * W + xx) * 4;
        sum += (d[o] * 77 + d[o + 1] * 150 + d[o + 2] * 29) >> 8;
        n++;
      }
    }
    return n ? sum / n : 255;
  }

  // ---------- 4) 칸 잘라내기 ----------

  /* 파랑 채널을 본다. 양식의 안내선은 푸른 계열이라 파랑 채널에서 종이와
   * 거의 같은 밝기가 되어 저절로 사라지고, 검은 펜만 남는다. */
  function cropBlue(warped, rect, scale) {
    var x0 = Math.round(rect[0] * scale), y0 = Math.round(rect[1] * scale);
    var w = Math.round(rect[2] * scale), h = Math.round(rect[3] * scale);
    var out = new Uint8Array(w * h);
    var d = warped.data, W = warped.width, H = warped.height;
    for (var y = 0; y < h; y++) {
      var sy = Math.min(H - 1, Math.max(0, y0 + y));
      for (var x = 0; x < w; x++) {
        var sx = Math.min(W - 1, Math.max(0, x0 + x));
        out[y * w + x] = d[(sy * W + sx) * 4 + 2];
      }
    }
    return { gray: out, w: w, h: h };
  }

  function percentile(arr, p) {
    var hist = histogramOf(arr);
    var target = arr.length * p, acc = 0;
    for (var i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc >= target) return i;
    }
    return 255;
  }

  function binarizeCell(crop) {
    var paper = percentile(crop.gray, 0.90);
    var darkest = percentile(crop.gray, 0.01);
    if (paper - darkest < 45) {
      return { mask: new Uint8Array(crop.w * crop.h), ink: 0, empty: true };
    }
    /* 잉크로 인정할 어둡기의 상한.
     *
     * 안내선은 컬러로 인쇄하면 파랑 채널에서 알아서 사라지지만, 흑백 프린터로
     * 뽑으면 연한 회색 실물이 되어 남는다. 게다가 점선이라 조각마다 칸 테두리에
     * 닿지 않아 '가늘고 긴 선 제거'도 빠져나간다. 그래서 종이 밝기의 62% 보다
     * 어두운 것만 잉크로 본다. 안내선(종이 대비 약 74%)은 걸러지고
     * 검은 펜(약 15%)은 넉넉히 통과한다. */
    var thr = Math.min(otsu(histogramOf(crop.gray), crop.gray.length),
                       paper - 45, paper * 0.62);
    var mask = new Uint8Array(crop.w * crop.h);
    var ink = 0;
    for (var i = 0; i < mask.length; i++) {
      if (crop.gray[i] < thr) { mask[i] = 1; ink++; }
    }
    return { mask: mask, ink: ink, empty: false };
  }

  /* 남은 안내선 자국과 먼지를 지운다. */
  function cleanCell(mask, w, h) {
    var cc = connectedComponents(mask, w, h);
    var minArea = Math.max(6, Math.round(w * h * 0.0008));
    var keep = {};
    cc.stats.forEach(function (s) {
      if (s.area < minArea) return;
      var touches = s.x <= 1 || s.y <= 1 || s.x + s.w >= w - 1 || s.y + s.h >= h - 1;
      var thinH = s.w > w * 0.65 && s.h <= Math.max(4, h * 0.09);
      var thinV = s.h > h * 0.65 && s.w <= Math.max(4, w * 0.09);
      if (touches && (thinH || thinV)) return;     // 칸 테두리 잔상
      keep[s.id] = true;
    });
    var out = new Uint8Array(w * h);
    var kept = 0;
    for (var i = 0; i < out.length; i++) {
      if (mask[i] && keep[cc.labels[i]]) { out[i] = 1; kept++; }
    }
    return { mask: out, ink: kept };
  }

  function inkBBox(mask, w, h) {
    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  function extractCells(warped, layout, page) {
    var s = warped.scale;
    return page.cells.map(function (cell) {
      var crop = cropBlue(warped, cell.writeRect, s);
      var bin = binarizeCell(crop);
      var cleaned = bin.empty ? { mask: bin.mask, ink: 0 } : cleanCell(bin.mask, crop.w, crop.h);
      var bbox = cleaned.ink ? inkBBox(cleaned.mask, crop.w, crop.h) : null;
      var area = crop.w * crop.h;
      var status = 'ok';
      if (!bbox || cleaned.ink < area * 0.004) status = 'empty';
      else if (cleaned.ink < area * 0.012) status = 'faint';

      // 베이스라인을 이 잘라낸 조각 안의 좌표로 옮긴다
      var baselineLocal = (cell.baselineY - cell.writeRect[1]) * s;

      return {
        key: cell.key, kind: cell.kind, form: cell.form, idx: cell.idx,
        unicode: cell.unicode, hint: cell.hint,
        mask: cleaned.mask, w: crop.w, h: crop.h,
        bbox: bbox, ink: cleaned.ink, status: status,
        baselineLocal: baselineLocal,
        cellHeight: cell.rect[3] * s,
        cellTopOffset: (cell.writeRect[1] - cell.rect[1]) * s
      };
    });
  }

  // ---------- 전체 흐름 ----------

  /* 사진 한 장을 처리한다.
   * 반환 { ok, reason?, pageIndex, scope, cells, preview } */
  function processImage(source, opts) {
    var work = toImageData(source, MAX_WORK);
    var detect = toImageData(source, MAX_DETECT);
    var quadSmall = findMarkers(detect);
    if (!quadSmall) {
      return { ok: false, reason: 'marker' };
    }
    var k = work.width / detect.width;
    var quad = quadSmall.map(function (p) { return [p[0] * k, p[1] * k]; });

    // 뒤집혀 찍혔을 수 있으므로 네 방향을 모두 시도한다
    for (var rot = 0; rot < 4; rot++) {
      var rotated = quad.slice(rot).concat(quad.slice(0, rot));
      var layoutLatin = opts.layouts.latin, layoutFull = opts.layouts.full;
      var probe = warp(work, rotated, layoutLatin, 0.35);   // 코드만 읽을 저해상도
      if (!probe) continue;
      var code = readCode(probe, layoutLatin);
      if (!code) continue;

      var layout = code.scope === 'full' ? layoutFull : layoutLatin;
      if (code.pageIndex >= layout.pages.length) continue;

      var warped = warp(work, rotated, layout, WARP_SCALE);
      if (!warped) continue;
      var cells = extractCells(warped, layout, layout.pages[code.pageIndex]);
      return {
        ok: true, pageIndex: code.pageIndex, scope: code.scope,
        cells: cells, warped: warped, layout: layout
      };
    }
    return { ok: false, reason: 'code' };
  }

  function loadFile(file) {
    if (root.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(function () { return loadViaImg(file); });
    }
    return loadViaImg(file);
  }

  function loadViaImg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('이미지를 열 수 없습니다')); };
      im.src = url;
    });
  }

  HF.imageproc = {
    processImage: processImage, loadFile: loadFile,
    findMarkers: findMarkers, warp: warp, homography: homography,
    connectedComponents: connectedComponents, otsu: otsu, histogramOf: histogramOf,
    inkBBox: inkBBox, toImageData: toImageData, WARP_SCALE: WARP_SCALE
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
