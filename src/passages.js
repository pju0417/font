/* 활동지 콘텐츠 등록소.
 *
 * 실제 글은 src/data/*.js 에 나뉘어 있고, 각 파일이 여기에 register() 로 넣는다.
 * 화면 코드에는 글을 하나도 두지 않는다.
 *
 * 콘텐츠 한 건의 구조 (없는 항목은 아예 빼 둔다. null 이나 빈 문자열을 넣지 않는다)
 *   id             문자열 열쇠. 종이의 쪽 번호와 이어지므로 한번 정하면 바꾸지 않는다
 *   category       아래 CATEGORIES 의 id
 *   title          활동지 제목
 *   lines          본문. 한 줄이 원고지의 한 줄이 된다
 *   sourceType     publicDomain | traditional | original | textbookReference
 *   author         지은이 (있을 때만)
 *   workTitle      작품명 (제목과 다를 때만)
 *   sourceNote     출처·저작권 확인 메모
 *   learningGoal   오늘의 필사 목표. 활동지 머리말에 인쇄된다
 *   reflectionPrompt  생각 쓰기 물음. 활동지 아래쪽에 인쇄된다
 *   difficulty     easy | normal | challenging
 *   recommendedGrade  [6] 처럼 학년 배열
 *   tags           검색·분류용 낱말
 *   collect        false 면 폰트 글자로 걷지 않는다 (기본값 true)
 *
 * ⚠ 글을 고치면 '몇 쪽 몇 번 칸이 어떤 글자인지'가 달라진다.
 *   이미 인쇄해 둔 종이가 있으면 다시 뽑아야 한다.
 */
(function (root) {
  'use strict';
  var HF = root.HF = root.HF || {};

  /* 학습 분야. 화면의 선택 목록 순서가 된다. */
  var CATEGORIES = [
    { id: 'classicLiterature', label: '고전 문학', hint: '저작권이 만료된 시와 시조' },
    { id: 'proverbs', label: '속담과 격언', hint: '예로부터 전해 오는 말' },
    { id: 'koreanLanguage', label: '국어', hint: '작품 읽기 · 주장과 근거 · 매체' },
    { id: 'characterEducation', label: '인성교육', hint: '존중 · 책임 · 협력 · 디지털 시민성' },
    { id: 'socialStudies', label: '사회 · 도덕', hint: '민주주의 · 세계 · 경제생활' },
    { id: 'mathematics', label: '수학', hint: '비와 비율 · 도형 · 자료와 가능성' },
    { id: 'science', label: '과학', hint: '지구와 달 · 빛 · 생태계 · 에너지' },
    { id: 'practicalArts', label: '실과 · 정보', hint: '문제 해결 · 알고리즘 · 지속 가능한 생활' },
    { id: 'englishVocabulary', label: '영어 단어', hint: '단어와 뜻을 함께 씁니다' },
    { id: 'englishExpressions', label: '영어 표현', hint: '교육과정 의사소통 표현' },
    { id: 'englishProverbs', label: '영어 속담', hint: '오래전부터 널리 쓰인 말' },
    { id: 'custom', label: '글자 보완', hint: '까다로운 글자를 채우는 활동지' }
  ];

  /* 자료 유형 표시. 활동지와 화면에서 고전 원문과 자체 제작 문장을 구분해 준다. */
  var SOURCE_TYPES = {
    publicDomain: { label: '저작권 만료 작품', short: '만료저작물' },
    traditional: { label: '전해 오는 말', short: '전통' },
    original: { label: '자체 제작 학습 문장', short: '자체 제작' },
    textbookReference: { label: '교과서 안내', short: '교과서 참고' }
  };

  var LIST = [];
  var seen = {};

  function register(items) {
    items.forEach(function (item) {
      if (seen[item.id]) throw new Error('활동지 id 가 겹칩니다: ' + item.id);
      seen[item.id] = true;
      LIST.push(item);
    });
  }

  function byId(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  function byCategory(catId) {
    return LIST.filter(function (p) { return p.category === catId; });
  }

  /* 이 글에서 폰트 글자를 걷는가 (기본은 걷는다) */
  function collects(item) {
    return item.collect !== false;
  }

  HF.passages = {
    list: LIST, register: register, byId: byId, byCategory: byCategory,
    collects: collects, CATEGORIES: CATEGORIES, SOURCE_TYPES: SOURCE_TYPES
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
