#!/usr/bin/env python3
"""Generate true 4-frame transparent walk/run sprite sheets for all 9 moving
characters in Temu3 Kingdom via magpie-image (referenced directly against each
existing canonical sprite to preserve 100% visual identity).

Each sheet is generated as a 2x2 grid on true transparent alpha, split via
alpha-projection valley detection, foot-baseline + torso-COM normalized onto
four 256x256 cells, verified by strict automated quality gates, and packed into
a 1024x256 horizontal WebP strip at game/public/assets/<key>-walk.webp.
"""

from __future__ import annotations

import concurrent.futures
import math
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

GAME_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = GAME_DIR / "raw-assets" / "walk-sheets"
ASSETS_DIR = GAME_DIR / "public" / "assets"

CELL_SIZE = 256
FOOT_MARGIN = 10  # pixels from bottom of 256px cell
TARGET_H = 212    # consistent character height inside 256px cell

SHEET_RULES = (
    "2D game animation sprite sheet arranged in an exact, clean 2x2 grid (2 columns, 2 rows, 4 equal quadrants) "
    "on a 100% completely empty transparent alpha background. "
    "STRICT GRID RULES: NO grid lines, NO borders, NO frames, NO boxes, NO numbers, NO arrows, NO text, "
    "NO ground shadows, NO grass, NO floor, NO dust clouds, NO background scenery. "
    "Leave generous empty transparent space between the 4 poses so limbs and props NEVER touch neighboring quadrants. "
    "CRITICAL CONSISTENCY: Keep the EXACT same character design, proportions, face, outfit, colors, held prop, "
    "bold Kingdom Rush dark-ink outline thickness, and identical scale across all 4 frames. "
    "ALL 4 frames MUST face the EXACT same direction as the reference image. "
    "ANIMATION CYCLE (reading order top-left -> top-right -> bottom-left -> bottom-right): "
    "Frame 1 (top-left): Right foot forward stride contact, left leg trailing back, torso leaning briskly forward. "
    "Frame 2 (top-right): Passing/lift pose, legs crossing under hips, one knee raised high, body lifted slightly higher. "
    "Frame 3 (bottom-left): Opposite left foot forward stride contact, right leg trailing back, arms/prop swung to opposite side. "
    "Frame 4 (bottom-right): Opposite passing/lift pose, other knee raised high, preparing to step back into Frame 1."
)

