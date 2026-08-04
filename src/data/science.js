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
    },
    {
      id: 'sci-solution',
      category: 'science',
      title: '과학 — 용액과 산성·염기성',
      sourceType: 'original',
      learningGoal: '용해와 용액, 산성 용액과 염기성 용액을 정리합니다.',
      reflectionPrompt: '집에서 찾을 수 있는 산성 용액을 한 가지 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [5, 6],
      tags: ['과학', '용해', '용액', '산성'],
      lines: [
        '어떤 물질이 다른 물질에 골고루 섞여',
        '녹는 현상을 용해라고 합니다',
        '물의 온도가 높을수록 녹는 용질의 양이',
        '많아지는 경우가 있습니다',
        '지시약의 색깔 변화로 용액을',
        '산성과 염기성으로 분류할 수 있습니다',
        '푸른 리트머스 종이를 붉게 바꾸는 것이',
        '산성 용액입니다',
        '산성 용액과 염기성 용액을 섞으면',
        '각각의 성질이 약해집니다'
      ]
    },
    {
      id: 'sci-body',
      category: 'science',
      title: '과학 — 우리 몸과 속력',
      sourceType: 'original',
      learningGoal: '우리 몸의 기관과 속력의 뜻을 정리합니다.',
      reflectionPrompt: '오늘 안전을 위해 지킬 일을 한 가지 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [5, 6],
      tags: ['과학', '우리몸', '속력', '안전'],
      lines: [
        '뼈는 몸을 지탱하고 근육은 뼈를 움직여',
        '우리 몸이 움직입니다',
        '소화와 순환과 호흡과 배설 기관은',
        '서로 관련을 맺으며 일합니다',
        '속력은 물체가 이동한 거리를',
        '걸린 시간으로 나누어 구합니다',
        '속력이 클수록 위험하므로',
        '교통안전 수칙을 지켜야 합니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
