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
     'pdfBtn', 'pngBtn', 'templatePreview', 'sheetCount', 'resetBtn', 'installHelp',
     'passageBox', 'passageList', 'extraNote', 'qualityPanel', 'recommendPanel',
     'previewPanel', 'previewHint', 'previewMeta', 'previewPages']
      .forEach(function (id) { els[id] = $(id); });

    buildPassageList();
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
        return /^image\//.test(f.type) || HF.pdfin.isPdf(f);
      }));
    });

    onScopeChange();
    updatePageStatus();
  }

  function remember() {
    localStorage.setItem('hf.familyName', els.familyName.value);
    localStorage.setItem('hf.familyNameKo', els.familyNameKo.value);
  }

  /* 필사 시트는 글마다 쪽이 정해져 있다(목록이 코드에 고정이다).
   * 그래서 어떤 글을 골랐든 종이의 쪽 번호만 보면 어느 글의 몇 번째 장인지 알 수 있다. */
  function buildPassageList() {
    var L = state.layouts.full;
    var chosen = JSON.parse(localStorage.getItem('hf.passages') || '[]');
    var pagesOf = {};
    L.pages.forEach(function (p) {
      if (p.kind !== 'passage') return;
      (pagesOf[p.passage.id] = pagesOf[p.passage.id] || []).push(p.index);
    });

    els.passageList.innerHTML = '';
    HF.passages.CATEGORIES.forEach(function (cat) {
      var items = HF.passages.byCategory(cat.id).filter(function (ps) {
        return pagesOf[ps.id];
      });
      if (!items.length) return;

      var group = document.createElement('section');
      group.className = 'passage-group';
      var h = document.createElement('h3');
      h.innerHTML = '<span></span><em></em>';
      h.querySelector('span').textContent = cat.label;
      h.querySelector('em').textContent = cat.hint;
      group.appendChild(h);

      var grid = document.createElement('div');
      grid.className = 'passage-list';
      items.forEach(function (ps) {
        var st = HF.passages.SOURCE_TYPES[ps.sourceType];
        var label = document.createElement('label');
        label.className = 'passage' +
          (ps.sourceType === 'textbookReference' ? ' notice' : '');
        label.innerHTML =
          '<input type="checkbox" value="' + ps.id + '">' +
          '<span class="t"></span><span class="a"></span><span class="d"></span>' +
          '<button type="button" class="peek">미리보기</button>';
        label.querySelector('.t').textContent = ps.title;
        label.querySelector('.a').textContent = pagesOf[ps.id].length + '장 · ' + st.short;
        label.querySelector('.d').textContent =
          ps.learningGoal || ps.sourceNote || '';
        label.title = [ps.author, ps.sourceNote, ps.learningGoal]
          .filter(Boolean).join('\n');
        var box = label.querySelector('input');
        box.checked = chosen.indexOf(ps.id) >= 0;
        box.addEventListener('change', onScopeChange);
        // 미리보기 단추는 라벨 안에 있으므로 체크가 따라 눌리지 않게 막는다
        label.querySelector('.peek').addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          showPassagePreview(ps.id);
        });
        grid.appendChild(label);
      });
      group.appendChild(grid);
      els.passageList.appendChild(group);
    });
  }

  function chosenPassages() {
    if (state.scope !== 'full') return [];
    return Array.prototype.slice
      .call(els.passageList.querySelectorAll('input:checked'))
      .map(function (b) { return b.value; });
  }

  /* 인쇄할 쪽 = 기본 시트 전부 + 고른 글의 쪽들 */
  function selectedPageIndexes() {
    var L = state.layouts[state.scope];
    var picked = chosenPassages();
    var out = [];
    L.pages.forEach(function (p) {
      if (p.kind === 'base') out.push(p.index);
      else if (picked.indexOf(p.passage.id) >= 0) out.push(p.index);
    });
    return out;
  }

  function onScopeChange() {
    state.scope = els.scope.value;
    localStorage.setItem('hf.scope', state.scope);
    localStorage.setItem('hf.passages', JSON.stringify(chosenPassages()));
    var isFull = state.scope === 'full';
    els.passageBox.hidden = !isFull;
    els.extraNote.hidden = !isFull;

    var L = state.layouts[state.scope];
    var idx = selectedPageIndexes();
    var cells = idx.reduce(function (n, i) { return n + L.pages[i].cells.length; }, 0);
    var extra = idx.length - L.basePages;
    els.sheetCount.textContent = idx.length + '장 (' + cells + '칸)' +
      (extra > 0 ? ' · 기본 ' + L.basePages + '장 + 활동지 ' + extra + '장' : '');
    showTemplatePreview();
    updateQuality();
    updatePageStatus();
  }

  // ---------- 완성도와 추천 ----------

  /* 활동지가 더해 주는 것은 글자 '개수'가 아니라 '어떤 글자가 손글씨가 되는가' 다.
   * 기본 시트만으로도 11,172자가 조합으로 다 나오기 때문이다. */
  function updateQuality() {
    if (state.scope !== 'full') return;
    var ids = chosenPassages();
    var q = HF.quality.evaluate(ids);
    var g = HF.quality.grade(q.coverage);
    var pct = Math.round(q.coverage * 100);

    els.qualityPanel.innerHTML =
      '<h4>완성도</h4>' +
      '<div class="score-top"><span class="score-num">' + pct + '%</span>' +
      '<span class="score-tag ' + g.tone + '">' + g.label + '</span></div>' +
      '<div class="score-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="score-facts">' +
      fact('손글씨로 쓰는 글자', q.syllables.toLocaleString() + '자') +
      fact('활동지 분량', q.pages + '장') +
      fact('초성 · 중성 · 받침', q.cho + ' · ' + q.jung + ' · ' + q.jong + '종') +
      '</div>' +
      '<p class="sub" style="margin:9px 0 0">프로그램에 실린 글에 나오는 글자 가운데 ' +
      '몇 %가 손글씨로 바뀌는지입니다. 나머지는 자모 조합이 채웁니다.</p>';

    renderRecommendations(ids);
  }

  function fact(k, v) {
    return '<span>' + k + '</span><b>' + v + '</b>';
  }

  /* 이미 덮은 글자는 빼고 '새로 늘어나는 몫'이 큰 것부터 권한다.
   * 장수로 나눠 비교하므로 짧고 알찬 활동지가 먼저 온다. */
  function renderRecommendations(ids) {
    var recs = HF.quality.recommend(ids, 3);
    if (!recs.length) {
      els.recommendPanel.innerHTML =
        '<h4>이런 조합은 어떨까요</h4><p class="sub">더 보탤 것이 없습니다. 충분합니다.</p>';
      return;
    }
    var html = '<h4>이런 조합은 어떨까요</h4>';
    recs.forEach(function (r, i) {
      html += '<button type="button" class="rec" data-id="' + r.passage.id + '">' +
        '<span class="t">' + (i === 0 ? '＋ ' : '＋ ') + escapeHtml(r.passage.title) + '</span>' +
        '<span class="g">' + r.pages + '장 · 새 글자 ' + r.addSyllables + '자 · ' +
        '<em>완성도 +' + (r.addCoverage * 100).toFixed(1) + '%p</em></span></button>';
    });
    els.recommendPanel.innerHTML = html;
    Array.prototype.forEach.call(els.recommendPanel.querySelectorAll('.rec'), function (b) {
      b.addEventListener('click', function () {
        var box = els.passageList.querySelector('input[value="' + b.dataset.id + '"]');
        if (box) { box.checked = true; onScopeChange(); }
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------- 활동지 미리보기 ----------

  function showPassagePreview(id) {
    var L = state.layouts.full;
    var ps = HF.passages.byId(id);
    var idx = [];
    L.pages.forEach(function (p) { if (p.passage && p.passage.id === id) idx.push(p.index); });
    if (!ps || !idx.length) return;

    els.previewHint.hidden = true;
    els.previewMeta.hidden = false;
    var st = HF.passages.SOURCE_TYPES[ps.sourceType];
    els.previewMeta.innerHTML =
      '<b>' + escapeHtml(ps.title) + '</b>' +
      (ps.author ? ' · ' + escapeHtml(ps.author) : '') +
      ' · ' + st.label + ' · ' + idx.length + '장' +
      (ps.learningGoal ? '<br>' + escapeHtml(ps.learningGoal) : '') +
      (ps.sourceNote ? '<br>' + escapeHtml(ps.sourceNote) : '');

    els.previewPages.innerHTML = '';
    idx.forEach(function (i) {
      var cv = HF.template.renderPage(L, i, 0.34);
      cv.title = (i + 1) + '쪽 · 눌러서 크게 보기';
      cv.addEventListener('click', function () { cv.classList.toggle('big'); });
      els.previewPages.appendChild(cv);
    });
    els.previewPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function currentLayout() {
    return state.layouts[state.photoScope || state.scope];
  }

  // ---------- 1단계: 양식 ----------

  function showTemplatePreview() {
    var L = state.layouts[state.scope];
    var idx = selectedPageIndexes();
    // 필사 시트를 골랐으면 그 모습을 보여 주는 편이 도움이 된다
    var show = idx.length > L.basePages ? idx[L.basePages] : 0;
    els.templatePreview.innerHTML = '';
    els.templatePreview.appendChild(HF.template.renderPage(L, show, 0.42));
  }

  function allPages(scale) {
    var L = state.layouts[state.scope];
    return selectedPageIndexes().map(function (i) {
      return HF.template.renderPage(L, i, scale);
    });
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
        (HF.pdfin.isPdf(file) ? handlePdf(file) : handlePhoto(file))
          .catch(function (e) {
            logPhoto(file.name, HF.pdfin.isPdf(file)
              ? 'PDF 를 읽지 못했습니다 (' + e.message + ')'
              : unreadableMessage(file), 'bad');
            console.warn(file.name, e);
          })
          .then(function () {
            updatePageStatus();
            next();
          });
      }, 10);
    })();
  }

  function handlePhoto(file) {
    return HF.imageproc.loadFile(file).then(function (src) {
      applyResult(file.name, HF.imageproc.processImage(src, { layouts: state.layouts }));
    });
  }

  /* 아이패드 등에서 양식 PDF 에 직접 필기한 경우. 쪽마다 따로 처리한다. */
  function handlePdf(file) {
    return HF.pdfin.renderPages(file, function (n, total) {
      logPhoto(file.name, 'PDF ' + n + ' / ' + total + '쪽 여는 중…', 'wait');
    }).then(function (canvases) {
      if (!canvases.length) throw new Error('쪽이 없습니다');
      canvases.forEach(function (cv, idx) {
        var label = file.name + ' (' + (idx + 1) + '쪽)';
        applyResult(label, HF.imageproc.processImage(cv, { layouts: state.layouts }));
      });
    });
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
      logPhoto(name, msg, 'bad');
      return;
    }
    if (state.photoScope && state.photoScope !== res.scope) {
      logPhoto(name, '다른 문자셋의 양식입니다. 같은 종류의 양식만 함께 올려 주세요.', 'bad');
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

  function logPhoto(name, msg, kind) {
    // 파일을 하나씩 차례로 처리하므로, 남아 있는 '읽는 중' 줄은 항상 이 파일 것이다
    var last = els.photoLog.lastElementChild;
    if (last && last.dataset.kind === 'wait') last.remove();

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
    var scope = state.photoScope || state.scope;
    els.pageStatus.innerHTML = '';
    // 안 고른 필사 시트는 굳이 보여 주지 않는다 (올린 게 있으면 보여 준다)
    var show = {};
    selectedPageIndexes().forEach(function (i) { show[i] = true; });
    L.pages.forEach(function (p, i) {
      var seen = state.seen[scope + ':' + i];
      if (!show[i] && !seen) return;
      var d = document.createElement('div');
      d.className = 'page-chip ' + (seen ? 'done' : '') + (p.kind === 'passage' ? ' extra' : '');
      d.textContent = (i + 1) + '쪽' + (p.passage ? ' ' + p.passage.title : '');
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
      ['필사로 직접 쓴 한글', r.written + '자'],
      ['자모로 조합한 한글', r.syllables.toLocaleString() + '자'],
      ['한글 전체', (r.written + r.syllables).toLocaleString() + ' / ' +
                    HF.hangul.COUNT.toLocaleString() + '자'],
      ['전체 글리프', r.glyphCount.toLocaleString() + '개']
    ];
    if (!r.jamo) rows.splice(1, 4);
    else if (!r.written) rows.splice(2, 1);
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
      '값 앉다 읽다 흙 닭 젊다 넓다 짧다 괜찮다\n' +
      'The quick brown fox jumps over the lazy dog.\n0123456789 ?!,."()';
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
