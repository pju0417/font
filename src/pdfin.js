/* PDF 로 들어온 필기를 쪽별 이미지로 바꾼다.
 *
 * 아이패드에서 양식 PDF 에 애플펜슬로 바로 쓰는 것이 사진보다 훨씬 정확하다.
 * (원근 왜곡도, 그림자도, 초점 흐림도 없다.)
 *
 * PDF 를 읽는 데만 pdf.js 가 필요하므로, PDF 를 실제로 올렸을 때만 내려받는다.
 * 사진만 쓰는 사람은 이 1.5MB 를 건드리지 않는다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var LIB = 'vendor/pdf.min.js';
  var WORKER = 'vendor/pdf.worker.min.js';
  var TARGET_WIDTH = 1800;   // A4 기준 약 215dpi. 이보다 높여도 결과가 거의 같다.
  var MAX_PAGES = 24;

  var loading = null;

  function loadLib() {
    if (root.pdfjsLib) return Promise.resolve(root.pdfjsLib);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = LIB;
      s.onload = function () {
        if (!root.pdfjsLib) return reject(new Error('pdf.js 를 읽지 못했습니다'));
        root.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
        resolve(root.pdfjsLib);
      };
      s.onerror = function () { reject(new Error('pdf.js 파일을 찾지 못했습니다')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /* 브라우저는 보이지 않는 탭에서 requestAnimationFrame 을 멈춘다.
   * pdf.js 는 그것으로 렌더링을 이어가므로, 사용자가 PDF 처리 도중 다른 탭으로
   * 옮기면 그대로 멈춰 버린다. 처리하는 동안만 타이머로 바꿔 둔다.
   *
   * (pdf.js 의 'print' 의도를 쓰면 requestAnimationFrame 을 안 쓰지만,
   *  인쇄 표시가 꺼진 필기 주석을 통째로 빠뜨릴 수 있어 쓰지 않는다.) */
  function withTimerFrames(fn) {
    var orig = root.requestAnimationFrame;
    root.requestAnimationFrame = function (cb) {
      return setTimeout(function () { cb(performance.now()); }, 0);
    };
    function restore() { root.requestAnimationFrame = orig; }
    return fn().then(
      function (v) { restore(); return v; },
      function (e) { restore(); throw e; }
    );
  }

  /* PDF 파일 → 쪽별 캔버스 배열. onPage(index, total) 로 진행 상황을 알린다. */
  function renderPages(file, onPage) {
    return withTimerFrames(function () { return doRender(file, onPage); });
  }

  function doRender(file, onPage) {
    return loadLib().then(function (pdfjsLib) {
      return file.arrayBuffer();
    }).then(function (buf) {
      return root.pdfjsLib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
    }).then(function (doc) {
      var total = Math.min(doc.numPages, MAX_PAGES);
      var canvases = [];
      var i = 1;
      function next() {
        if (i > total) return doc.destroy().then(function () { return canvases; });
        var n = i++;
        if (onPage) onPage(n, total);
        return doc.getPage(n).then(function (page) {
          var base = page.getViewport({ scale: 1 });
          var viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });
          var cv = document.createElement('canvas');
          cv.width = Math.round(viewport.width);
          cv.height = Math.round(viewport.height);
          var ctx = cv.getContext('2d', { willReadFrequently: true });
          // PDF 는 배경이 투명일 수 있다. 흰 종이를 깔아 준다.
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, cv.width, cv.height);
          return page.render({
            canvasContext: ctx,
            viewport: viewport,
            intent: 'display',
            annotationMode: root.pdfjsLib.AnnotationMode.ENABLE   // 필기 주석까지 그린다
          }).promise.then(function () {
            page.cleanup();
            canvases.push(cv);
            return next();
          });
        });
      }
      return next();
    });
  }

  function isPdf(file) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  }

  HF.pdfin = { renderPages: renderPages, isPdf: isPdf, TARGET_WIDTH: TARGET_WIDTH };
})(typeof globalThis !== 'undefined' ? globalThis : this);
