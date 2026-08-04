/* 국어 교육과정 연계 — 모두 이 프로그램을 위해 새로 쓴 학습 문장.
 * 교과서 본문이나 활동 지시문을 옮기지 않았다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'kor-reading',
      category: 'koreanLanguage',
      title: '국어 — 작품 읽기',
      sourceType: 'original',
      learningGoal: '작품을 깊이 읽는 방법을 문장으로 정리합니다.',
      reflectionPrompt: '최근에 읽은 작품에서 마음에 남은 장면과 그 까닭을 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['국어', '문학', '인물'],
      lines: [
        '작품 속 인물의 말과 행동을 살펴보면',
        '인물이 추구하는 삶을 짐작할 수 있습니다',
        '인물의 선택을 나의 경험과 비교하면',
        '작품을 더 깊이 이해할 수 있습니다',
        '시에 반복해서 나타나는 낱말은',
        '시의 느낌과 주제를 강조합니다',
        '이야기의 배경은 인물의 행동과',
        '사건의 전개에 영향을 줍니다'
      ]
    },
    {
      id: 'kor-argument',
      category: 'koreanLanguage',
      title: '국어 — 주장과 근거',
      sourceType: 'original',
      learningGoal: '주장과 근거의 뜻을 구분하여 정리합니다.',
      reflectionPrompt: '내가 펴고 싶은 주장과 그 근거를 한 가지씩 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['국어', '주장', '근거'],
      lines: [
        '주장은 글쓴이가 독자에게',
        '받아들이도록 요구하는 중심 생각입니다',
        '근거는 주장을 뒷받침하는 사실이나',
        '자료 또는 경험입니다',
        '믿을 만한 자료인지 판단하려면',
        '출처와 작성 날짜를 확인해야 합니다',
        '주장과 관련이 없는 자료는',
        '근거로 사용하기 어렵습니다',
        '서로 다른 의견을 비교하면',
        '문제를 다양한 관점에서 볼 수 있습니다'
      ]
    },
    {
      id: 'kor-media',
      category: 'koreanLanguage',
      title: '국어 — 매체와 정보',
      sourceType: 'original',
      learningGoal: '매체 자료를 비판적으로 읽는 방법을 익힙니다.',
      reflectionPrompt: '인터넷 자료를 쓸 때 내가 지킬 규칙 한 가지를 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['국어', '매체', '저작권'],
      lines: [
        '같은 사건도 매체에 따라',
        '표현 방법과 강조하는 내용이 달라집니다',
        '인터넷 자료를 활용할 때에는',
        '만든 사람과 출처를 확인해야 합니다',
        '제목이나 사진만 보고 판단하지 말고',
        '전체 정보를 살펴봅니다',
        '사실과 의견을 구분하면',
        '정보를 비판적으로 이해할 수 있습니다',
        '다른 사람이 만든 글과 사진을 쓸 때에는',
        '저작권을 존중해야 합니다'
      ]
    },
    {
      id: 'kor-grammar',
      category: 'koreanLanguage',
      title: '국어 — 문장의 호응과 띄어쓰기',
      sourceType: 'original',
      learningGoal: '호응이 맞는 문장을 쓰고 띄어쓰기를 살펴 고칩니다.',
      reflectionPrompt: '내가 자주 틀리는 띄어쓰기를 한 가지 찾아 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['국어', '문법', '호응', '띄어쓰기'],
      /* 손으로 쓰면서 익히기에 가장 잘 맞는 내용이다.
       * 틀린 문장을 베끼게 하면 틀린 채로 굳으므로 바른 문장만 싣는다. */
      lines: [
        '나는 결코 약속을 어기지 않았습니다',
        '왜냐하면 비가 많이 왔기 때문입니다',
        '내일 우리는 도서관에 갈 것입니다',
        '어제 나는 친구와 함께 책을 읽었습니다',
        '별로 어렵지 않은 문제였습니다',
        '아버지께서 방에 들어가셨습니다',
        '할머니께 여쭈어보았습니다',
        '먹을 만큼만 담고 남기지 않습니다',
        '할 수 있는 일부터 차례대로 합니다'
      ]
    },
    {
      id: 'kor-idiom',
      category: 'koreanLanguage',
      title: '국어 — 관용 표현과 고유어',
      sourceType: 'original',
      learningGoal: '관용 표현과 고유어의 뜻을 알고 상황에 맞게 씁니다.',
      reflectionPrompt: '오늘 쓰고 싶은 관용 표현을 하나 골라 문장으로 써 보세요.',
      difficulty: 'normal',
      recommendedGrade: [6],
      tags: ['국어', '관용표현', '고유어'],
      lines: [
        '발이 넓다는 아는 사람이 많다는 뜻입니다',
        '손이 크다는 씀씀이가 넉넉하다는 뜻입니다',
        '귀가 얇다는 남의 말을 쉽게 믿는다는 뜻입니다',
        '어깨가 무겁다는 책임이 크다는 뜻입니다',
        '눈에 밟히다는 잊히지 않는다는 뜻입니다',
        '가늠은 어림잡아 헤아린다는 뜻의 고유어입니다',
        '아름은 두 팔로 안은 둘레를 이릅니다',
        '너비는 가로로 건너지른 길이를 말합니다'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
