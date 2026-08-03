/* 실과 · 정보 교육과정 연계 — 자체 제작 학습 문장. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'pra-problem',
      category: 'practicalArts',
      title: '실과 — 문제 해결과 발명',
      sourceType: 'original',
      learningGoal: '생활 속 문제를 해결하는 절차를 정리합니다.',
      reflectionPrompt: '더 편리하게 바꾸고 싶은 물건과 그 방법을 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['실과', '문제해결', '발명'],
      lines: [
        '생활 속 문제를 해결하려면',
        '문제의 원인을 살펴보고',
        '여러 해결 방법을 비교해야 합니다',
        '발명은 새로운 물건을 만드는 것뿐 아니라',
        '기존 물건을 더 편리하게 개선하는 것도',
        '포함합니다'
      ]
    },
    {
      id: 'pra-info',
      category: 'practicalArts',
      title: '정보 — 알고리즘과 인공지능',
      sourceType: 'original',
      learningGoal: '알고리즘과 프로그램, 인공지능의 뜻을 정리합니다.',
      reflectionPrompt: '내가 자주 하는 일을 순서대로 적어 알고리즘으로 만들어 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['정보', '알고리즘', '인공지능'],
      lines: [
        '개인정보는 나와 다른 사람의 안전을 위해',
        '신중하게 관리해야 합니다',
        '알고리즘은 문제를 해결하기 위해',
        '정해 놓은 절차와 방법입니다',
        '프로그램은 알고리즘을 컴퓨터가',
        '이해하고 실행할 수 있도록 표현한 것입니다',
        '인공지능은 많은 자료에서',
        '특징과 규칙을 찾아 결과를 제시합니다',
        '인공지능의 결과에는 오류나 편견이',
        '포함될 수 있으므로 사람이 확인해야 합니다'
      ]
    },
    {
      id: 'pra-life',
      category: 'practicalArts',
      title: '실과 — 건강과 지속 가능한 생활',
      sourceType: 'original',
      learningGoal: '자료 정리와 건강한 생활 습관을 정리합니다.',
      reflectionPrompt: '자원을 아끼기 위해 오늘 실천할 일을 써 보세요.',
      difficulty: 'easy',
      recommendedGrade: [6],
      tags: ['실과', '건강', '환경'],
      lines: [
        '디지털 자료는 목적에 알맞게 분류하고',
        '알아보기 쉬운 이름으로 저장합니다',
        '건강한 식생활을 위해서는',
        '여러 영양소를 알맞은 양으로 섭취해야 합니다',
        '지속 가능한 생활은 자원을 아끼고',
        '환경에 미치는 영향을 줄이는 생활입니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