UNITS: list[dict] = [
    {
        "key": "hero-rage",
        "dir": "LEFT",
        "action": (
            "Energetic fierce cartoon sprint running to the LEFT, matching the exact messy dark wavy hair, "
            "black zip hoodie with white drawstrings, black cargo pants, black-and-white sneakers, shouting angry face, "
            "and bright red megaphone held forward in his right hand from the reference image. "
            "Left fist pumping energetically, cargo-pant legs clearly taking wide alternating running strides."
        ),
    },
    {
        "key": "hero-vip",
        "dir": "RIGHT",
        "action": (
            "Eager obsequious cartoon hustle-jogging to the RIGHT while bowing politely forward, matching the exact "
            "messy dark wavy hair, black zip hoodie with white drawstrings, starry-eyed flattering wide smile, and welcoming open hands "
            "from the reference image. Legs clearly pumping in quick polite tip-toeing escort steps."
        ),
    },
    {
        "key": "guard-fan",
        "dir": "LEFT",
        "action": (
            "Lively chibi foot-soldier patrol running to the LEFT, matching the exact purple-black hoodie with megaphone print, "
            "striped purple scarf fluttering behind, backwards cap, blue glowing foam baton, round red stop-sign shield, and chunky boots "
            "from the reference image. Boots clearly alternating in crisp bouncy running strides."
        ),
    },
    {
        "key": "vip-exec",
        "dir": "RIGHT",
        "action": (
            "Confident smug Silicon Valley executive power-walking to the RIGHT, matching the exact tailored dark navy suit, "
            "golden tie, gold pocket square, reflective golden sunglasses, slicked brown hair, takeaway coffee cup held forward, "
            "and gleaming golden briefcase swinging in the back hand from the reference image. "
            "Dress shoes and suit legs clearly alternating in smooth swaggering strides."
        ),
    },
    {
        "key": "enemy-dev",
        "dir": "RIGHT",
        "action": (
            "Friendly indie developer walking briskly to the RIGHT, matching the exact teal hoodie with white drawstrings, "
            "round glasses, brown messy hair, brown backpack with laptop, wooden picket sign showing ONLY the simple green beetle icon (zero text), "
            "and teal-white sneakers from the reference image. Legs and sneakers clearly taking lively alternating walking strides."
        ),
    },
    {
        "key": "enemy-fork",
        "dir": "RIGHT",
        "action": (
            "Super energetic fast cartoon sprinting to the RIGHT, matching the exact bright sky-blue zip windbreaker with white sleeve stripes, "
            "square glasses, joyful laughing face, gray backpack with scroll, headphones around neck, hugging the glowing cyan gift box with white ribbon, "
            "and blue-white sneakers from the reference image. Legs taking wide bouncy high-knee sprinting strides."
        ),
    },
    {
        "key": "enemy-auditor",
        "dir": "RIGHT",
        "action": (
            "Sturdy heavy-armored knight marching purposefully to the RIGHT, matching the exact silver steel plate armor, "
            "red-plumed open helmet, golden blonde hair and beard, red cape, thick steel shield with golden </> emblem, "
            "and giant brass magnifying glass from the reference image. Armored greaves and boots clearly marching in heavy alternating steps."
        ),
    },
    {
        "key": "enemy-veteran",
        "dir": "RIGHT",
        "action": (
            "Wise battle-hardened open-source paladin-wizard striding to the RIGHT, matching the exact dark green hooded cloak, "
            "flowing white beard, gold-trimmed emerald cross pauldron, cream tunic, leather belt pouch, brown boots, and glowing emerald crystal staff "
            "from the reference image. Boots clearly striding forward alternately while the emerald cloak billows."
        ),
    },
    {
        "key": "enemy-gdpr",
        "dir": "RIGHT",
        "action": (
            "Mighty imposing chibi European regulatory paladin BOSS stomping powerfully to the RIGHT, matching the exact "
            "ornate royal-blue and polished gold armor, plumed helmet with floating halo of tiny golden stars, white mustache/beard, "
            "wax-sealed parchment scroll, EU-starred blue cape, and massive golden scales gavel from the reference image. "
            "Heavy armored boots clearly taking thunderous alternating marching stomps."
        ),
    },
]


def find_split_seam(alpha_band, start: int, end: int) -> int:
    """Find the lowest-alpha row/col index near the middle of an image."""
    best_idx = (start + end) // 2
    best_score = float("inf")
    mid = (start + end) / 2.0
    for idx in range(start, end):
        # Slight center preference breaks ties cleanly
        score = alpha_band[idx] + abs(idx - mid) * 0.05
        if score < best_score:
            best_score = score
            best_idx = idx
    return best_idx


def alpha_bbox(im: Image.Image, thresh: int = 20) -> tuple[int, int, int, int] | None:
    a = im.getchannel("A")
    mask = a.point(lambda v: 255 if v > thresh else 0)
    return mask.getbbox()


def torso_center_x(cropped: Image.Image) -> float:
    """Compute horizontal center-of-mass of the upper 65% of opaque pixels so
    swinging feet/briefcases never cause horizontal head jitter between frames."""
    w, h = cropped.size
    upper_h = max(1, int(h * 0.65))
    a = cropped.getchannel("A").crop((0, 0, w, upper_h))
    px = a.load()
    total = 0.0
    wx = 0.0
    for y in range(upper_h):
        for x in range(w):
            v = px[x, y]
            if v > 25:
                total += v
                wx += x * v
    if total <= 0:
        return w / 2.0
    return wx / total


