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
 *
 * 점수를 어떻게 낼 것인가
 *   기본 시트만 받아도 폰트는 온전히 만들어진다. 라틴·숫자·기호 94자와 자모
 *   86자를 본인이 직접 쓰고, 그 자모로 11,172자가 다 나온다. 그런데도 0%로
 *   보이면 '아직 쓸 수 없는 폰트' 처럼 읽힌다. 그래서 폰트가 하는 일을 셋으로
 *   나누고, 기본 시트가 이미 끝낸 몫을 점수에 넣는다.
 *
 *     라틴·숫자·기호   0.25  기본 시트가 그대로 손글씨 (항상 채워짐)
 *     한글 자모        0.35  기본 시트가 그대로 손글씨 (항상 채워짐)
 *     한글 통글자      0.40  활동지로 쓴 만큼 채워짐
 *
 *   그래서 기본 시트만이면 60%, 활동지를 다 쓰면 100% 다.
 *   조합으로 만든 글자도 결국 본인 자모라서 0점이 아니고, 그렇다고 통글자로
 *   쓴 것과 같지도 않다 — 이어지는 맵시가 다르다. 그 차이가 남은 40% 다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var cache = null;

  /* 기본 시트가 이미 끝내 놓은 몫. 활동지는 남은 SYL_SHARE 를 채운다. */
  var LATIN_SHARE = 0.25;
  var JAMO_SHARE = 0.35;
  var BASE_SHARE = LATIN_SHARE + JAMO_SHARE;   // 0.60
  var SYL_SHARE = 1 - BASE_SHARE;              // 0.40

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

    /* 이 조합으로 덮이는 '글자 쓰임'의 비율.
     * 흔한 글자를 덮을수록 같은 장수로도 값이 크게 오른다. */
    var coverage = a.total ? weight / a.total : 0;

    return {
      pages: pages,
      syllables: syllables,
      coverage: coverage,
      /* 화면에 보여 줄 완성도. 기본 시트 몫을 깔고 시작한다(60%). */
      score: BASE_SHARE + SYL_SHARE * coverage,
      base: BASE_SHARE,
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
      var gain = a.total ? (gainWeight / a.total) * SYL_SHARE : 0;
      out.push({
        passage: ps, pages: e.pages,
        addSyllables: gainSyl,
        addScore: gain,          // 화면의 완성도가 오르는 만큼(%p)
        perPage: gain / e.pages
      });
    });

    // 한 장 쓸 때 가장 많이 오르는 순서. 같으면 장수가 적은 쪽을 앞에 둔다.
    out.sort(function (x, y) { return (y.perPage - x.perPage) || (x.pages - y.pages); });
    return out.slice(0, count || 3);
  }

  /* 어디까지 쓰면 될까 — 두 눈금.
   *
   * 곡선이 5장(87%)에서 꺾인다. 그 뒤로는 한 장 더 써도 1%p 남짓이고,
   * 100% 를 채우려면 136장을 써야 한다. 마지막 3%p 에 88장이 든다.
   *
   * 화면 점수는 프로그램에 실린 글로 잰 값이라 후하다. 고르지 않은 활동지의
   * 글(= 처음 보는 문장)로 따로 재 보면 87% 는 통글자 66%, 93% 는 80% 였다.
   * 권장선을 93% 에 둔 까닭이다 — 처음 보는 글에서도 열에 여덟이 통글자다. */
  var TARGETS = [
    { score: 0.87, key: 'min', label: '최소', note: '처음 보는 글에서 통글자 약 3분의 2' },
    { score: 0.93, key: 'rec', label: '권장', note: '처음 보는 글에서도 통글자 약 80%' }
  ];

  /* 목표까지 가려면 몇 종·몇 장을 더 써야 하는지 (추천과 같은 순서로 채워 본다) */
  function toTarget(ids, target) {
    // 화면에 찍히는 값(반올림)으로 따져야 안내 문구와 숫자가 어긋나지 않는다
    function hit(list) { return Math.round(evaluate(list).score * 100) >= Math.round(target * 100); }

    var cur = ids.slice();
    if (hit(cur)) return { reached: true, passages: 0, pages: 0 };

    var pages = 0, n = 0;
    for (var guard = 0; guard < 200; guard++) {
      var r = recommend(cur, 1)[0];
      if (!r) break;
      cur.push(r.passage.id);
      pages += r.pages; n++;
      if (hit(cur)) return { reached: false, passages: n, pages: pages };
    }
    return { reached: false, passages: n, pages: pages, exhausted: true };
  }

  /* 눈으로 가늠할 수 있게 다섯 단계로 나눈다.
   * 기본 시트만이어도 폰트는 완성되므로 '모자란다'가 아니라 '여기서 시작'이다. */
  function grade(score) {
    if (score >= 0.94) return { label: '아주 좋음', tone: 'best' };
    if (score >= 0.86) return { label: '좋음', tone: 'good' };
    if (score >= 0.76) return { label: '보통', tone: 'fair' };
    if (score > BASE_SHARE) return { label: '기본 + 조금', tone: 'low' };
    return { label: '기본 시트만으로도 완성', tone: 'none' };
  }

  HF.quality = {
    analyze: analyze, evaluate: evaluate, recommend: recommend, grade: grade,
    toTarget: toTarget, TARGETS: TARGETS,
    BASE_SHARE: BASE_SHARE, SYL_SHARE: SYL_SHARE
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
