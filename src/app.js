/* 화면 동작. 모든 처리는 이 브라우저 안에서만 일어나고 사진은 어디로도 전송되지 않는다. */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var state = {
    scope: 'full',
    layouts: { latin: HF.layout.build('latin'), full: HF.layout.build('full') },
    collected: {},
    seen: {},              // 'full:0' 같은 키 → true
    photoScope: null,      // 사진에서 읽어 낸 문자셋
    font: null,
    previewSeq: 0
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {};

  function init() {
    ['scope', 'familyName', 'familyNameKo', 'dropZone', 'fileInput', 'pageStatus',
     'photoLog', 'buildBtn', 'progress', 'progressBar', 'progressText', 'result',
     'previewText', 'previewBox', 'previewSize', 'downloadBtn', 'reportBox',
     'pdfBtn', 'pngBtn', 'templatePreview', 'sheetCount', 'resetBtn', 'installHelp']
      .forEach(function (id) { els[id] = $(id); });

    els.scope.value = localStorage.getItem('hf.scope') || 'full';
    els.familyName.value = localStorage.getItem('hf.familyName') || 'My Handwriting';
    els.familyNameKo.value = localStorage.getItem('hf.familyNameKo') || '내손글씨';

    els.scope.addEventListener('change', onScopeChange);
    els.familyName.addEventListener('input', remember);
    els.familyNameKo.addEventListener('input', remember);
    els.pdfBtn.addEventListener('click', downloadPdf);
    els.pngBtn.addEventListener('click', downloadPngs);
    els.buildBtn.addEventListener('click', buildFont);
    els.resetBtn.addEventListener('click', resetPhotos);
    els.previewText.addEventListener('input', renderPreview);
    els.previewSize.addEventListener('input', renderPreview);

    els.fileInput.addEventListener('change', function (e) {
      handleFiles(Array.prototype.slice.call(e.target.files));
      e.target.value = '';
    });
    els.dropZone.addEventListener('click', function () { els.fileInput.click(); });
    ['dragenter', 'dragover'].forEach(function (t) {
      els.dropZone.addEventListener(t, function (e) {
        e.preventDefault(); els.dropZone.classList.add('over');
      });
    });
    ['dragleave', 'drop'].forEach(function (t) {
      els.dropZone.addEventListener(t, function (e) {
        e.preventDefault(); els.dropZone.classList.remove('over');
      });
    });
    els.dropZone.addEventListener('drop', function (e) {
      handleFiles(Array.prototype.slice.call(e.dataTransfer.files).filter(function (f) {
        return /^image\//.test(f.type);
      }));
    });

    onScopeChange();
    updatePageStatus();
  }

  function remember() {
    localStorage.setItem('hf.familyName', els.familyName.value);
    localStorage.setItem('hf.familyNameKo', els.familyNameKo.value);
  }

  function onScopeChange() {
    state.scope = els.scope.value;
    localStorage.setItem('hf.scope', state.scope);
    var L = state.layouts[state.scope];
    els.sheetCount.textContent = L.pages.length + '장 (' + L.totalCells + '칸)';
    showTemplatePreview();
    updatePageStatus();
  }

  function currentLayout() {
    return state.layouts[state.photoScope || state.scope];
  }

  // ---------- 1단계: 양식 ----------

  function showTemplatePreview() {
    var cv = HF.template.renderPage(state.layouts[state.scope], 0, 0.42);
    els.templatePreview.innerHTML = '';
    els.templatePreview.appendChild(cv);
  }

  function allPages(scale) {
    var L = state.layouts[state.scope];
    return L.pages.map(function (_, i) { return HF.template.renderPage(L, i, scale); });
  }

  function downloadPdf() {
    els.pdfBtn.disabled = true;
    els.pdfBtn.textContent = '만드는 중…';
    setTimeout(function () {
      HF.pdf.fromCanvases(allPages(1.4), 0.95).then(function (blob) {
        saveBlob(blob, fileBase() + '-양식.pdf');
      }).catch(function (e) {
        alert('PDF 를 만들지 못했습니다: ' + e.message);
      }).then(function () {
        els.pdfBtn.disabled = false;
        els.pdfBtn.textContent = 'PDF 내려받기';
      });
    }, 20);
  }

  function downloadPngs() {
    allPages(1).forEach(function (cv, i) {
      cv.toBlob(function (b) { saveBlob(b, fileBase() + '-양식-' + (i + 1) + '쪽.png'); }, 'image/png');
    });
  }

  // ---------- 2단계: 사진 ----------

  function handleFiles(files) {
    if (!files.length) return;
    var i = 0;
    (function next() {
      if (i >= files.length) { updatePageStatus(); return; }
      var file = files[i++];
      logPhoto(file.name, '읽는 중…', 'wait');
      setTimeout(function () {
        HF.imageproc.loadFile(file).then(function (src) {
          var res = HF.imageproc.processImage(src, { layouts: state.layouts });
          applyResult(file.name, res);
        }).catch(function (e) {
          logPhoto(file.name, unreadableMessage(file), 'bad', true);
          console.warn(file.name, e);
        }).then(function () {
          updatePageStatus();
          next();
        });
      }, 10);
    })();
  }

  /* 아이폰 기본 형식(HEIC)은 크롬·엣지에서 열리지 않는다.
   * 원인을 모르면 사용자가 막히는 지점이라 해결 방법까지 알려 준다. */
  function unreadableMessage(file) {
    if (/\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type)) {
      return '아이폰 HEIC 사진은 이 브라우저에서 열 수 없습니다. ' +
             '설정 → 카메라 → 포맷 → ‘높은 호환성’ 으로 바꿔 다시 찍거나, ' +
             '사진을 JPG 로 저장해서 올려 주세요.';
    }
    return '이미지를 열 수 없는 파일입니다. JPG 나 PNG 로 올려 주세요.';
  }

  function applyResult(name, res) {
    if (!res.ok) {
      var msg = res.reason === 'marker'
        ? '네 모서리의 검은 사각형을 찾지 못했습니다. 종이 전체가 나오게 다시 찍어 주세요.'
        : '쪽 번호를 읽지 못했습니다. 머리말의 작은 사각형 줄이 가려지지 않았는지 확인해 주세요.';
      logPhoto(name, msg, 'bad', true);
      return;
    }
    if (state.photoScope && state.photoScope !== res.scope) {
      logPhoto(name, '다른 문자셋의 양식입니다. 같은 종류의 양식만 함께 올려 주세요.', 'bad', true);
      return;
    }
    state.photoScope = res.scope;
    state.seen[res.scope + ':' + res.pageIndex] = true;

    var added = 0, faint = 0, empty = 0;
    res.cells.forEach(function (cell) {
      if (cell.status === 'empty') { empty++; return; }
      if (cell.status === 'faint') faint++;
      var prev = state.collected[cell.key];
      if (!prev || (prev.status !== 'ok' && cell.status === 'ok') ||
          (prev.status === cell.status && cell.ink > prev.ink)) {
        state.collected[cell.key] = cell;
        added++;
      }
    });
    var tail = faint ? ' · 흐린 글자 ' + faint + '자' : '';
    logPhoto(name, (res.pageIndex + 1) + '쪽 인식 · ' + added + '자 등록 · 빈 칸 ' + empty + '개' + tail, 'good');
  }

  function logPhoto(name, msg, kind, replaceLast) {
    var last = els.photoLog.lastElementChild;
    if (replaceLast || (last && last.dataset.name === name && last.dataset.kind === 'wait')) {
      if (last && last.dataset.name === name) last.remove();
    }
    var li = document.createElement('li');
    li.className = 'log ' + kind;
    li.dataset.name = name;
    li.dataset.kind = kind;
    li.innerHTML = '<b></b><span></span>';
    li.querySelector('b').textContent = name;
    li.querySelector('span').textContent = msg;
    els.photoLog.appendChild(li);
    els.photoLog.scrollTop = els.photoLog.scrollHeight;
  }

  function updatePageStatus() {
    var L = currentLayout();
    els.pageStatus.innerHTML = '';
    L.pages.forEach(function (p, i) {
      var seen = state.seen[(state.photoScope || state.scope) + ':' + i];
      var d = document.createElement('div');
      d.className = 'page-chip ' + (seen ? 'done' : '');
      d.textContent = (i + 1) + '쪽';
      els.pageStatus.appendChild(d);
    });
    var n = Object.keys(state.collected).length;
    els.buildBtn.disabled = n === 0;
    els.buildBtn.textContent = n ? '폰트 만들기 (' + n + '자 등록됨)' : '먼저 사진을 올려 주세요';
    els.resetBtn.disabled = n === 0;
  }

  function resetPhotos() {
    if (!confirm('올린 사진에서 모은 글자를 모두 지울까요?')) return;
    state.collected = {};
    state.seen = {};
    state.photoScope = null;
    els.photoLog.innerHTML = '';
    els.result.hidden = true;
    updatePageStatus();
  }

  // ---------- 3단계: 폰트 ----------

  function buildFont() {
    els.buildBtn.disabled = true;
    els.progress.hidden = false;
    setProgress(0.05, '준비 중');

    setTimeout(function () {
      var info = {
        familyName: (els.familyName.value || 'My Handwriting').trim(),
        familyNameKo: (els.familyNameKo.value || '').trim(),
        styleName: 'Regular',
        version: '1.000',
        copyright: '',
        license: '본인의 손글씨로 만든 개인용 폰트입니다.'
      };
      var out;
      try {
        out = HF.fontbuild.build(state.collected, info, setProgress);
      } catch (e) {
        setProgress(1, '실패');
        alert('폰트를 만들지 못했습니다: ' + e.message);
        els.buildBtn.disabled = false;
        return;
      }
      setProgress(0.92, '검사 중');
      verifyAndShow(out, info);
    }, 20);
  }

  function verifyAndShow(out, info) {
    var buf = out.ttf.buffer.slice(out.ttf.byteOffset, out.ttf.byteOffset + out.ttf.byteLength);
    var family = 'HFPreview' + (++state.previewSeq);
    var face = new FontFace(family, buf);
    face.load().then(function (loaded) {
      document.fonts.add(loaded);
      state.font = { ttf: out.ttf, report: out.report, info: info, family: family };
      setProgress(1, '완료');
      showResult();
    }).catch(function (e) {
      setProgress(1, '검사 실패');
      alert('만들어진 폰트를 브라우저가 읽지 못했습니다. 사진을 다시 확인해 주세요.\n(' + e.message + ')');
      els.buildBtn.disabled = false;
    });
  }

  function setProgress(ratio, label) {
    els.progressBar.style.width = Math.round(ratio * 100) + '%';
    els.progressText.textContent = label + ' · ' + Math.round(ratio * 100) + '%';
  }

  function showResult() {
    els.result.hidden = false;
    els.buildBtn.disabled = false;
    var r = state.font.report;
    var kb = (r.byteLength / 1024).toFixed(0);
    els.downloadBtn.onclick = function () {
      saveBlob(new Blob([state.font.ttf], { type: 'font/ttf' }), fileBase() + '-Regular.ttf');
    };
    els.downloadBtn.textContent = fileBase() + '-Regular.ttf 내려받기 (' + kb + ' KB)';

    var rows = [
      ['영문 · 숫자 · 기호', r.latin + ' / 94자'],
      ['한글 자모', r.jamo + ' / 86개'],
      ['만들어진 한글', r.syllables.toLocaleString() + ' / ' +
                       HF.hangul.COUNT.toLocaleString() + '자'],
      ['전체 글리프', r.glyphCount.toLocaleString() + '개']
    ];
    if (!r.jamo) rows.splice(1, 2);
    var html = '<table>' + rows.map(function (x) {
      return '<tr><th>' + x[0] + '</th><td>' + x[1] + '</td></tr>';
    }).join('') + '</table>';

    if (r.missing.length) {
      html += '<p class="warn">아직 안 쓴 자모가 ' + r.missing.length + '개 있어서, 그 자모가 들어가는 한글은 빠졌습니다.<br>' +
              missingLabels(r.missing) + '</p>';
    }
    if (r.skipped.length) {
      html += '<p class="warn">비어 있거나 너무 흐려서 건너뛴 칸: ' + r.skipped.length + '개</p>';
    }
    els.reportBox.innerHTML = html;
    els.installHelp.hidden = false;
    renderPreview();
    els.result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function missingLabels(keys) {
    var H = HF.hangul;
    return keys.map(function (k) {
      var p = k.split(':');
      if (p[0] === 'C') return H.CHO[+p[2]] + '(초성·' + (p[1] === 'V' ? '가 모양' : '고 모양') + ')';
      if (p[0] === 'J') return H.JUNG[+p[1]] + '(중성)';
      return H.JONG[+p[1]] + '(받침)';
    }).join(', ');
  }

  function renderPreview() {
    if (!state.font) return;
    var size = els.previewSize.value;
    els.previewBox.style.fontFamily = '"' + state.font.family + '"';
    els.previewBox.style.fontSize = size + 'px';
    els.previewBox.textContent = els.previewText.value ||
      '다람쥐 헌 쳇바퀴에 타고파\nThe quick brown fox jumps over the lazy dog.\n0123456789';
  }

  // ---------- 공통 ----------

  function fileBase() {
    var n = (els.familyName.value || 'MyHandwriting').replace(/[^A-Za-z0-9가-힣_-]+/g, '');
    return n || 'MyHandwriting';
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  HF.app = { init: init, state: state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