def frame_diff(a: Image.Image, b: Image.Image) -> float:
    """Normalized mean absolute RGBA diff between two equal-sized frames (0..1)."""
    pa = a.tobytes()
    pb = b.tobytes()
    if len(pa) != len(pb) or not pa:
        return 0.0
    # Sample every 16th byte for speed
    step = 16
    s = 0
    cnt = 0
    for i in range(0, len(pa), step):
        s += abs(pa[i] - pb[i])
        cnt += 1
    return s / (cnt * 255.0)


def slice_and_pack(raw_path: Path, out_path: Path, ref_path: Path) -> tuple[bool, str]:
    im = Image.open(raw_path).convert("RGBA")
    w, h = im.size

    # 1. Verify corners are transparent
    corners = [
        im.getpixel((4, 4))[3],
        im.getpixel((w - 5, 4))[3],
        im.getpixel((4, h - 5))[3],
        im.getpixel((w - 5, h - 5))[3],
    ]
    if max(corners) > 25:
        return False, f"opaque corners: {corners}"

    # 2. Compute alpha projections to find clean vertical & horizontal gutters near center
    a_chan = im.getchannel("A")
    px = a_chan.load()
    col_sums = [0] * w
    row_sums = [0] * h
    for y in range(h):
        rs = 0
        for x in range(w):
            v = px[x, y]
            if v > 20:
                col_sums[x] += v
                rs += v
        row_sums[y] = rs

    sx = find_split_seam(col_sums, int(w * 0.42), int(w * 0.58))
    sy = find_split_seam(row_sums, int(h * 0.42), int(h * 0.58))

    quads = [
        im.crop((0, 0, sx, sy)),      # Frame 0: Contact-L
        im.crop((sx, 0, w, sy)),      # Frame 1: Passing-1
        im.crop((0, sy, sx, h)),      # Frame 2: Contact-R
        im.crop((sx, sy, w, h)),      # Frame 3: Passing-2
    ]

    crops: list[Image.Image] = []
    heights: list[int] = []
    for idx, q in enumerate(quads):
        bb = alpha_bbox(q, thresh=20)
        if not bb:
            return False, f"frame {idx} is empty"
        bw = bb[2] - bb[0]
        bh = bb[3] - bb[1]
        if bw < 60 or bh < 60:
            return False, f"frame {idx} too small: {bw}x{bh}"
        crop = q.crop(bb)
        crops.append(crop)
        heights.append(bh)

    # 3. Consistency check across the 4 extracted crops
    if max(heights) / max(1, min(heights)) > 1.38:
        return False, f"inconsistent heights across frames: {heights}"

    # Normalize scale by median height so subtle vertical bounce stays natural
    sorted_h = sorted(heights)
    med_h = (sorted_h[1] + sorted_h[2]) / 2.0
    # Ensure widest frame fits cleanly inside CELL_SIZE - 16
    max_w_ratio = max(c.size[0] / med_h for c in crops)
    scale = min(TARGET_H / med_h, (CELL_SIZE - 16) / max(1.0, med_h * max_w_ratio))

    # Measure reference aspect ratio as sanity check
    ref_im = Image.open(ref_path).convert("RGBA")
    ref_aspect = ref_im.size[0] / max(1, ref_im.size[1])

    norm_frames: list[Image.Image] = []
    strip = Image.new("RGBA", (CELL_SIZE * 4, CELL_SIZE), (0, 0, 0, 0))
    for idx, crop in enumerate(crops):
        nw = max(1, int(round(crop.size[0] * scale)))
        nh = max(1, int(round(crop.size[1] * scale)))
        if nw > CELL_SIZE - 8:
            shrink = (CELL_SIZE - 8) / nw
            nw = int(round(nw * shrink))
            nh = int(round(nh * shrink))
        if nh > CELL_SIZE - FOOT_MARGIN - 4:
            shrink = (CELL_SIZE - FOOT_MARGIN - 4) / nh
            nw = int(round(nw * shrink))
            nh = int(round(nh * shrink))

        resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
        # Anchor horizontally by upper-torso center-of-mass, vertically by foot baseline
        cx = torso_center_x(resized)
        paste_x = int(round(CELL_SIZE / 2.0 - cx))
        paste_x = max(4, min(CELL_SIZE - nw - 4, paste_x))
        # Subtle natural 3px lift on passing frames (idx 1 & 3)
        passing_lift = 3 if idx in (1, 3) else 0
        paste_y = CELL_SIZE - FOOT_MARGIN - nh - passing_lift
        paste_y = max(2, min(CELL_SIZE - nh - 2, paste_y))

        cell = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
        cell.alpha_composite(resized, (paste_x, paste_y))
        norm_frames.append(cell)
        strip.alpha_composite(cell, (idx * CELL_SIZE, 0))

    # 4. Verify frames actually animate (opposite stride frames 0 vs 2 must differ)
    d02 = frame_diff(norm_frames[0], norm_frames[2])
    d01 = frame_diff(norm_frames[0], norm_frames[1])
    if d02 < 0.012 and d01 < 0.012:
        return False, f"frames look static (d01={d01:.4f}, d02={d02:.4f})"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    strip.save(out_path, "WEBP", quality=90, method=6)
    kb = out_path.stat().st_size / 1024.0
    return True, f"ok ({kb:.1f} KB, seam={sx},{sy}, heights={heights}, diff02={d02:.3f}, refAR={ref_aspect:.2f})"


