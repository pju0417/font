/* 손으로 써야 할 칸 목록을 만든다.
 *
 * 칸(cell) 하나 = 사용자가 실제로 종이에 쓰는 글자 하나.
 * key 는 이미지 추출 결과와 폰트 조립을 이어 주는 식별자다.
 *   L:0041   → 라틴/기호, 유니코드 U+0041
 *   C:V:0    → 초성 0번(ㄱ)의 세로모음용 형태
 *   C:H:0    → 초성 0번(ㄱ)의 가로모음용 형태
 *   J:5      → 중성 5번(ㅔ)
 *   T:1      → 종성 1번(ㄱ)
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};
  var H = HF.hangul;

  function syllable(cho, jung, jong) {
    return String.fromCharCode(0xAC00 + (cho * 21 + jung) * 28 + jong);
  }

  function latinCells() {
    var cells = [];
    for (var cp = 0x21; cp <= 0x7E; cp++) {
      cells.push({
        key: 'L:' + hex4(cp),
        kind: 'latin',
        unicode: cp,
        hint: String.fromCharCode(cp),
        note: '',
        guide: null            // 라틴은 베이스라인 기준으로 배치한다
      });
    }
    return cells;
  }

  function jamoCells() {
    var cells = [];
    var i;
    for (i = 0; i < H.CHO.length; i++) {
      cells.push({
        key: 'C:V:' + i, kind: 'cho', form: 'V', idx: i,
        hint: H.CHO[i], note: syllable(i, 0, 0),      // 가, 까, 나 …
        guide: H.guideBox('cho', 'V')
      });
    }
    for (i = 0; i < H.CHO.length; i++) {
      cells.push({
        key: 'C:H:' + i, kind: 'cho', form: 'H', idx: i,
        hint: H.CHO[i], note: syllable(i, 8, 0),      // 고, 꼬, 노 …
        guide: H.guideBox('cho', 'H')
      });
    }
    for (i = 0; i < H.JUNG.length; i++) {
      cells.push({
        key: 'J:' + i, kind: 'jung', form: H.JUNG_GROUP[i], idx: i,
        hint: H.JUNG[i], note: syllable(11, i, 0),    // 아, 애, 야 …
        guide: H.guideBox('jung', H.JUNG_GROUP[i])
      });
    }
    for (i = 1; i < H.JONG.length; i++) {
      cells.push({
        key: 'T:' + i, kind: 'jong', idx: i,
        hint: H.JONG[i], note: syllable(11, 0, i),    // 악, 앆, 앇 …
        guide: H.guideBox('jong')
      });
    }
    return cells;
  }

  function hex4(n) {
    var s = n.toString(16).toUpperCase();
    while (s.length < 4) s = '0' + s;
    return s;
  }

  /* scope: 'latin' = 영문·숫자·기호만, 'full' = 한글까지 */
  function build(scope) {
    var cells = latinCells();
    if (scope === 'full') cells = cells.concat(jamoCells());
    return cells;
  }

  HF.charset = {
    build: build,
    hex4: hex4,
    SCOPES: {
      latin: { label: '영문 · 숫자 · 기호', count: 94 },
      full: { label: '영문 + 한글 전체', count: 180 }
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
