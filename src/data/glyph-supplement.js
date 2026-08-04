/* 글자 보완 — 다른 활동지만으로는 잘 나오지 않는 글자를 채운다.
 *
 * 낱글자를 늘어놓지 않고 뜻이 통하는 문장에 담았다.
 * 겹받침(값 몫 넋 앉 않 읽 젊 넓 짧 삶 흙 닭), 쌍자음, 복합모음이
 * 고르게 나오도록 짰다. tools/coverage.js 로 확인한다. */
(function (root) {
  'use strict';
  root.HF.passages.register([
    {
      id: 'sup-jamo1',
      category: 'custom',
      title: '글자 보완 — 겹받침이 있는 말',
      sourceType: 'original',
      learningGoal: '받침이 두 개인 낱말을 또박또박 씁니다.',
      reflectionPrompt: '가장 쓰기 어려웠던 글자와 그 까닭을 써 보세요.',
      difficulty: 'challenging',
      recommendedGrade: [6],
      tags: ['글자보완', '겹받침'],
      lines: [
        '값을 치르고 몫을 나눕니다',
        '넋을 잃고 바라보았습니다',
        '자리에 앉아 책을 읽습니다',
        '늦지 않게 도착했습니다',
        '젊은 나무가 넓게 자랍니다',
        '짧은 글이지만 뜻이 깊습니다',
        '삶은 달걀과 닭고기를 먹습니다',
        '흙을 밟고 여덟 걸음 걸었습니다',
        '핥지 말고 훑어보세요',
        '시를 읊고 짐을 옮깁니다',
        '외곬으로 한 길만 팠습니다',
        '동녘 하늘이 부엌 창에 닿습니다'
      ]
    },
    {
      id: 'sup-jamo2',
      category: 'custom',
      title: '글자 보완 — 된소리와 거센소리',
      sourceType: 'original',
      learningGoal: '쌍자음이 들어간 낱말을 바르게 씁니다.',
      reflectionPrompt: '내가 잘 쓴 글자와 다시 연습할 글자를 써 보세요.',
      difficulty: 'challenging',
      recommendedGrade: [6],
      tags: ['글자보완', '쌍자음'],
      lines: [
        '꽃밭 밖에서 까치가 웁니다',
        '따뜻한 햇볕이 마당에 내리쬡니다',
        '짙은 안개가 걷히고 하늘이 맑습니다',
        '눈이 쌓이고 끈을 묶습니다',
        '빨리 뛰다가 뿌리에 걸렸습니다',
        '쌀을 씻어 밥을 짓습니다',
        '짜지 않고 쫄깃한 떡입니다',
        '괜찮다고 씩씩하게 말했습니다',
        '폭이 좁은 길을 지납니다',
        '책임과 협력이 필요합니다',
        '깊고 넓은 바다를 봅니다'
      ]
    },
    {
      id: 'sup-jamo3',
      category: 'custom',
      title: '글자 보완 — 복합모음',
      sourceType: 'original',
      learningGoal: '모음 두 개가 어울린 글자를 바르게 씁니다.',
      reflectionPrompt: '복합모음 가운데 헷갈리는 글자를 써 보세요.',
      difficulty: 'challenging',
      recommendedGrade: [6],
      tags: ['글자보완', '복합모음'],
      lines: [
        '과학 시간에 왜 그런지 물었습니다',
        '외투를 입고 쥐를 피했습니다',
        '웬일인지 궤도를 벗어났습니다',
        '의자에 앉아 희망을 이야기합니다',
        '괴로워도 뒤돌아보지 않습니다',
        '왕관을 쓴 왜가리를 보았습니다',
        '취미를 물으니 웃으며 답합니다',
        '얘기를 듣고 계획을 세웁니다'
      ]
    },
    {
      id: 'sup-punct',
      category: 'custom',
      title: '글자 보완 — 문장부호 익히기',
      sourceType: 'original',
      learningGoal: '문장부호의 쓰임을 알고 자리에 맞게 씁니다.',
      reflectionPrompt: '오늘 새로 알게 된 문장부호의 쓰임을 써 보세요.',
      difficulty: 'easy',
      recommendedGrade: [5, 6],
      tags: ['글자보완', '문장부호'],
      lines: [
        '오늘은 참 좋은 날입니다.',
        '너는 무엇을 좋아하니?',
        '정말 대단하구나!',
        '사과, 배, 감을 샀습니다.',
        '"함께 가자."라고 말했습니다.',
        '준비물(연필, 지우개)을 챙깁니다.',
        '2026년 3월 2일 월요일',
        '10시 30분에 만나기로 했습니다.'
      ]
    }
  ]);
})(typeof globalThis !== 'undefined' ? globalThis : this);