def generate_one(unit: dict, force: bool = False) -> tuple[str, bool, str]:
    key = unit["key"]
    ref_path = ASSETS_DIR / f"{key}.webp"
    raw_path = RAW_DIR / f"{key}-sheet.png"
    out_path = ASSETS_DIR / f"{key}-walk.webp"

    if out_path.is_file() and not force:
        return key, True, "cached"

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    prompt = (
        f"{SHEET_RULES} "
        f"DIRECTION: ALL 4 frames face strictly to the {unit['dir']}. "
        f"CHARACTER & MOTION: {unit['action']}"
    )

    last_err = "unknown"
    for attempt in range(1, 4):
        if raw_path.exists():
            raw_path.unlink()
        cmd = [
            "magpie-image",
            "draw",
            prompt,
            "-r",
            str(ref_path),
            "--bg",
            "transparent",
            "--quality",
            "high",
            "--complexity",
            "high",
            "--size",
            "1024x1024",
            "-o",
            str(raw_path),
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=240)
            if proc.returncode != 0 or not raw_path.is_file():
                last_err = f"attempt {attempt}: magpie-image rc={proc.returncode} stderr={proc.stderr.strip()[:160]}"
                time.sleep(2 * attempt)
                continue
            ok, msg = slice_and_pack(raw_path, out_path, ref_path)
            if ok:
                return key, True, f"attempt {attempt}: {msg}"
            last_err = f"attempt {attempt} gate failed: {msg}"
            time.sleep(2)
        except Exception as exc:
            last_err = f"attempt {attempt} exc: {exc}"
            time.sleep(2 * attempt)

    return key, False, last_err


def main() -> int:
    force = "--force" in sys.argv
    only = [a for a in sys.argv[1:] if not a.startswith("-")]
    targets = [u for u in UNITS if not only or u["key"] in only]
    print(f"Generating {len(targets)} 4-frame walk sprite sheets (max_workers=2)...", flush=True)

    failures: list[tuple[str, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futs = {pool.submit(generate_one, u, force): u["key"] for u in targets}
        for fut in concurrent.futures.as_completed(futs):
            key, ok, info = fut.result()
            status = "PASS" if ok else "FAIL"
            print(f"  [{status}] {key}: {info}", flush=True)
            if not ok:
                failures.append((key, info))

    print(f"Done: {len(targets) - len(failures)}/{len(targets)} succeeded.", flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
