/* 추출된 칸 비트맵들을 모아 하나의 .ttf 로 조립한다. */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var UPM = 1000;
  var ASCENT = 800;
  var DESCENT = 200;
  var SIDE_BEARING = 60;
  var SPACE_RATIO = 0.32;
  var ASPECT_LOCK = 0.5;   // 0 = 상자에 꽉 맞춤(획 굵기 왜곡), 1 = 비율 유지(빈틈)

  // 음절 상자(폰트 좌표, y는 위로)
  var SYL = { left: 40, top: 780, w: 920, h: 880 };

  function unitToFont(u) {
    return {
      xMin: SYL.left + u[0] * SYL.w,
      xMax: SYL.left + (u[0] + u[2]) * SYL.w,
      yMax: SYL.top - u[1] * SYL.h,
      yMin: SYL.top - (u[1] + u[3]) * SYL.h
    };
  }

  function boxW(b) { return b.xMax - b.xMin; }
  function boxH(b) { return b.yMax - b.yMin; }

  function traceCell(cell, traceOpts) {
    if (cell.status === 'empty' || !cell.bbox) return null;
    var contours = HF.trace.outline(cell.mask, cell.w, cell.h, traceOpts);
    return contours.length ? contours : null;
  }

  /* 라틴: 베이스라인을 y=0 에 맞추고, 모든 칸에 같은 배율을 써서
   * 글자끼리의 크기 관계(대문자 vs 소문자)를 그대로 살린다.
   *
   * 배율의 기준은 '쓰기 띠' 높이다. 잘라낸 높이를 쓰면, 내려가는 획을 담으려고
   * 아래를 넓게 자른 만큼 글자가 통째로 작아져 버린다. */
  function latinGlyph(cell, contours) {
    var s = UPM / (cell.bandHeight || cell.h);
    var xoff = SIDE_BEARING - cell.bbox.x * s;
    var out = contours.map(function (c) {
      return c.map(function (p) {
        return { x: p.x * s + xoff, y: (cell.baselineLocal - p.y) * s, on: p.on };
      });
    });
    return {
      contours: out,
      advance: Math.round(cell.bbox.w * s + SIDE_BEARING * 2)
    };
  }

  /* 칸 전체를 '음절 상자' 에 그대로 겹쳐 놓는다.
   *
   * 잉크 영역을 안내 상자에 억지로 맞추지 않는 것이 중요하다. 그렇게 하면
   * 'ㅣ' 처럼 획 하나짜리 자모가 상자만큼 굵은 막대가 되어 버린다.
   * 쓴 자리를 그대로 두고, 조립할 때는 안내 상자를 기준으로 늘인다. */
  function squareGlyph(cell, contours) {
    var sx = SYL.w / cell.w;
    var sy = SYL.h / cell.h;
    var out = contours.map(function (c) {
      return c.map(function (p) {
        return { x: SYL.left + p.x * sx, y: SYL.top - p.y * sy, on: p.on };
      });
    });
    return { contours: out, advance: UPM };
  }

  function componentFor(G, B) {
    var sxRaw = boxW(B) / boxW(G);
    var syRaw = boxH(B) / boxH(G);
    var su = Math.sqrt(sxRaw * syRaw);
    var sx = Math.pow(sxRaw, 1 - ASPECT_LOCK) * Math.pow(su, ASPECT_LOCK);
    var sy = Math.pow(syRaw, 1 - ASPECT_LOCK) * Math.pow(su, ASPECT_LOCK);
    var w = boxW(G) * sx, h = boxH(G) * sy;
    return {
      sx: sx, sy: sy,
      dx: B.xMin + (boxW(B) - w) / 2 - sx * G.xMin,
      dy: B.yMin + (boxH(B) - h) / 2 - sy * G.yMin
    };
  }

  /* 호환용 낱자(ㄱ ㄴ ㅏ …)도 직접 칠 수 있게 매핑한다 */
  function compatJamoMap(jamoIndex) {
    var pairs = [];
    var H = HF.hangul;
    for (var cp = 0x3131; cp <= 0x3163; cp++) {
      var ch = String.fromCharCode(cp);
      var key = null;
      var i = H.CHO.indexOf(ch);
      if (i >= 0 && jamoIndex['C:V:' + i] != null) key = 'C:V:' + i;
      if (!key) {
        i = H.JUNG.indexOf(ch);
        if (i >= 0 && jamoIndex['J:' + i] != null) key = 'J:' + i;
      }
      if (!key) {
        i = H.JONG.indexOf(ch);
        if (i > 0 && jamoIndex['T:' + i] != null) key = 'T:' + i;
      }
      if (key) pairs.push([cp, jamoIndex[key]]);
    }
    return pairs;
  }

  /* collected: { key: cell }  (여러 사진에서 모은 결과)
   * info: 폰트 이름 등
   * onProgress(ratio, label) */
  function build(collected, info, onProgress) {
    var report = { glyphs: {}, latin: 0, jamo: 0, written: 0, syllables: 0,
                   missing: [], skipped: [] };
    var traceOpts = {
      smoothPasses: info.smoothPasses != null ? info.smoothPasses : 2,
      simplifyEps: info.simplifyEps != null ? info.simplifyEps : 0.9,
      cornerDeg: 62
    };

    var glyphs = [{ advance: 600, contours: [] }];          // 0 = .notdef
    var cmap = [];
    glyphs.push({ advance: Math.round(UPM * SPACE_RATIO), contours: [] });
    cmap.push([0x20, 1]);

    var keys = Object.keys(collected).sort();
    var jamoIndex = {}, jamoGeom = {}, writtenSyllables = {};
    var latinPairs = [];
    var done = 0;

    keys.forEach(function (key) {
      var cell = collected[key];
      done++;
      if (onProgress && done % 12 === 0) onProgress(0.15 + 0.45 * done / keys.length, '획 따는 중');

      var contours = traceCell(cell, traceOpts);
      if (!contours) {
        report.glyphs[key] = { status: cell.status === 'empty' ? 'empty' : 'failed', hint: cell.hint };
        report.skipped.push(key);
        return;
      }
      var idx = glyphs.length;
      if (cell.kind === 'latin') {
        glyphs.push(latinGlyph(cell, contours));
        latinPairs.push([cell.unicode, idx]);
        report.latin++;
      } else if (cell.kind === 'syllable') {
        // 통째로 쓴 글자. 자모를 조합해 만든 것보다 우선한다.
        glyphs.push(squareGlyph(cell, contours));
        writtenSyllables[cell.unicode] = idx;
        report.written++;
      } else {
        glyphs.push(squareGlyph(cell, contours));
        jamoGeom[key] = unitToFont(HF.hangul.guideBox(cell.kind, cell.form));
        jamoIndex[key] = idx;
        report.jamo++;
      }
      report.glyphs[key] = {
        status: cell.status, hint: cell.hint,
        points: contours.reduce(function (n, c) { return n + c.length; }, 0)
      };
    });

    cmap = cmap.concat(latinPairs);

    // 통째로 쓴 글자를 먼저 등록한다
    Object.keys(writtenSyllables).forEach(function (code) {
      cmap.push([+code, writtenSyllables[code]]);
    });

    // ---- 한글 음절 조립 ----
    if (Object.keys(jamoIndex).length) {
      if (onProgress) onProgress(0.62, '한글 음절 조립 중');
      var missing = {};
      for (var code = HF.hangul.FIRST; code <= HF.hangul.LAST; code++) {
        if (writtenSyllables[code] != null) continue;   // 손으로 쓴 글자가 이긴다
        var parts = HF.hangul.compose(code);
        var comps = [];
        var ok = true;
        for (var i = 0; i < parts.length; i++) {
          var gi = jamoIndex[parts[i].key];
          if (gi == null) { missing[parts[i].key] = true; ok = false; break; }
          var t = componentFor(jamoGeom[parts[i].key], unitToFont(parts[i].box));
          comps.push({ glyph: gi, dx: t.dx, dy: t.dy, sx: t.sx, sy: t.sy });
        }
        if (!ok) continue;
        cmap.push([code, glyphs.length]);
        glyphs.push({ advance: UPM, components: comps });
        report.syllables++;
      }
      report.missing = Object.keys(missing).sort();
      cmap = cmap.concat(compatJamoMap(jamoIndex));
    }

    if (onProgress) onProgress(0.8, '폰트 파일 쓰는 중');
    var ttf = HF.ttf.build(glyphs, cmap, {
      familyName: info.familyName, styleName: info.styleName || 'Regular',
      familyNameKo: info.familyNameKo, version: info.version || '1.000',
      copyright: info.copyright, license: info.license, vendorId: info.vendorId,
      unitsPerEm: UPM, ascent: ASCENT, descent: DESCENT
    });
    report.glyphCount = glyphs.length;
    report.byteLength = ttf.length;
    return { ttf: ttf, report: report };
  }

  HF.fontbuild = {
    build: build, unitToFont: unitToFont,
    UPM: UPM, ASCENT: ASCENT, DESCENT: DESCENT, SYL: SYL
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
