/* 고른 활동지가 폰트를 얼마나 채워 주는지 따져 보고, 다음에 무엇을 더하면
 * 좋은지 알려 준다.
 *
 * 기준을 무엇으로 잡을 것인가
 *   기본 시트만으로도 한글 11,172자가 '조합'으로 다 나온다. 그러니 활동지가
 *   더해 주는 것은 '개수'가 아니라 '어떤 글자가 손글씨가 되는가' 다.
 *   흔한 글자를 덮을수록 실제로 쓴 글이 손글씨처럼 보인다.
 *
 *   그래서 프로그램에 실린 글 전체에서 음절이 나온 횟수를 세어 무게로 삼는다.
 *   따로 빈도 자료를 두지 않아도 되고, '실제 글에서 만나는 글자의 몇 %가
 *   손글씨가 되는가' 라는 뜻이 분명하다.
 *   (일반 한국어 말뭉치가 아니라 이 프로그램의 글 기준이다.)
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var cache = null;

  function isSyllable(cp) { return cp >= 0xAC00 && cp <= 0xD7A3; }

  /* 활동지마다 '걷는 음절 집합'과, 글 전체의 음절 출현 횟수를 미리 구해 둔다. */
  function analyze() {
    if (cache) return cache;
    var freq = {};        // 음절 → 나온 횟수 (무게)
    var total = 0;
    var perPassage = {};  // 활동지 id → { set, pages, syllables }

    var pageCount = {};
    HF.layout.build('full').pages.forEach(function (p) {
      if (p.kind === 'passage') pageCount[p.passage.id] = (pageCount[p.passage.id] || 0) + 1;
    });

    HF.passages.list.forEach(function (ps) {
      var set = {};
      if (HF.passages.collects(ps)) {
        ps.lines.forEach(function (line) {
          for (var i = 0; i < line.length; i++) {
            var cp = line.charCodeAt(i);
            if (!isSyllable(cp)) continue;
            freq[cp] = (freq[cp] || 0) + 1;
            total++;
            set[cp] = true;
          }
        });
      }
      perPassage[ps.id] = {
        passage: ps, set: set,
        syllables: Object.keys(set).length,
        pages: pageCount[ps.id] || 0
      };
    });

    cache = { freq: freq, total: total, perPassage: perPassage };
    return cache;
  }

  /* 고른 활동지들을 함께 썼을 때의 결과 */
  function evaluate(ids) {
    var a = analyze();
    var covered = {};
    var pages = 0;
    ids.forEach(function (id) {
      var e = a.perPassage[id];
      if (!e) return;
      pages += e.pages;
      for (var cp in e.set) covered[cp] = true;
    });

    var weight = 0, syllables = 0;
    var cho = {}, jung = {}, jong = {};
    for (var cp2 in covered) {
      syllables++;
      weight += a.freq[cp2] || 0;
      var s = +cp2 - 0xAC00;
      cho[Math.floor(s / 588)] = true;
      jung[Math.floor(s / 28) % 21] = true;
      jong[s % 28] = true;
    }

    return {
      pages: pages,
      syllables: syllables,
      /* 이 조합으로 덮이는 '글자 쓰임'의 비율.
       * 흔한 글자를 덮을수록 같은 장수로도 값이 크게 오른다. */
      coverage: a.total ? weight / a.total : 0,
      cho: Object.keys(cho).length,
      jung: Object.keys(jung).length,
      jong: Object.keys(jong).length
    };
  }

  /* 지금 고른 것에 무엇을 더하면 가장 많이 오르는지.
   * 이미 덮인 글자는 빼고 '새로 늘어나는 몫'만 센다(한계 이득). */
  function recommend(ids, count) {
    var a = analyze();
    var covered = {};
    ids.forEach(function (id) {
      var e = a.perPassage[id];
      if (e) for (var cp in e.set) covered[cp] = true;
    });

    var out = [];
    HF.passages.list.forEach(function (ps) {
      if (ids.indexOf(ps.id) >= 0) return;
      var e = a.perPassage[ps.id];
      if (!e || !e.pages || !e.syllables) return;
      var gainWeight = 0, gainSyl = 0;
      for (var cp in e.set) {
        if (covered[cp]) continue;
        gainSyl++;
        gainWeight += a.freq[cp] || 0;
      }
      if (!gainSyl) return;
      out.push({
        passage: ps, pages: e.pages,
        addSyllables: gainSyl,
        addCoverage: a.total ? gainWeight / a.total : 0,
        perPage: a.total ? (gainWeight / a.total) / e.pages : 0
      });
    });

    // 한 장 쓸 때 가장 많이 오르는 순서. 같으면 장수가 적은 쪽을 앞에 둔다.
    out.sort(function (x, y) { return (y.perPage - x.perPage) || (x.pages - y.pages); });
    return out.slice(0, count || 3);
  }

  /* 눈으로 가늠할 수 있게 다섯 단계로 나눈다 */
  function grade(coverage) {
    if (coverage >= 0.85) return { label: '아주 좋음', tone: 'best' };
    if (coverage >= 0.65) return { label: '좋음', tone: 'good' };
    if (coverage >= 0.40) return { label: '보통', tone: 'fair' };
    if (coverage > 0) return { label: '조금', tone: 'low' };
    return { label: '기본 시트만', tone: 'none' };
  }

  HF.quality = { analyze: analyze, evaluate: evaluate, recommend: recommend, grade: grade };
})(typeof globalThis !== 'undefined' ? globalThis : this);
