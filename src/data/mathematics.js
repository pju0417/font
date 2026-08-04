/* 수학 교육과정 연계 — 자체 제작 학습 문장.
 * 6학년 수준을 넘는 용어는 쓰지 않았다.
 * 숫자를 고르게 모으려고 식과 수를 함께 넣은 활동지를 따로 두었다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'math-ratio',
      category: 'mathematics',
      title: '수학 — 비와 비율',
      sourceType: 'original',
      learningGoal: '비, 비율, 백분율의 뜻을 문장으로 정리합니다.',
      reflectionPrompt: '생활에서 백분율을 본 곳을 한 가지 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['수학', '비율', '백분율'],
      lines: [
        '분수의 나눗셈은 나누는 분수의',
        '분모와 분자를 바꾸어 곱해 계산합니다',
        '비는 두 양의 크기를',
        '나눗셈으로 비교한 것입니다',
        '비율은 기준량에 대한',
        '비교하는 양의 크기입니다',
        '백분율은 기준량을 백으로 보았을 때',
        '비교하는 양이 얼마인지 나타낸 것입니다'
      ]
    },
    {
      id: 'math-shape',
      category: 'mathematics',
      title: '수학 — 도형의 넓이와 부피',
      sourceType: 'original',
      learningGoal: '원과 입체도형의 넓이·부피 구하는 방법을 정리합니다.',
      reflectionPrompt: '오늘 배운 공식 가운데 헷갈리는 것을 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['수학', '도형', '넓이'],
      lines: [
        '원주는 지름에 원주율을 곱하여 구합니다',
        '원의 넓이는 반지름을 두 번 곱한 뒤',
        '원주율을 곱하여 구합니다',
        '직육면체의 겉넓이는',
        '여섯 면의 넓이를 모두 더한 값입니다',
        '직육면체의 부피는 가로와 세로와',
        '높이를 곱하여 구합니다',
        '각기둥과 각뿔은 밑면의 모양에 따라',
        '이름이 정해집니다'
      ]
    },
    {
      id: 'math-data',
      category: 'mathematics',
      title: '수학 — 자료와 평균',
      sourceType: 'original',
      learningGoal: '자료를 나타내는 그래프와 평균의 뜻을 정리합니다.',
      reflectionPrompt: '우리 반 자료를 어떤 그래프로 나타내면 좋을지 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['수학', '그래프', '평균'],
      lines: [
        '띠그래프는 전체에 대한 각 부분의 비율을',
        '띠 모양으로 나타낸 그래프입니다',
        '원그래프는 전체에 대한 각 부분의 비율을',
        '원 안의 부채꼴로 나타냅니다',
        '평균은 여러 자료의 값을 모두 더한 뒤',
        '자료의 수로 나누어 구합니다',
        '문제를 해결한 뒤에는 계산 결과가',
        '상황에 알맞은지 다시 확인해야 합니다'
      ]
    },
    {
      id: 'math-numbers',
      category: 'mathematics',
      title: '수학 — 숫자와 기호 쓰기',
      sourceType: 'original',
      learningGoal: '0부터 9까지 숫자와 계산 기호를 바르게 씁니다.',
      reflectionPrompt: '내가 가장 예쁘게 쓴 숫자와 다시 연습할 숫자를 써 보세요.',
      difficulty: 'easy',
      recommendedGrade: [5, 6],
      tags: ['수학', '숫자', '기호'],
      lines: [
        '0 1 2 3 4 5 6 7 8 9',
        '12 + 34 = 46',
        '90 - 25 = 65',
        '7 x 8 = 56',
        '72 / 9 = 8',
        '1/2 + 1/3 = 5/6',
        '0.25 = 25%',
        '(3 + 5) x 2 = 16',
        '평균은 (10 + 20 + 30) / 3 = 20',
        '반지름 5cm인 원의 넓이는 78.5제곱센티미터',
        '컴퓨터에서는 곱하기를 x로 나누기를 /로 씁니다'
      ]
    },
    {
      id: 'math-proportion',
      category: 'mathematics',
      title: '수학 — 비례식과 가능성',
      sourceType: 'original',
      learningGoal: '비례식의 성질과 가능성의 뜻을 문장으로 정리합니다.',
      reflectionPrompt: '내일 비가 올 가능성을 말로 표현해 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['수학', '비례식', '가능성'],
      lines: [
        '비율이 같은 두 비를 등호로 이은 식을',
        '비례식이라고 합니다',
        '비례식에서 바깥쪽 두 수의 곱과',
        '안쪽 두 수의 곱은 서로 같습니다',
        '비례배분은 전체를 주어진 비에 따라',
        '나누는 것입니다',
        '가능성은 어떤 일이 일어나리라고',
        '기대할 수 있는 정도입니다',
        '가능성은 확실하다 반반이다 불가능하다처럼',
        '말로 나타내거나 수로 나타낼 수 있습니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
