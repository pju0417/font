/* 한글 조합(組合) 규칙.
 *
 * 설계: 사용자는 자모를 정해진 몇 가지 "형태"로만 손으로 쓴다.
 * 프로그램은 음절마다 초/중/종성을 정해진 사각형 영역에 맞춰 배치해
 * 11,172자(가~힣)를 전부 만들어 낸다.
 *
 * 좌표계: 아래 BOX 들은 "음절 상자" 안의 비율(0~1)이며 y는 아래로 증가한다.
 * (템플릿 그리기와 폰트 조립이 같은 숫자를 공유해야 하므로 여기 한 곳에만 둔다.)
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  // 종성은 인덱스 0 = 받침 없음
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ',
              'ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 중성 계열: V=세로모음(초성 왼쪽), H=가로모음(초성 위), M=복합모음(초성 왼쪽 위)
  var JUNG_GROUP = ['V','V','V','V','V','V','V','V','H','M','M','M','H','H','M','M','M','H','H','M','V'];

  // 초성을 손으로 쓰는 형태: 세로모음용(V)과 가로모음용(H) 두 가지.
  // M(복합모음)일 때는 초성이 위쪽에 눕듯이 오므로 H 형태를 쓴다.
  function choFormFor(jungIdx) {
    return JUNG_GROUP[jungIdx] === 'V' ? 'V' : 'H';
  }

  /* 배치 상자: [x, y, w, h] 비율. y는 위에서 아래로.
   * noJong = 받침 없음, jong = 받침 있음 */
  var BOX = {
    V: {
      noJong: { cho: [0.00, 0.02, 0.56, 0.96], jung: [0.60, 0.00, 0.40, 1.00] },
      jong:   { cho: [0.00, 0.02, 0.54, 0.66], jung: [0.58, 0.00, 0.42, 0.68],
                jong: [0.06, 0.68, 0.88, 0.32] }
    },
    H: {
      noJong: { cho: [0.14, 0.00, 0.72, 0.58], jung: [0.00, 0.62, 1.00, 0.38] },
      jong:   { cho: [0.16, 0.00, 0.68, 0.38], jung: [0.00, 0.40, 1.00, 0.26],
                jong: [0.12, 0.68, 0.76, 0.32] }
    },
    M: {
      noJong: { cho: [0.02, 0.00, 0.50, 0.58], jung: [0.00, 0.00, 1.00, 1.00] },
      jong:   { cho: [0.02, 0.00, 0.48, 0.40], jung: [0.00, 0.00, 1.00, 0.68],
                jong: [0.10, 0.68, 0.80, 0.32] }
    }
  };

  /* 자모를 "쓸 때" 보여줄 안내 상자.
   * 사용자가 이 비율대로 쓰면 조합 결과가 가장 자연스럽다. */
  function guideBox(kind, form) {
    if (kind === 'cho') return form === 'V' ? BOX.V.noJong.cho : BOX.H.noJong.cho;
    if (kind === 'jung') {
      if (form === 'V') return BOX.V.noJong.jung;
      if (form === 'H') return BOX.H.noJong.jung;
      return BOX.M.noJong.jung;
    }
    return BOX.V.jong.jong;
  }

  /* 잉크 영역을 상자에 맞출 때 쓰는 배율.
   *
   * 자음(초성·종성)에게 상자는 '채워야 할 자리'다. 세로모음 앞의 ㄱ 은 실제
   * 한글 글꼴에서도 위아래로 길쭉해지므로 늘여서 채운다. 다만 가로세로 배율
   * 차이는 MAX_ANISO 배까지만 허용해 지나친 찌그러짐을 막는다.
   *
   * 모음에게 상자는 '놓일 자리'다. ㅡ 나 ㅣ 는 획 하나라서 상자를 채우려 들면
   * 획이 그대로 굵어져 버린다. 그래서 비율을 지킨 채 상자 안에 넣는다. */
  var MAX_ANISO = 2.2;

  function fitScale(inkW, inkH, boxW, boxH, kind) {
    var sxFull = boxW / Math.max(1e-6, inkW);
    var syFull = boxH / Math.max(1e-6, inkH);
    if (kind === 'jung') {
      var u = Math.min(sxFull, syFull);
      return { sx: u, sy: u };
    }
    return {
      sx: Math.min(sxFull, syFull * MAX_ANISO),
      sy: Math.min(syFull, sxFull * MAX_ANISO)
    };
  }

  /* 음절 하나의 배치를 계산한다.
   * 반환: [{ part:'cho'|'jung'|'jong', key, box:[x,y,w,h] }, ...] */
  function decompose(code) {
    var s = code - 0xAC00;
    if (s < 0 || s > 11171) return null;
    var jongIdx = s % 28;
    var jungIdx = ((s - jongIdx) / 28) % 21;
    var choIdx = (((s - jongIdx) / 28) - jungIdx) / 21;
    return { cho: choIdx, jung: jungIdx, jong: jongIdx };
  }

  function compose(code) {
    var d = decompose(code);
    if (!d) return null;
    var group = JUNG_GROUP[d.jung];
    var set = BOX[group][d.jong ? 'jong' : 'noJong'];
    var parts = [
      { part: 'cho', key: 'C:' + choFormFor(d.jung) + ':' + d.cho, box: set.cho },
      { part: 'jung', key: 'J:' + d.jung, box: set.jung }
    ];
    if (d.jong) parts.push({ part: 'jong', key: 'T:' + d.jong, box: set.jong });
    return parts;
  }

  HF.hangul = {
    CHO: CHO, JUNG: JUNG, JONG: JONG,
    JUNG_GROUP: JUNG_GROUP,
    BOX: BOX,
    choFormFor: choFormFor,
    guideBox: guideBox,
    fitScale: fitScale,
    MAX_ANISO: MAX_ANISO,
    decompose: decompose,
    compose: compose,
    FIRST: 0xAC00,
    LAST: 0xD7A3,
    COUNT: 11172
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
