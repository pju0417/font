/* 트루타입(.ttf) 파일 작성기.
 *
 * 외부 라이브러리를 쓰지 않는 이유는 '합성 글리프'가 꼭 필요해서다.
 * 한글 11,172자를 낱낱이 그려 넣으면 파일이 수십 MB가 되지만,
 * 자모 86개만 실제로 그려 두고 음절은 "자모를 이만큼 늘려 여기에 놓아라"는
 * 참조로만 적으면 파일이 수백 KB로 끝난다.
 *
 * 글리프 자료 구조
 *   { advance, contours: [[{x,y,on}]] }            ← 직접 그린 글자
 *   { advance, components: [{glyph, dx, dy, sx, sy}] }  ← 조합한 글자
 * 좌표는 폰트 단위(y가 위로 증가)로 넣는다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  // ---------- 바이트 쓰기 도구 ----------

  function Writer(cap) {
    this.buf = new Uint8Array(cap || 1024);
    this.view = new DataView(this.buf.buffer);
    this.len = 0;
  }
  Writer.prototype._need = function (n) {
    if (this.len + n <= this.buf.length) return;
    var size = this.buf.length;
    while (size < this.len + n) size *= 2;
    var nb = new Uint8Array(size);
    nb.set(this.buf.subarray(0, this.len));
    this.buf = nb;
    this.view = new DataView(nb.buffer);
  };
  Writer.prototype.u8 = function (v) { this._need(1); this.view.setUint8(this.len, v); this.len += 1; return this; };
  Writer.prototype.i8 = function (v) { this._need(1); this.view.setInt8(this.len, v); this.len += 1; return this; };
  Writer.prototype.u16 = function (v) { this._need(2); this.view.setUint16(this.len, v); this.len += 2; return this; };
  Writer.prototype.i16 = function (v) { this._need(2); this.view.setInt16(this.len, v); this.len += 2; return this; };
  Writer.prototype.u32 = function (v) { this._need(4); this.view.setUint32(this.len, v >>> 0); this.len += 4; return this; };
  Writer.prototype.i32 = function (v) { this._need(4); this.view.setInt32(this.len, v); this.len += 4; return this; };
  Writer.prototype.bytes = function (arr) {
    this._need(arr.length);
    this.buf.set(arr, this.len);
    this.len += arr.length;
    return this;
  };
  Writer.prototype.tag = function (s) {
    for (var i = 0; i < 4; i++) this.u8(s.charCodeAt(i));
    return this;
  };
  Writer.prototype.pad4 = function () {
    while (this.len % 4) this.u8(0);
    return this;
  };
  Writer.prototype.result = function () { return this.buf.subarray(0, this.len); };

  function clampI16(v) { return Math.max(-32768, Math.min(32767, Math.round(v))); }
  function f2dot14(v) { return clampI16(Math.round(v * 16384)); }

  // ---------- glyf ----------

  function glyphBBox(glyph, all, memo) {
    if (memo) {
      var hit = memo.get(glyph);
      if (hit !== undefined) return hit;
    }
    var res = computeBBox(glyph, all, memo);
    if (memo) memo.set(glyph, res);
    return res;
  }

  function computeBBox(glyph, all, memo) {
    if (glyph.components) {
      var xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
      glyph.components.forEach(function (c) {
        var b = glyphBBox(all[c.glyph], all, memo);
        if (!b) return;
        var xs = [b.xMin * c.sx + c.dx, b.xMax * c.sx + c.dx];
        var ys = [b.yMin * c.sy + c.dy, b.yMax * c.sy + c.dy];
        xMin = Math.min(xMin, xs[0], xs[1]); xMax = Math.max(xMax, xs[0], xs[1]);
        yMin = Math.min(yMin, ys[0], ys[1]); yMax = Math.max(yMax, ys[0], ys[1]);
      });
      if (xMax === -Infinity) return null;
      return { xMin: xMin, yMin: yMin, xMax: xMax, yMax: yMax };
    }
    var cs = glyph.contours || [];
    if (!cs.length) return null;
    var a = Infinity, b2 = Infinity, c2 = -Infinity, d = -Infinity;
    cs.forEach(function (ct) {
      ct.forEach(function (p) {
        if (p.x < a) a = p.x;
        if (p.x > c2) c2 = p.x;
        if (p.y < b2) b2 = p.y;
        if (p.y > d) d = p.y;
      });
    });
    return { xMin: a, yMin: b2, xMax: c2, yMax: d };
  }

  function writeSimpleGlyph(g, bbox) {
    var w = new Writer(512);
    var cs = g.contours;
    w.i16(cs.length);
    w.i16(clampI16(bbox.xMin)).i16(clampI16(bbox.yMin));
    w.i16(clampI16(bbox.xMax)).i16(clampI16(bbox.yMax));

    var total = 0;
    cs.forEach(function (c) { total += c.length; w.u16(total - 1); });
    w.u16(0);   // 명령어 없음

    var pts = [];
    cs.forEach(function (c) {
      c.forEach(function (p) { pts.push({ x: Math.round(p.x), y: Math.round(p.y), on: p.on }); });
    });

    // 플래그 (같은 값이 이어지면 REPEAT 로 줄인다)
    var flags = [], xs = [], ys = [];
    var px = 0, py = 0;
    for (var i = 0; i < pts.length; i++) {
      var dx = pts[i].x - px, dy = pts[i].y - py;
      px = pts[i].x; py = pts[i].y;
      var f = pts[i].on ? 1 : 0;
      if (dx === 0) f |= 0x10;
      else if (dx >= -255 && dx <= 255) { f |= 0x02; if (dx > 0) f |= 0x10; xs.push({ short: true, v: Math.abs(dx) }); }
      else xs.push({ short: false, v: dx });
      if (dy === 0) f |= 0x20;
      else if (dy >= -255 && dy <= 255) { f |= 0x04; if (dy > 0) f |= 0x20; ys.push({ short: true, v: Math.abs(dy) }); }
      else ys.push({ short: false, v: dy });
      flags.push(f);
    }

    for (i = 0; i < flags.length;) {
      var f2 = flags[i], j = i + 1;
      while (j < flags.length && flags[j] === f2 && j - i < 256) j++;
      var rep = j - i - 1;
      if (rep > 0) { w.u8(f2 | 0x08); w.u8(rep); }
      else w.u8(f2);
      i = j;
    }
    xs.forEach(function (e) { e.short ? w.u8(e.v) : w.i16(e.v); });
    ys.forEach(function (e) { e.short ? w.u8(e.v) : w.i16(e.v); });
    return w.result();
  }

  function writeCompositeGlyph(g, bbox) {
    var w = new Writer(256);
    w.i16(-1);
    w.i16(clampI16(bbox.xMin)).i16(clampI16(bbox.yMin));
    w.i16(clampI16(bbox.xMax)).i16(clampI16(bbox.yMax));
    var comps = g.components;
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      var flags = 0x0001 | 0x0002 | 0x0040;   // 인자는 16비트 / xy 이동 / x·y 배율
      if (i < comps.length - 1) flags |= 0x0020;   // 뒤에 부품이 더 있다
      w.u16(flags);
      w.u16(c.glyph);
      w.i16(clampI16(c.dx)).i16(clampI16(c.dy));
      w.i16(f2dot14(c.sx)).i16(f2dot14(c.sy));
    }
    return w.result();
  }

  // ---------- cmap (형식 4) ----------

  function buildCmap4(pairs) {
    pairs = pairs.slice().sort(function (a, b) { return a[0] - b[0]; });
    var segs = [];
    var i = 0;
    while (i < pairs.length) {
      var j = i + 1;
      while (j < pairs.length && pairs[j][0] === pairs[j - 1][0] + 1) j++;
      var run = pairs.slice(i, j);
      var contiguous = run.every(function (p, k) { return p[1] === run[0][1] + k; });
      segs.push({
        start: run[0][0], end: run[run.length - 1][0],
        delta: contiguous ? (run[0][1] - run[0][0]) & 0xFFFF : 0,
        ids: contiguous ? null : run.map(function (p) { return p[1]; })
      });
      i = j;
    }
    segs.push({ start: 0xFFFF, end: 0xFFFF, delta: 1, ids: null });

    var segCount = segs.length;
    var w = new Writer(4096);
    var glyphIdArray = [];
    // idRangeOffset 은 "그 필드 위치에서 glyphIdArray 항목까지의 바이트 거리"
    var offsets = segs.map(function (s, k) {
      if (!s.ids) return 0;
      var off = (segCount - k) * 2 + glyphIdArray.length * 2;
      glyphIdArray = glyphIdArray.concat(s.ids);
      return off;
    });

    var length = 16 + segCount * 8 + glyphIdArray.length * 2;
    w.u16(4).u16(length).u16(0);
    var sr = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
    w.u16(segCount * 2).u16(sr).u16(Math.log2(sr / 2)).u16(segCount * 2 - sr);
    segs.forEach(function (s) { w.u16(s.end); });
    w.u16(0);
    segs.forEach(function (s) { w.u16(s.start); });
    segs.forEach(function (s) { w.i16(s.delta > 32767 ? s.delta - 65536 : s.delta); });
    offsets.forEach(function (o) { w.u16(o); });
    glyphIdArray.forEach(function (g) { w.u16(g); });
    return w.result();
  }

  function buildCmap(pairs) {
    var sub = buildCmap4(pairs);
    var w = new Writer(sub.length + 32);
    w.u16(0).u16(2);                       // 인코딩 표 2개가 같은 표를 가리킨다
    var base = 4 + 2 * 8;
    w.u16(3).u16(1).u32(base);             // Windows · BMP
    w.u16(0).u16(3).u32(base);             // Unicode · BMP
    w.bytes(sub);
    return w.result();
  }

  // ---------- name ----------

  function buildName(records) {
    var w = new Writer(2048);
    var entries = [];
    records.forEach(function (r) {
      // Windows(플랫폼 3): UTF-16BE
      var u = [];
      for (var i = 0; i < r.value.length; i++) {
        var c = r.value.charCodeAt(i);
        u.push(c >> 8, c & 0xFF);
      }
      entries.push({ p: 3, e: 1, l: r.lang != null ? r.lang : 0x409, id: r.id, data: u });
      // Mac(플랫폼 1): 아스키 범위만
      if (r.lang == null || r.lang === 0x409) {
        var a = [];
        var ascii = true;
        for (i = 0; i < r.value.length; i++) {
          var cc = r.value.charCodeAt(i);
          if (cc > 126) { ascii = false; break; }
          a.push(cc);
        }
        if (ascii) entries.push({ p: 1, e: 0, l: 0, id: r.id, data: a });
      }
    });
    entries.sort(function (a, b) {
      return (a.p - b.p) || (a.e - b.e) || (a.l - b.l) || (a.id - b.id);
    });

    var storage = [], offsets = [];
    entries.forEach(function (e) {
      offsets.push(storage.length);
      storage = storage.concat(e.data);
    });

    w.u16(0).u16(entries.length).u16(6 + entries.length * 12);
    entries.forEach(function (e, i) {
      w.u16(e.p).u16(e.e).u16(e.l).u16(e.id).u16(e.data.length).u16(offsets[i]);
    });
    w.bytes(new Uint8Array(storage));
    return w.result();
  }

  // ---------- 표 묶기 ----------

  function checksum(data) {
    var sum = 0;
    var n = data.length;
    var padded = new Uint8Array(Math.ceil(n / 4) * 4);
    padded.set(data);
    var dv = new DataView(padded.buffer);
    for (var i = 0; i < padded.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
    return sum;
  }

  function assemble(tables) {
    var tags = Object.keys(tables).sort();
    var n = tags.length;
    var sr = 16 * Math.pow(2, Math.floor(Math.log2(n)));
    var head = new Writer(12 + n * 16);
    head.u32(0x00010000).u16(n).u16(sr).u16(Math.log2(sr / 16)).u16(n * 16 - sr);

    var offset = 12 + n * 16;
    var records = [];
    tags.forEach(function (t) {
      var d = tables[t];
      records.push({ tag: t, offset: offset, length: d.length, sum: checksum(d) });
      offset += Math.ceil(d.length / 4) * 4;
    });
    records.forEach(function (r) {
      head.tag(r.tag).u32(r.sum).u32(r.offset).u32(r.length);
    });

    var out = new Uint8Array(offset);
    out.set(head.result(), 0);
    records.forEach(function (r) { out.set(tables[r.tag], r.offset); });

    // head 의 checkSumAdjustment 를 마지막에 채운다
    var headRec = records.filter(function (r) { return r.tag === 'head'; })[0];
    var dv = new DataView(out.buffer);
    dv.setUint32(headRec.offset + 8, 0);
    var total = checksum(out);
    dv.setUint32(headRec.offset + 8, (0xB1B0AFBA - total) >>> 0);
    return out;
  }

  // ---------- 본체 ----------

  /* glyphs[0] 은 반드시 .notdef.
   * info: { familyName, styleName, familyNameKo, version, copyright, license,
   *         unitsPerEm, ascent, descent } */
  function build(glyphs, cmapPairs, info) {
    var upm = info.unitsPerEm || 1000;
    var ascent = info.ascent != null ? info.ascent : 800;
    var descent = info.descent != null ? info.descent : 200;   // 양수로 받는다

    var memo = new Map();
    var bboxes = glyphs.map(function (g) { return glyphBBox(g, glyphs, memo); });

    var glyfW = new Writer(1 << 20);
    var loca = [0];
    var maxPoints = 0, maxContours = 0, maxComp = 0;
    glyphs.forEach(function (g, i) {
      var b = bboxes[i];
      var hasOutline = b && ((g.components && g.components.length) ||
                             (g.contours && g.contours.length));
      if (hasOutline) {
        var data = g.components ? writeCompositeGlyph(g, b) : writeSimpleGlyph(g, b);
        glyfW.bytes(data);
        glyfW.pad4();
        if (g.components) maxComp = Math.max(maxComp, g.components.length);
        else {
          maxContours = Math.max(maxContours, g.contours.length);
          var np = 0;
          g.contours.forEach(function (c) { np += c.length; });
          maxPoints = Math.max(maxPoints, np);
        }
      }
      loca.push(glyfW.len);
    });
    var glyf = glyfW.result();

    var locaW = new Writer(loca.length * 4);
    loca.forEach(function (v) { locaW.u32(v); });

    // 전체 경계 상자
    var xMin = 0, yMin = 0, xMax = 0, yMax = 0, advMax = 0;
    bboxes.forEach(function (b) {
      if (!b) return;
      xMin = Math.min(xMin, b.xMin); yMin = Math.min(yMin, b.yMin);
      xMax = Math.max(xMax, b.xMax); yMax = Math.max(yMax, b.yMax);
    });
    glyphs.forEach(function (g) { advMax = Math.max(advMax, g.advance || 0); });

    var hmtxW = new Writer(glyphs.length * 4);
    glyphs.forEach(function (g, i) {
      hmtxW.u16(Math.max(0, Math.round(g.advance || 0)));
      hmtxW.i16(clampI16(bboxes[i] ? bboxes[i].xMin : 0));
    });

    var now = Math.floor(Date.now() / 1000) + 2082844800;   // 1904년 기준 초
    var headW = new Writer(54);
    headW.u32(0x00010000).u32(0x00010000).u32(0).u32(0x5F0F3CF5);
    headW.u16(0x0003).u16(upm);
    headW.u32(0).u32(now).u32(0).u32(now);
    headW.i16(clampI16(xMin)).i16(clampI16(yMin)).i16(clampI16(xMax)).i16(clampI16(yMax));
    headW.u16(0).u16(8).i16(2).i16(1).i16(0);

    // 받침이나 내려가는 획이 잘리지 않도록 실제 글리프 크기까지 여백을 넓힌다
    var winAsc = Math.max(ascent, Math.ceil(yMax));
    var winDesc = Math.max(descent, Math.ceil(-yMin));

    var hheaW = new Writer(36);
    hheaW.u32(0x00010000);
    hheaW.i16(winAsc).i16(-winDesc).i16(0);
    hheaW.u16(Math.round(advMax));
    hheaW.i16(clampI16(xMin)).i16(0).i16(clampI16(xMax));
    hheaW.i16(1).i16(0).i16(0);
    hheaW.i16(0).i16(0).i16(0).i16(0);
    hheaW.i16(0).u16(glyphs.length);

    var maxpW = new Writer(32);
    maxpW.u32(0x00010000).u16(glyphs.length);
    maxpW.u16(maxPoints).u16(maxContours).u16(maxPoints * 3).u16(maxContours * 3);
    maxpW.u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);
    maxpW.u16(Math.max(1, maxComp)).u16(1);

    var os2 = new Writer(96);
    var R = Math.round;
    os2.u16(4).i16(R(upm * 0.55)).u16(400).u16(5).u16(0);
    os2.i16(R(upm * 0.65)).i16(R(upm * 0.7)).i16(0).i16(R(upm * 0.14));   // 아래첨자
    os2.i16(R(upm * 0.65)).i16(R(upm * 0.7)).i16(0).i16(R(upm * 0.48));   // 위첨자
    os2.i16(Math.round(upm * 0.05)).i16(Math.round(upm * 0.26));      // 취소선
    os2.i16(0);
    for (var p = 0; p < 10; p++) os2.u8(p === 0 ? 2 : 0);             // PANOSE
    os2.u32(1 | (1 << 28)).u32(1 << 24).u32(0).u32(0);                // 유니코드 범위
    var vend = (info.vendorId || 'NONE').padEnd(4, ' ').slice(0, 4);
    for (p = 0; p < 4; p++) os2.u8(vend.charCodeAt(p));
    os2.u16(0x0040);                                                  // REGULAR
    var lo = 0xFFFF, hi = 0;
    cmapPairs.forEach(function (c) {
      if (c[0] < lo) lo = c[0];
      if (c[0] > hi) hi = c[0];
    });
    os2.u16(lo).u16(Math.min(0xFFFF, hi));
    os2.i16(ascent).i16(-descent).i16(0);     // 줄 간격은 설계값 그대로
    os2.u16(winAsc).u16(winDesc);             // 잘림 방지용 여백은 넉넉히
    os2.u32(1 | (1 << 19) | (1 << 21)).u32(0);                        // 라틴1 · 한국어
    os2.i16(Math.round(upm * 0.5)).i16(Math.round(upm * 0.7));
    os2.u16(0).u16(32).u16(2);

    var postW = new Writer(32);
    postW.u32(0x00030000).u32(0).i16(0).i16(Math.round(upm * 0.05));
    postW.u32(0).u32(0).u32(0).u32(0).u32(0);

    var fam = info.familyName || 'Handwriting';
    var style = info.styleName || 'Regular';
    var psName = (fam + '-' + style).replace(/[^A-Za-z0-9-]/g, '') || 'Handwriting-Regular';
    var nameRecords = [
      { id: 0, value: info.copyright || '' },
      { id: 1, value: fam },
      { id: 2, value: style },
      { id: 3, value: fam + ' ' + style + ' ' + (info.version || '1.000') },
      { id: 4, value: fam + ' ' + style },
      { id: 5, value: 'Version ' + (info.version || '1.000') },
      { id: 6, value: psName }
    ].filter(function (r) { return r.value; });
    if (info.license) nameRecords.push({ id: 13, value: info.license });
    if (info.familyNameKo) {
      nameRecords.push({ id: 1, lang: 0x412, value: info.familyNameKo });
      nameRecords.push({ id: 4, lang: 0x412, value: info.familyNameKo + ' ' + style });
    }

    return assemble({
      'head': headW.result(),
      'hhea': hheaW.result(),
      'maxp': maxpW.result(),
      'OS/2': os2.result(),
      'hmtx': hmtxW.result(),
      'cmap': buildCmap(cmapPairs),
      'loca': locaW.result(),
      'glyf': glyf,
      'name': buildName(nameRecords),
      'post': postW.result()
    });
  }

  HF.ttf = { build: build, Writer: Writer, buildCmap4: buildCmap4, checksum: checksum };
})(typeof globalThis !== 'undefined' ? globalThis : this);
