#!/usr/bin/env python3
"""칸마다 '가짜 손글씨'를 그려 이진 마스크 묶음으로 저장한다.

    node tools/dumpcells.js full > tools/cells.json
    python tools/rendercells.py tools/cells.json tools/cells.bin

실제 손글씨 대신 시스템 글꼴을 쓴다. 획 따기·조합·폰트 쓰기 단계의
품질을 눈으로 확인하는 것이 목적이다.
"""
import json
import struct
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgun.ttf",
    r"C:\Windows\Fonts\HMKMRHD.TTF",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
]


def pick_font():
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            return p
    raise SystemExit("한글 글꼴을 찾지 못했습니다. FONT_CANDIDATES 에 경로를 추가하세요.")


FONT_PATH = pick_font()
_cache = {}


def font(size):
    if size not in _cache:
        _cache[size] = ImageFont.truetype(FONT_PATH, size)
    return _cache[size]


def ink_image(text, size):
    """글자를 그려서 잉크 부분만 잘라낸 이미지를 돌려준다.

    PIL 의 textbbox 는 좌우 여백까지 포함한 '자리 폭' 을 주기 때문에
    낱자(ㄱ ㅏ)에서는 실제 획보다 훨씬 넓게 나온다. 브라우저 쪽
    actualBoundingBox 와 맞추려면 그려 놓고 직접 잘라야 한다.
    """
    f = font(size)
    pad = size // 2
    tmp = Image.new("L", (size * 3, size * 3), 0)
    ImageDraw.Draw(tmp).text((pad, pad), text, font=f, fill=255)
    box = tmp.getbbox()
    return tmp.crop(box) if box else None


MAX_ANISO = 2.2   # src/hangul.js 의 값과 같아야 한다


def fit_scale(ink_w, ink_h, box_w, box_h, kind):
    sx_full = box_w / max(1e-6, ink_w)
    sy_full = box_h / max(1e-6, ink_h)
    if kind == "jung":
        u = min(sx_full, sy_full)
        return u, u
    return min(sx_full, sy_full * MAX_ANISO), min(sy_full, sx_full * MAX_ANISO)


def render_fit(cell):
    """자모: 안내 상자 안에 넣는다 (template.js 의 fitText 와 같은 규칙)."""
    w, h = cell["w"], cell["h"]
    gx, gy, gw, gh = cell["guide"]
    pad = 0.04
    bx = (gx + gw * pad) * w
    by = (gy + gh * pad) * h
    bw = gw * (1 - 2 * pad) * w
    bh = gh * (1 - 2 * pad) * h

    glyph = ink_image(cell["hint"], 240)
    out = Image.new("L", (w, h), 0)
    if glyph is None:
        return out
    iw, ih = glyph.size
    sx, sy = fit_scale(iw, ih, bw, bh, cell["kind"])
    tw, th = max(1, round(iw * sx)), max(1, round(ih * sy))
    glyph = glyph.resize((tw, th), Image.LANCZOS)
    out.paste(glyph, (round(bx + (bw - tw) / 2), round(by + (bh - th) / 2)))
    return out


def render_baseline(cell):
    """라틴: 베이스라인 위에 자연스러운 크기로 놓는다."""
    w, h = cell["w"], cell["h"]
    # template.js 의 LATIN_HINT_RATIO(칸 높이 기준) 를 필기 영역 높이 기준으로 환산
    size = int(h * cell["latinHintRatio"])
    f = font(size)
    out = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(out)
    asc, _ = f.getmetrics()
    left, _, right, _ = d.textbbox((0, 0), cell["hint"], font=f)
    x = (w - (right - left)) / 2 - left
    d.text((x, cell["baselineLocal"] - asc), cell["hint"], font=f, fill=255)
    return out


def main(spec_path, out_path):
    spec = json.loads(Path(spec_path).read_text(encoding="utf-8"))
    chunks = []
    for cell in spec["cells"]:
        img = render_fit(cell) if cell["guide"] else render_baseline(cell)
        mask = bytes(1 if p > 110 else 0 for p in img.tobytes())
        key = cell["key"].encode("utf-8")
        chunks.append(struct.pack("<H", len(key)) + key +
                      struct.pack("<HH", cell["w"], cell["h"]) + mask)
    Path(out_path).write_bytes(struct.pack("<I", len(chunks)) + b"".join(chunks))
    print(f"글꼴 {FONT_PATH}")
    print(f"칸 {len(chunks)}개 → {out_path} ({Path(out_path).stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
