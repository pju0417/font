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

  /* 필사 시트: 글을 원고지처럼 한 칸에 한 자씩 놓는다.
   *
   * 글의 줄바꿈을 살리려고 칸을 순서대로 채우지 않고 자리(slot)를 직접 정한다.
   * 그래야 종이가 시처럼 읽히고, 쓰는 사람이 지금 어디를 쓰는지 알 수 있다.
   *
   * 같은 글자가 여러 번 나와도 그대로 둔다. 글이 글답게 읽혀야 하고,
   * 겹치는 칸은 더 진하게 쓴 쪽이 자동으로 뽑히므로 손해가 아니다.
   * 띄어쓰기는 빈 칸으로 두고, 문장부호는 그려만 두고 글자로는 걷지 않는다. */
  function hasHangul(line) {
    for (var i = 0; i < line.length; i++) {
      var cp = line.charCodeAt(i);
      if (cp >= 0xAC00 && cp <= 0xD7A3) return true;
    }
    return false;
  }

  /* 줄마다 쓰기 방식을 정한다.
   *   ko — 한글이 들어간 줄. 원고지 네모 칸에 한 자씩
   *   en — 알파벳·숫자만 있는 줄. 영어 노트처럼 가로줄 위에 이어서
   * 한 줄에 한글과 영어를 섞으면 둘 다 어색해지므로, 자료를 쓸 때
   * 영어 줄과 뜻풀이 줄을 따로 둔다. */
  function lineStyle(line) {
    return hasHangul(line) ? 'ko' : 'en';
  }

  function buildPassagePages(grid) {
    var rows = grid.rows;
    var pages = [];

    HF.passages.list.forEach(function (passage) {
      var collect = HF.passages.collects(passage);
      var made = [];
      var cells = [], styles = [], row = 0, col = 0;

      function flush() {
        if (cells.length) made.push({ cells: cells, styles: styles });
        cells = []; styles = []; row = 0; col = 0;
      }
      function newline() {
        col = 0; row++;
        if (row >= rows) flush();
      }

      passage.lines.forEach(function (line) {
        var style = lineStyle(line);
        var cols = grid[style].cols;
        for (var i = 0; i < line.length; i++) {
          /* 영어 줄은 낱말이 잘리지 않게 넘긴다.
           * 'everyone' 이 'e / veryone' 으로 쪼개지면 읽기도 쓰기도 나쁘다.
           * 한글은 원고지 관례대로 칸을 채워 넘어간다. */
          if (style === 'en' && line.charAt(i) !== ' ') {
            var wordEnd = line.indexOf(' ', i);
            var wordLen = (wordEnd < 0 ? line.length : wordEnd) - i;
            var isWordStart = i === 0 || line.charAt(i - 1) === ' ';
            if (isWordStart && wordLen <= cols && col + wordLen > cols) newline();
          }
          if (col >= cols) newline();
          if (row >= rows) flush();
          styles[row] = style;
          var ch = line.charAt(i);
          var cp = line.charCodeAt(i);
          if (ch !== ' ') {
            /* 한글은 네모 칸이 곧 음절 상자라 그대로 걷는다.
             * 영어 줄은 베이스라인이 있으므로 알파벳도 걷을 수 있다.
             * (같은 글자를 기본 영문 시트에서도 걷는데, 그쪽 칸이 훨씬 커서
             *  잉크가 많아 보통 기본 시트 쪽이 선택된다. 활동지는 기본 시트에서
             *  빠뜨린 글자를 메워 주는 몫이다.) */
            var hangul = cp >= 0xAC00 && cp <= 0xD7A3;
            var kind = !collect ? 'mark'
                     : hangul ? 'syllable'
                     : (style === 'en' ? 'latin' : 'mark');
            var prefix = kind === 'syllable' ? 'S:' : kind === 'latin' ? 'L:' : 'M:';
            cells.push({
              // 같은 글자가 여러 번 나오면 키가 같아 더 진한 쪽이 선택된다
              key: prefix + hex4(cp),
              kind: kind,
              unicode: cp, hint: ch, note: '', guide: null,
              style: style, row: row, col: col
            });
          }
          col++;
        }
        newline();
      });
      flush();

      // 빈 원고지 쪽 (교과서를 보고 학생이 직접 옮겨 쓰는 활동)
      for (var b = 0; b < (passage.blankPages || 0); b++) {
        var blank = [];
        for (var r = 0; r < rows; r++) blank[r] = 'ko';
        made.push({ cells: [], styles: blank });
      }

      made.forEach(function (m, i) {
        pages.push({
          passage: passage, part: i + 1, parts: made.length,
          cells: m.cells, rowStyles: m.styles
        });
      });
    });

    return pages;
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
    buildPassagePages: buildPassagePages,
    hex4: hex4,
    SCOPES: {
      latin: { label: '영문 · 숫자 · 기호', count: 94 },
      full: { label: '영문 + 한글 전체', count: 180 }
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
