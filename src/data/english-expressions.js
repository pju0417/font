/* 영어 교육과정 의사소통 표현.
 * 검정 교과서마다 표현이 다르므로 특정 출판사의 단원명이나 본문을 옮기지 않았다.
 * 한글 뜻은 이 프로그램을 위해 새로 썼다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'eng-exp-future',
      category: 'englishExpressions',
      title: '영어 표현 — 장래 희망과 계획',
      sourceType: 'original',
      learningGoal: '하고 싶은 일과 계획을 묻고 답하는 표현을 익힙니다.',
      reflectionPrompt: '내가 되고 싶은 것을 영어 한 문장으로 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['영어', '표현', '진로'],
      lines: [
        'What do you want to be?',
        '너는 무엇이 되고 싶니?',
        'I want to be a scientist.',
        '나는 과학자가 되고 싶어.',
        'What are you going to do?',
        '너는 무엇을 할 예정이니?',
        'I am going to visit my grandparents.',
        '나는 조부모님을 찾아뵐 거야.'
      ]
    },
    {
      id: 'eng-exp-often',
      category: 'englishExpressions',
      title: '영어 표현 — 빈도와 의견',
      sourceType: 'original',
      learningGoal: '얼마나 자주 하는지 묻고 의견을 말하는 표현을 익힙니다.',
      reflectionPrompt: '내가 일주일에 몇 번 운동하는지 영어로 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['영어', '표현', '빈도'],
      lines: [
        'How often do you exercise?',
        '너는 얼마나 자주 운동하니?',
        'I exercise three times a week.',
        '나는 일주일에 세 번 운동해.',
        'What do you think about it?',
        '그것에 대해 어떻게 생각하니?',
        'I think it is a good idea.',
        '나는 그것이 좋은 생각이라고 봐.'
      ]
    },
    {
      id: 'eng-exp-help',
      category: 'englishExpressions',
      title: '영어 표현 — 도움과 길 안내',
      sourceType: 'original',
      learningGoal: '도움을 청하고 길을 안내하는 표현을 익힙니다.',
      reflectionPrompt: '학교에서 우리 교실까지 가는 길을 영어로 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['영어', '표현', '길안내'],
      lines: [
        'Could you help me, please?',
        '저를 도와주시겠어요?',
        'Sure. No problem.',
        '물론이지. 문제없어.',
        'How can I get to the museum?',
        '박물관에 어떻게 갈 수 있나요?',
        'Go straight and turn left.',
        '곧장 가다가 왼쪽으로 도세요.'
      ]
    },
    {
      id: 'eng-exp-health',
      category: 'englishExpressions',
      title: '영어 표현 — 아플 때',
      sourceType: 'original',
      learningGoal: '몸이 아플 때 묻고 답하는 표현을 익힙니다.',
      reflectionPrompt: '아픈 친구에게 해 줄 말을 영어로 써 보세요.',
      difficulty: 'easy',
      recommendedGrade: [6],
      tags: ['영어', '표현', '건강'],
      lines: [
        'What is wrong?',
        '무슨 일이니?',
        'I have a headache.',
        '나는 머리가 아파.',
        'You should get some rest.',
        '너는 좀 쉬는 게 좋겠어.',
        'I hope you feel better soon.',
        '빨리 나으면 좋겠어.'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
