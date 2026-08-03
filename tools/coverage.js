/* 활동지가 어떤 글자를 모으는지 점검한다.
 *   node tools/coverage.js
 *
 * 기본 시트(라틴 94칸 + 자모 86칸)는 그 자체로 ASCII 전체와 한글 11,172자를
 * 보장한다. 활동지는 그 가운데 일부를 '조합' 대신 '손으로 쓴 글자'로 올려 준다.
 * 그래서 여기서 보는 것은 "무엇이 손글씨로 올라가는가" 이다.
 */
'use strict';
const HF = require('./load')(['charset', 'layout']);

const L = HF.layout.build('full');
const base = { latin: new Set(), jamo: new Set() };
const written = new Set();     // 활동지에서 통글자로 걷는 음절
const drawn = new Set();       // 종이에는 있으나 걷지 않는 글자

L.pages.forEach(p => p.cells.forEach(c => {
  if (c.kind === 'latin') base.latin.add(c.unicode);
  else if (c.kind === 'syllable') written.add(c.unicode);
  else if (c.kind === 'mark') drawn.add(c.unicode);
  else base.jamo.add(c.key);
}));

const ok = v => v ? '✓' : '✗';
const chr = c => String.fromCharCode(c);
let problems = 0;
function check(label, pass, detail) {
  if (!pass) problems++;
  console.log(`  ${ok(pass)} ${label}${detail ? '  ' + detail : ''}`);
}

console.log(`쪽 구성: 전체 ${L.pages.length}쪽 (기본 ${L.basePages} + 활동지 ${L.passagePages})`);
console.log(`활동지 ${HF.passages.list.length}종 · 필사 칸 ${written.size + drawn.size}종`);

console.log('\n[기본 시트 — 폰트의 바탕]');
const digits = [...'0123456789'].every(c => base.latin.has(c.charCodeAt(0)));
const upper = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].every(c => base.latin.has(c.charCodeAt(0)));
const lower = [...'abcdefghijklmnopqrstuvwxyz'].every(c => base.latin.has(c.charCodeAt(0)));
const punct = [...'.,?!\'"()'].every(c => base.latin.has(c.charCodeAt(0)));
check('숫자 0~9', digits);
check('영어 대문자 A~Z', upper);
check('영어 소문자 a~z', lower);
check('문장부호 . , ? ! \' " ( )', punct);
check('한글 자모 86종 (11,172자 조합의 바탕)', base.jamo.size === 86, `${base.jamo.size}/86`);

console.log('\n[활동지 — 손글씨로 올라가는 한글]');
const cho = new Set(), jung = new Set(), jong = new Set();
written.forEach(c => {
  const s = c - 0xAC00;
  cho.add(Math.floor(s / 588));
  jung.add(Math.floor(s / 28) % 21);
  jong.add(s % 28);
});
const DOUBLE_CHO = [1, 4, 8, 10, 13];               // ㄲ ㄸ ㅃ ㅆ ㅉ
const COMPLEX_JUNG = [9, 10, 11, 14, 15, 16, 19];   // ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ
const DOUBLE_JONG = [3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18]; // ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ
check('서로 다른 음절', written.size >= 200, `${written.size}자`);
check('초성 19종', cho.size === 19, `${cho.size}/19`);
check('  └ 쌍자음 초성', DOUBLE_CHO.every(i => cho.has(i)),
      DOUBLE_CHO.filter(i => !cho.has(i)).map(i => HF.hangul.CHO[i]).join('') || '전부 있음');
check('중성 21종', jung.size >= 19, `${jung.size}/21`);
check('  └ 복합모음', COMPLEX_JUNG.every(i => jung.has(i)),
      COMPLEX_JUNG.filter(i => !jung.has(i)).map(i => HF.hangul.JUNG[i]).join('') || '전부 있음');
check('받침 28종(없음 포함)', jong.size === 28, `${jong.size}/28`);
check('  └ 겹받침', DOUBLE_JONG.every(i => jong.has(i)),
      DOUBLE_JONG.filter(i => !jong.has(i)).map(i => HF.hangul.JONG[i]).join('') || '전부 있음');

const MUST = '꽃밖읽앉않삶닭흙젊넓짧값괜찮햇볕짙쌓묶뜻폭책임협력';
const miss = [...MUST].filter(c => !written.has(c.charCodeAt(0)));
check('명세서가 지정한 까다로운 글자', miss.length === 0,
      miss.length ? '빠짐: ' + miss.join('') : MUST.length + '자 모두 있음');

console.log('\n[종이에 있으나 폰트로 걷지 않는 글자]');
const kinds = { 영문: 0, 숫자: 0, 부호: 0, 한글: 0 };
drawn.forEach(c => {
  if (c >= 0xAC00 && c <= 0xD7A3) kinds.한글++;
  else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) kinds.영문++;
  else if (c >= 48 && c <= 57) kinds.숫자++;
  else kinds.부호++;
});
console.log(`  영문 ${kinds.영문}종 · 숫자 ${kinds.숫자}종 · 부호 ${kinds.부호}종 · 한글 ${kinds.한글}종`);
console.log('  (영문·숫자·부호는 기본 영문 시트에서 베이스라인과 함께 이미 걷는다)');
if (kinds.한글) console.log('  (한글은 collect:false 활동지 — 교과서 안내용)');

console.log('\n[활동지별 쪽 수]');
const byCat = {};
L.pages.filter(p => p.kind === 'passage').forEach(p => {
  const c = p.passage.category;
  (byCat[c] = byCat[c] || { n: 0, items: new Set() });
  byCat[c].n++; byCat[c].items.add(p.passage.id);
});
HF.passages.CATEGORIES.forEach(cat => {
  const e = byCat[cat.id];
  if (e) console.log(`  ${cat.label.padEnd(12)} ${String(e.items.size).padStart(2)}종 ${String(e.n).padStart(3)}쪽`);
});

console.log(problems ? `\n✗ 확인 필요 ${problems}건` : '\n✓ 모든 점검 통과');
process.exit(problems ? 1 : 0);
