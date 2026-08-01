#!/usr/bin/env python3
"""필기가 '주석'(Ink annotation)으로 들어 있는 PDF 를 만든다.

    python tools/mkinkpdf.py 입력.pdf 출력.pdf

아이패드의 마크업·굿노트 등은 필기를 페이지 내용에 굽지 않고 /Ink 주석으로
얹어 두는 경우가 있다. 그런 PDF 에서도 필기가 제대로 읽히는지 확인하기 위한
시험용 파일 생성기다.
"""
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, DictionaryObject, FloatObject, NameObject,
                           NumberObject, DecodedStreamObject)

# layout.js 기준(A4 150DPI = 1240x1754px)의 칸 격자를 PDF 좌표(pt)로 옮긴다
PAGE_W, PAGE_H = 1240.0, 1754.0
PT_W, PT_H = 595.276, 841.890
GRID_TOP, GRID_BOTTOM, GRID_LEFT, GRID_RIGHT = 270, 1600, 150, 1090
COLS, ROWS, GAP = 6, 8, 16


def cells():
    cw = (GRID_RIGHT - GRID_LEFT - GAP * (COLS - 1)) // COLS
    ch = (GRID_BOTTOM - GRID_TOP - GAP * (ROWS - 1)) // ROWS
    for r in range(ROWS):
        for c in range(COLS):
            yield (GRID_LEFT + c * (cw + GAP), GRID_TOP + r * (ch + GAP), cw, ch)


def to_pt(x, y):
    """픽셀 좌표(y 아래로) → PDF 좌표(y 위로)"""
    return x / PAGE_W * PT_W, PT_H - y / PAGE_H * PT_H


def stroke_points(x, y, w, h, seed):
    """칸 안을 지그재그로 채우는 획 하나"""
    pts = []
    n = 5
    for i in range(n):
        t = i / (n - 1)
        px = x + w * (0.22 + 0.56 * (t if i % 2 == 0 else 1 - t))
        py = y + h * (0.22 + 0.56 * t)
        pts.append(to_pt(px + (seed % 7), py))
    return pts


def make_ink(pts, rect_pt, width=6.0):
    """/AP 모양 스트림까지 갖춘 /Ink 주석 하나"""
    x0 = min(p[0] for p in pts) - width * 2
    x1 = max(p[0] for p in pts) + width * 2
    y0 = min(p[1] for p in pts) - width * 2
    y1 = max(p[1] for p in pts) + width * 2

    ops = [f"{width} w 1 J 1 j 0 0 0 RG"]
    ops.append(f"{pts[0][0]:.2f} {pts[0][1]:.2f} m")
    for p in pts[1:]:
        ops.append(f"{p[0]:.2f} {p[1]:.2f} l")
    ops.append("S")
    content = "\n".join(ops).encode()

    ap = DecodedStreamObject()
    ap.set_data(content)
    ap[NameObject("/Type")] = NameObject("/XObject")
    ap[NameObject("/Subtype")] = NameObject("/Form")
    ap[NameObject("/FormType")] = NumberObject(1)
    ap[NameObject("/BBox")] = ArrayObject([FloatObject(v) for v in (x0, y0, x1, y1)])
    ap[NameObject("/Resources")] = DictionaryObject()

    ink = DictionaryObject()
    ink[NameObject("/Type")] = NameObject("/Annot")
    ink[NameObject("/Subtype")] = NameObject("/Ink")
    ink[NameObject("/Rect")] = ArrayObject([FloatObject(v) for v in (x0, y0, x1, y1)])
    ink[NameObject("/F")] = NumberObject(4)          # Print
    ink[NameObject("/C")] = ArrayObject([FloatObject(0), FloatObject(0), FloatObject(0)])
    ink[NameObject("/BS")] = DictionaryObject()
    ink[NameObject("/BS")][NameObject("/W")] = FloatObject(width)
    ink[NameObject("/InkList")] = ArrayObject(
        [ArrayObject([FloatObject(v) for p in pts for v in p])])
    ap_dict = DictionaryObject()
    ap_dict[NameObject("/N")] = ap
    ink[NameObject("/AP")] = ap_dict
    return ink


def main(src, dst):
    reader = PdfReader(src)
    writer = PdfWriter()
    total = 0
    for pi, page in enumerate(reader.pages):
        writer.add_page(page)
        out_page = writer.pages[pi]
        annots = ArrayObject()
        for ci, (x, y, w, h) in enumerate(cells()):
            pts = stroke_points(x, y, w, h, ci + pi)
            ref = writer._add_object(make_ink(pts, None))
            annots.append(ref)
            total += 1
        out_page[NameObject("/Annots")] = annots
    with open(dst, "wb") as fh:
        writer.write(fh)
    print(f"{len(reader.pages)}쪽 · 필기 주석 {total}개 → {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
