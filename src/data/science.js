/* 과학 교육과정 연계 — 자체 제작 학습 문장.
 * 6학년 수준에서 벗어나지 않도록 뜻을 넓히지 않고 썼다.
 *
 * 2022 개정 5~6학년군 성취기준([6과..])에 맞춘다. 2015 개정에 있었으나
 * 2022 개정에서 빠진 것(달의 위상 변화, 에너지의 형태와 전환, 생태계)은
 * 넣지 않는다. 아이가 배우지 않은 것을 옮겨 쓰게 하면 뜻이 없다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'sci-earth',
      category: 'science',
      title: '과학 — 지구의 자전과 공전',
      sourceType: 'original',
      learningGoal: '자전과 공전으로 나타나는 현상을 정리합니다.',
      reflectionPrompt: '오늘 해가 가장 높이 떴을 때의 그림자를 떠올려 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['과학', '자전', '공전', '계절'],
      lines: [
        '지구가 자전하기 때문에 하루 동안',
        '태양과 별의 위치가 달라져 보입니다',
        '지구의 자전으로 낮과 밤이 생깁니다',
        '지구가 태양 주위를 공전하기 때문에',
        '계절에 따라 보이는 별자리가 달라집니다',
        '하루 중 태양의 높이가 달라지면',
        '그림자의 길이와 기온도 함께 달라집니다',
        '계절이 변하는 까닭은 지구의 자전축이',
        '기울어진 채 공전하기 때문입니다'
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
      title: '과학 — 연소와 식물, 자원',
      sourceType: 'original',
      learningGoal: '연소의 조건과 식물의 기관, 자원의 이용을 정리합니다.',
      reflectionPrompt: '오늘 아낄 수 있는 자원을 한 가지 찾아 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['과학', '연소', '식물', '자원'],
      lines: [
        '물질이 타려면 탈 물질과 산소와',
        '발화점 이상의 온도가 필요합니다',
        '이산화 탄소는 물질이 타는 것을 막아',
        '불을 끄는 데 쓰입니다',
        '식물의 잎은 빛을 받아 양분을 만들고',
        '뿌리는 흙에서 물을 빨아들입니다',
        '우리가 쓰는 자원은 양이 정해져 있어서',
        '아껴 쓰고 효율적으로 이용해야 합니다',
        '햇빛과 바람처럼 다시 채워지는 것에서',
        '재생에너지를 얻습니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
