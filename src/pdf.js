/* 아주 작은 PDF 작성기.
 * 필요한 기능이 "A4 한 장에 이미지 한 장" 뿐이라 외부 라이브러리를 쓰지 않는다.
 * JPEG 은 PDF 가 그대로 담을 수 있어(DCTDecode) 다시 압축할 필요가 없다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var A4_W = 595.276, A4_H = 841.890;   // 210 x 297 mm, 1pt = 1/72in

  function bytes(str) {
    var a = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) & 0xFF;
    return a;
  }

  function canvasToJpeg(canvas, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) return reject(new Error('JPEG 변환 실패'));
        blob.arrayBuffer().then(function (buf) {
          resolve(new Uint8Array(buf));
        }, reject);
      }, 'image/jpeg', quality || 0.95);
    });
  }

  /* canvases: A4 비율 캔버스 배열 → PDF Blob */
  function fromCanvases(canvases, quality) {
    return Promise.all(canvases.map(function (c) { return canvasToJpeg(c, quality); }))
      .then(function (jpegs) { return assemble(canvases, jpegs); });
  }

  function assemble(canvases, jpegs) {
    var chunks = [];
    var offset = 0;
    var offsets = {};       // 객체번호 → 파일 내 위치

    function push(u8) { chunks.push(u8); offset += u8.length; }
    function pushStr(s) { push(bytes(s)); }
    function obj(id, body) { offsets[id] = offset; pushStr(id + ' 0 obj\n' + body + '\nendobj\n'); }

    var n = canvases.length;
    var kids = [];
    for (var i = 0; i < n; i++) kids.push((3 + i * 3) + ' 0 R');

    pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>');

    for (i = 0; i < n; i++) {
      var pageId = 3 + i * 3, contId = pageId + 1, imgId = pageId + 2;
      obj(pageId,
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + A4_W.toFixed(3) + ' ' + A4_H.toFixed(3) + ']' +
        ' /Resources << /XObject << /Im0 ' + imgId + ' 0 R >> >>' +
        ' /Contents ' + contId + ' 0 R >>');

      var content = 'q ' + A4_W.toFixed(3) + ' 0 0 ' + A4_H.toFixed(3) + ' 0 0 cm /Im0 Do Q';
      obj(contId, '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');

      var jpeg = jpegs[i];
      offsets[imgId] = offset;
      pushStr(imgId + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + canvases[i].width +
              ' /Height ' + canvases[i].height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
              ' /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n');
      push(jpeg);
      pushStr('\nendstream\nendobj\n');
    }

    var maxId = 2 + n * 3;
    var xrefPos = offset;
    var xref = 'xref\n0 ' + (maxId + 1) + '\n0000000000 65535 f \n';
    for (var id = 1; id <= maxId; id++) {
      xref += pad10(offsets[id] || 0) + ' 00000 n \n';
    }
    xref += 'trailer\n<< /Size ' + (maxId + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF\n';
    pushStr(xref);

    return new Blob(chunks, { type: 'application/pdf' });
  }

  function pad10(v) {
    var s = String(v);
    while (s.length < 10) s = '0' + s;
    return s;
  }

  HF.pdf = { fromCanvases: fromCanvases, A4_W: A4_W, A4_H: A4_H };
})(typeof globalThis !== 'undefined' ? globalThis : this);
