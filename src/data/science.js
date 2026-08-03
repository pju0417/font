/* 과학 교육과정 연계 — 자체 제작 학습 문장.
 * 6학년 수준에서 벗어나지 않도록 뜻을 넓히지 않고 썼다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'sci-earth',
      category: 'science',
      title: '과학 — 지구와 달',
      sourceType: 'original',
      learningGoal: '지구의 자전과 공전, 달의 모양 변화를 정리합니다.',
      reflectionPrompt: '오늘 밤 달의 모양을 그려 보고 이름을 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['과학', '지구', '달'],
      lines: [
        '지구의 자전으로 태양과 별이',
        '동쪽에서 서쪽으로 움직이는 것처럼 보입니다',
        '달은 스스로 빛을 내지 않고',
        '태양빛을 반사하여 밝게 보입니다',
        '달의 모양이 날마다 달라 보이는 까닭은',
        '태양과 지구와 달의 위치가',
        '달라지기 때문입니다',
        '계절이 달라지는 주된 까닭은',
        '지구의 자전축이 기울어진 채',
        '태양 주위를 공전하기 때문입니다'
      ]
    },
    {
      id: 'sci-light',
      category: 'science',
      title: '과학 — 빛과 전기',
      sourceType: 'original',
      learningGoal: '빛의 성질과 전기 회로의 특징을 정리합니다.',
      reflectionPrompt: '볼록 렌즈로 관찰하고 싶은 것을 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['과학', '빛', '전기'],
      lines: [
        '전구의 밝기는 전지와 전구를',
        '연결한 방법에 따라 달라질 수 있습니다',
        '렌즈를 통과한 빛은 렌즈의 모양에 따라',
        '모이거나 퍼질 수 있습니다'
      ]
    },
    {
      id: 'sci-life',
      category: 'science',
      title: '과학 — 생물과 에너지',
      sourceType: 'original',
      learningGoal: '기체의 성질과 생태계, 에너지 전환을 정리합니다.',
      reflectionPrompt: '우리 주변에서 에너지가 바뀌는 예를 한 가지 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['과학', '생태계', '에너지'],
      lines: [
        '산소는 물질이 타는 데 필요하며',
        '이산화 탄소는 불을 끄는 성질이 있습니다',
        '식물은 빛에너지를 이용해',
        '양분을 만들고 산소를 내보냅니다',
        '생태계의 생물은 먹이 관계와 환경을 통해',
        '서로 영향을 주고받습니다',
        '에너지는 여러 형태로 전환되지만',
        '새로 생기거나 완전히 사라지지는 않습니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
