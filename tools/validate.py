#!/usr/bin/env python3
"""생성된 .ttf 를 fontTools 로 다시 열어 검사한다.

    python tools/validate.py tools/selftest-out.ttf

표가 다 있는지, 체크섬이 맞는지, 글자→글리프 대응이 제대로 됐는지,
합성 글리프가 실제 윤곽선으로 풀리는지를 확인한다.
"""
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen

REQUIRED = {"head", "hhea", "maxp", "OS/2", "hmtx", "cmap", "loca", "glyf", "name", "post"}
SAMPLES = ["A", "a", "0", "?", "가", "힣", "글", "쌍", "웧", "ㄱ", "ㅢ"]


def main(path):
    problems = []
    font = TTFont(path, checkChecksums=2)   # 2 = 틀리면 예외

    missing = REQUIRED - set(font.keys())
    if missing:
        problems.append("빠진 표: " + ", ".join(sorted(missing)))

    head, hhea, maxp, os2 = font["head"], font["hhea"], font["maxp"], font["OS/2"]
    print(f"unitsPerEm      : {head.unitsPerEm}")
    print(f"글리프 수       : {maxp.numGlyphs}")
    print(f"ascent/descent  : {hhea.ascent} / {hhea.descent}")
    print(f"이름            : {font['name'].getDebugName(1)} / {font['name'].getDebugName(4)}")
    print(f"PostScript 이름 : {font['name'].getDebugName(6)}")
    ko = [r for r in font["name"].names if r.langID == 0x412]
    print(f"한국어 이름     : {ko[0].toUnicode() if ko else '(없음)'}")

    cmap = font.getBestCmap()
    print(f"cmap 대응 글자  : {len(cmap)}")
    if maxp.numGlyphs != len(font.getGlyphOrder()):
        problems.append("numGlyphs 와 실제 글리프 수가 다릅니다")

    glyf = font["glyf"]
    gs = font.getGlyphSet()
    simple = composite = empty = 0
    for name in font.getGlyphOrder():
        g = glyf[name]
        if g.numberOfContours == 0:
            empty += 1
        elif g.numberOfContours > 0:
            simple += 1
        else:
            composite += 1
    print(f"단순/합성/빈    : {simple} / {composite} / {empty}")

    # 표본 글자가 실제 윤곽선을 갖는지 (합성 글리프가 잘 풀리는지 확인)
    print("\n표본 검사")
    for ch in SAMPLES:
        cp = ord(ch)
        if cp not in cmap:
            problems.append(f"'{ch}' (U+{cp:04X}) 가 cmap 에 없습니다")
            print(f"  {ch}  ✗ cmap 없음")
            continue
        name = cmap[cp]
        pen = BoundsPen(gs)
        gs[name].draw(pen)
        adv = font["hmtx"][name][0]
        if pen.bounds is None:
            problems.append(f"'{ch}' 의 윤곽선이 비어 있습니다")
            print(f"  {ch}  ✗ 윤곽선 없음")
        else:
            x0, y0, x1, y1 = (round(v) for v in pen.bounds)
            print(f"  {ch}  ✓ bbox=({x0},{y0})-({x1},{y1})  advance={adv}")

    # 합성 글리프가 존재하지 않는 글리프를 참조하지 않는지
    order = set(font.getGlyphOrder())
    for name in font.getGlyphOrder():
        g = glyf[name]
        if g.numberOfContours >= 0:
            continue
        for c in g.components:
            if c.glyphName not in order:
                problems.append(f"{name} 이 없는 글리프 {c.glyphName} 를 참조합니다")

    print()
    if problems:
        print("문제 " + str(len(problems)) + "건")
        for p in problems:
            print("  ✗ " + p)
        return 1
    print("✓ 이상 없음")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "tools/selftest-out.ttf"))
