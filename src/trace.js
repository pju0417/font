/* 흑백 비트맵 → 부드러운 윤곽선.
 *
 * 1) 잉크 픽셀의 경계를 따라가 계단 모양 다각형을 얻는다
 * 2) 계단을 평활화하고 필요 없는 점을 지운다
 * 3) 꺾이는 곳만 '곡선 위의 점'으로, 나머지는 '조종점'으로 표시한다
 *    → 트루타입의 2차 베지에가 자연스러운 곡선을 그린다
 *
 * 경계를 도는 방향 덕분에 부호 있는 넓이만 보고 바깥선/구멍을 구분할 수 있다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  function traceContours(mask, w, h) {
    var VW = w + 1;
    var edges = [];                 // {ax,ay,bx,by,used}
    var outFrom = new Map();        // 시작점 → 간선 인덱스 배열

    function add(ax, ay, bx, by) {
      var i = edges.length;
      edges.push({ ax: ax, ay: ay, bx: bx, by: by, used: false });
      var k = ay * VW + ax;
      var list = outFrom.get(k);
      if (list) list.push(i); else outFrom.set(k, [i]);
    }

    function ink(x, y) {
      return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
    }

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        if (!ink(x, y - 1)) add(x, y, x + 1, y);
        if (!ink(x + 1, y)) add(x + 1, y, x + 1, y + 1);
        if (!ink(x, y + 1)) add(x + 1, y + 1, x, y + 1);
        if (!ink(x - 1, y)) add(x, y + 1, x, y);
      }
    }

    var loops = [];
    for (var s = 0; s < edges.length; s++) {
      if (edges[s].used) continue;
      var loop = [];
      var cur = s;
      while (cur >= 0 && !edges[cur].used) {
        var e = edges[cur];
        e.used = true;
        loop.push([e.ax, e.ay]);
        cur = pickNext(e);
      }
      if (loop.length >= 4) loops.push(loop);
    }

    function pickNext(e) {
      var list = outFrom.get(e.by * VW + e.bx);
      if (!list) return -1;
      var dx = e.bx - e.ax, dy = e.by - e.ay;
      var best = -1, bestAngle = -Infinity;
      for (var i = 0; i < list.length; i++) {
        var c = edges[list[i]];
        if (c.used) continue;
        var ox = c.bx - c.ax, oy = c.by - c.ay;
        var cross = dx * oy - dy * ox;      // y가 아래로 향하므로 양수 = 시계 방향
        var dot = dx * ox + dy * oy;
        var ang = Math.atan2(cross, dot);
        if (Math.abs(ang - Math.PI) < 1e-6) ang = -Math.PI;   // 되돌아가기는 가장 나중에
        if (ang > bestAngle) { bestAngle = ang; best = list[i]; }
      }
      return best;
    }

    return loops;
  }

  function signedArea(pts) {
    var s = 0;
    for (var i = 0; i < pts.length; i++) {
      var j = (i + 1) % pts.length;
      s += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return s / 2;
  }

  /* 닫힌 다각형에 [1,2,1]/4 필터를 걸어 계단을 없앤다 */
  function smooth(pts, passes) {
    var cur = pts;
    for (var p = 0; p < passes; p++) {
      var n = cur.length, next = new Array(n);
      for (var i = 0; i < n; i++) {
        var a = cur[(i - 1 + n) % n], b = cur[i], c = cur[(i + 1) % n];
        next[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
      }
      cur = next;
    }
    return cur;
  }

  /* Douglas-Peucker (닫힌 다각형은 가장 먼 두 점을 기준으로 두 갈래로 나눠 처리) */
  function simplifyClosed(pts, eps) {
    var n = pts.length;
    if (n < 8) return pts;
    var iFar = 0, dMax = -1;
    for (var i = 1; i < n; i++) {
      var d = sqDist(pts[0], pts[i]);
      if (d > dMax) { dMax = d; iFar = i; }
    }
    var a = pts.slice(0, iFar + 1);
    var b = pts.slice(iFar).concat([pts[0]]);
    var ra = dp(a, eps), rb = dp(b, eps);
    return ra.slice(0, -1).concat(rb.slice(0, -1));
  }

  function dp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var first = pts[0], last = pts[pts.length - 1];
    var idx = -1, max = 0;
    for (var i = 1; i < pts.length - 1; i++) {
      var d = perpDist(pts[i], first, last);
      if (d > max) { max = d; idx = i; }
    }
    if (max <= eps) return [first, last];
    var left = dp(pts.slice(0, idx + 1), eps);
    var right = dp(pts.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }

  function sqDist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  function perpDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var len = dx * dx + dy * dy;
    if (len < 1e-12) return Math.sqrt(sqDist(p, a));
    var t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  /* 꺾임이 큰 점만 '곡선 위의 점'으로 남긴다.
   * 나머지는 조종점이 되어, 트루타입이 이웃 조종점의 중점을 지나는
   * 부드러운 곡선을 자동으로 만들어 준다. */
  function markOnCurve(pts, cornerDeg) {
    var n = pts.length;
    var lim = Math.cos(cornerDeg * Math.PI / 180);
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
      var ux = b[0] - a[0], uy = b[1] - a[1];
      var vx = c[0] - b[0], vy = c[1] - b[1];
      var lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
      var on = true;
      if (lu > 1e-6 && lv > 1e-6) {
        var cosT = (ux * vx + uy * vy) / (lu * lv);
        on = cosT < lim;              // 많이 꺾이면 모서리 → 곡선 위의 점
      }
      out[i] = { x: b[0], y: b[1], on: on };
    }
    return out;
  }

  /* mask(0/1, y는 아래로) → 윤곽선 배열
   * opts: { smoothPasses, simplifyEps, cornerDeg, minArea } */
  function outline(mask, w, h, opts) {
    opts = opts || {};
    var passes = opts.smoothPasses != null ? opts.smoothPasses : 2;
    var eps = opts.simplifyEps != null ? opts.simplifyEps : 0.9;
    var cornerDeg = opts.cornerDeg != null ? opts.cornerDeg : 62;
    var minArea = opts.minArea != null ? opts.minArea : 6;

    var loops = traceContours(mask, w, h);
    var contours = [];
    loops.forEach(function (loop) {
      if (Math.abs(signedArea(loop)) < minArea) return;
      var pts = simplifyClosed(smooth(loop, passes), eps);
      if (pts.length < 3) return;
      contours.push(markOnCurve(pts, cornerDeg));
    });
    return contours;
  }

  HF.trace = {
    outline: outline, traceContours: traceContours,
    signedArea: signedArea, smooth: smooth, simplifyClosed: simplifyClosed
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
