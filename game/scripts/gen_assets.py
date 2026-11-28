#!/usr/bin/env python3
"""Generate unified 2D Kingdom Rush-style hand-painted assets via magpie-image,
verify true transparent alpha corners, tight-trim margins, resize, and export WebP."""

from __future__ import annotations

import concurrent.futures
import subprocess
import sys
import time
from pathlib import Path

from PIL import Image

GAME_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = GAME_DIR.parent
RAW_DIR = GAME_DIR / "raw-assets"
OUT_DIR = GAME_DIR / "public" / "assets"
THEO_REF = REPO_ROOT / "memes" / "refs" / "theo-avatar.jpg"

TRANSPARENT_RULES = (
    "Isolated single 2D game sprite on a 100% completely empty transparent alpha background — "
    "ZERO grass, ZERO ground, ZERO dirt patch, ZERO bushes, ZERO floor, ZERO background scenery, "
    "ZERO backdrop colors, ZERO checkerboard pattern, ZERO drop shadow extending outside the silhouette. "
    "Clean crisp bold dark-ink outer outline enclosing the entire sprite, zero text, zero letters, zero watermark."
)

STYLE = (
    "2D hand-painted cartoon game sprite in classic Kingdom Rush tower defense style, "
    "bold clean dark ink outlines, vibrant warm cel-shaded colors, crisp readable silhouette, "
    "centered cleanly inside the 1024x1024 frame with generous transparent padding around all edges. "
    + TRANSPARENT_RULES
)

ASSETS: list[dict] = [
    {
        "name": "map-meadow",
        "bg": "opaque",
        "size": "1536x1024",
        "max_dim": (1280, 720),
        "crop_cover": True,
        "prompt": (
            "2D hand-painted top-down Kingdom Rush style game battleground meadow background. "
            "Large wide open lush sunlit green grassy field across the entire center and middle area "
            "(completely open flat green lawn with subtle grass blades and tiny clover patches, NO roads, NO paths, NO buildings in the middle). "
            "Framed decoratively around the outer top edge, bottom edge, and corners with cute cartoon pine trees, mossy rounded boulders, "
            "colorful wildflowers, wooden fences, and a tiny sparkling blue brook tucked in the top-left corner. "
            "Warm cheerful daylight, bold hand-drawn ink illustration outlines, cohesive cartoon palette, zero text."
        ),
    },
    {
        "name": "castle-t3",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (420, 420),
        "prompt": (
            f"{STYLE} A stylized Silicon Valley satirical fantasy fortress castle facing left, "
            "sleek dark obsidian-gray and ivory stone keep with glowing cyan server-rack windows, "
            "wooden fortress double-gates on the left side, golden star banners, a cute tiny white unicorn statue on a turret, "
            "and a clean flat stone battlement roof on top. Floating cleanly with NO grass or dirt base."
        ),
    },
    {
        "name": "tower-barracks",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (280, 280),
        "prompt": (
            f"{STYLE} A compact charming Kingdom Rush guard barracks building with dark purple shingled roof, "
            "sturdy stone walls, wooden arched doorway with warm torches, and a waving purple banner flag on top. "
            "Cleanly cut at the stone foundation base with NO grass, NO bushes, and NO dirt patch."
        ),
    },
    {
        "name": "tower-archer",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (280, 280),
        "prompt": (
            f"{STYLE} A tall wooden-and-stone cartoon broadcast watchtower topped with a glowing sky-blue radar dish "
            "and a chunky bright red megaphone speaker turret on the parapet. "
            "Cleanly cut at the stone base with NO grass, NO bushes, and NO ground."
        ),
    },
    {
        "name": "tower-mage",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (280, 280),
        "prompt": (
            f"{STYLE} A whimsical dark-stone wizard spire tower crowned by a levitating glowing neon-violet crystal orb "
            "surrounded by thin orbiting magenta energy rings. "
            "Cleanly cut at the stone base with NO grass and NO ground."
        ),
    },
    {
        "name": "tower-artillery",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (280, 280),
        "prompt": (
            f"{STYLE} A chunky dwarf-style stone bastion fort mounting a huge brass-and-crimson cartoon mortar cannon "
            "angled upward, with a neat stack of iron cannonballs right beside it on the stone platform. "
            "Cleanly cut at the stone base with NO grass and NO ground."
        ),
    },
    {
        "name": "hero-rage",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (240, 240),
        "ref": str(THEO_REF) if THEO_REF.is_file() else None,
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon hero character inspired by the voluminous messy dark wavy hair and black hoodie "
            "of the reference person (NO cigarette, clean mouth). Oversized expressive chibi head, hilarious fired-up shouting face with furrowed brows, "
            "holding a bright red megaphone forward to the left, dynamic action stance facing left, full shoes visible."
        ),
    },
    {
        "name": "hero-vip",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (240, 240),
        "ref": str(THEO_REF) if THEO_REF.is_file() else None,
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon hero character matching the exact same voluminous messy dark wavy hair and black hoodie "
            "of the reference person (NO cigarette). Oversized expressive chibi head, super polite bowing posture with a massive sweet starry-eyed flattering smile, "
            "welcoming open hands, facing right, full shoes visible."
        ),
    },
    {
        "name": "guard-fan",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (180, 180),
        "prompt": (
            f"{STYLE} Full-body tiny cute chibi cartoon loyal fan foot-soldier facing left, "
            "wearing a dark purple-black hoodie and backwards cap, holding a round red stop-sign shield and a blue foam baton, full boots visible."
        ),
    },
    {
        "name": "vip-exec",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (220, 220),
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon wealthy Silicon Valley big-tech VIP executive walking right, "
            "wearing a sharp tailored navy suit with golden tie, reflective gold sunglasses, holding a coffee cup "
            "and a gleaming golden briefcase, smug relaxed grin, full shoes visible."
        ),
    },
    {
        "name": "enemy-dev",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (200, 200),
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon friendly indie programmer walking right, "
            "wearing a teal casual hoodie, round glasses, and backpack, holding up a small wooden sign showing only a simple cute green beetle icon (zero text), full sneakers visible."
        ),
    },
    {
        "name": "enemy-fork",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (200, 200),
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon energetic indie developer sprinting to the right, "
            "wearing a bright sky-blue windbreaker jacket and sneakers, happily hugging a glowing cyan gift box tied with a white ribbon, dynamic running pose."
        ),
    },
    {
        "name": "enemy-auditor",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (220, 220),
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon heavy-armored code auditor knight marching right, "
            "wearing chunky silver steel plate armor and open knight helmet, wielding a giant shiny brass magnifying glass "
            "and a thick riveted steel shield, full armored boots visible."
        ),
    },
    {
        "name": "enemy-veteran",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (220, 220),
        "prompt": (
            f"{STYLE} Full-body cute chibi cartoon wise tough open-source wizard-paladin veteran marching right, "
            "long flowing white-gray beard, dark hooded emerald-trimmed cloak, wielding a glowing emerald-green crystal staff, full boots visible."
        ),
    },
    {
        "name": "enemy-gdpr",
        "bg": "transparent",
        "size": "1024x1024",
        "max_dim": (320, 320),
        "prompt": (
            f"{STYLE} Full-body imposing cute-but-mighty chibi cartoon BOSS giant armored European regulatory paladin marching right, "
            "massive ornate royal-blue and polished gold plate armor, floating halo of tiny golden stars behind his plumed helmet, "
            "wielding a gigantic golden judge gavel and a thick sealed parchment scroll, full armored boots visible."
        ),
    },
]


def has_transparent_corners(img: Image.Image) -> bool:
    if img.mode != "RGBA":
        return False
    w, h = img.size
    corners = [
        img.getpixel((0, 0))[3],
        img.getpixel((w - 1, 0))[3],
        img.getpixel((0, h - 1))[3],
        img.getpixel((w - 1, h - 1))[3],
    ]
    return all(a < 15 for a in corners)


def process_image(raw_path: Path, out_path: Path, item: dict) -> tuple[bool, str]:
    img = Image.open(raw_path).convert("RGBA")
    if item.get("crop_cover"):
        tw, th = item["max_dim"]
        w, h = img.size
        target_ratio = tw / th
        cur_ratio = w / h
        if cur_ratio > target_ratio:
            nw = int(h * target_ratio)
            left = (w - nw) // 2
            img = img.crop((left, 0, left + nw, h))
        else:
            nh = int(w / target_ratio)
            top = (h - nh) // 2
            img = img.crop((0, top, w, top + nh))
        img = img.resize((tw, th), Image.Resampling.LANCZOS)
        img.convert("RGB").save(out_path, "WEBP", quality=86, method=6)
        return True, "opaque"

    ok_alpha = has_transparent_corners(img)
    alpha = img.getchannel("A")
    bbox = alpha.point(lambda a: 255 if a > 12 else 0).getbbox()
    if bbox:
        pad = 6
        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(img.width, bbox[2] + pad)
        y1 = min(img.height, bbox[3] + pad)
        img = img.crop((x0, y0, x1, y1))
    img.thumbnail(item["max_dim"], Image.Resampling.LANCZOS)
    img.save(out_path, "WEBP", quality=88, method=6)
    return ok_alpha, "rgba" if ok_alpha else "NO-ALPHA!"


def build_one(item: dict) -> str:
    name = item["name"]
    raw_path = RAW_DIR / f"{name}.png"
    out_path = OUT_DIR / f"{name}.webp"

    if out_path.is_file() and out_path.stat().st_size > 2048:
        if item["bg"] == "opaque":
            return f"SKIP {name} (opaque ok)"
        im = Image.open(out_path)
        if has_transparent_corners(im.convert("RGBA")):
            return f"SKIP {name} (rgba ok)"

    cmd = [
        "magpie-image",
        "draw",
        item["prompt"],
        "--bg",
        item["bg"],
        "--quality",
        "high",
        "--size",
        item["size"],
        "-o",
        str(raw_path),
    ]
    if item.get("ref"):
        cmd.extend(["-r", item["ref"]])

    last_err = ""
    for attempt in range(3):
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0 and raw_path.is_file():
            break
        last_err = res.stderr.strip() or res.stdout.strip()
        if attempt < 2:
            time.sleep(3.0 * (attempt + 1))
    else:
        raise RuntimeError(f"Failed {name}: {last_err}")

    ok_alpha, tag = process_image(raw_path, out_path, item)
    kb = out_path.stat().st_size / 1024
    return f"OK   {name} -> {out_path.name} ({kb:.1f} KB, {tag})"


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    errors: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futs = {pool.submit(build_one, item): item["name"] for item in ASSETS}
        for fut in concurrent.futures.as_completed(futs):
            name = futs[fut]
            try:
                print(fut.result(), flush=True)
            except Exception as exc:
                msg = f"ERR  {name}: {exc}"
                print(msg, file=sys.stderr, flush=True)
                errors.append(msg)

    if errors:
        print(f"\nCompleted with {len(errors)} errors.", file=sys.stderr)
        return 1
    print(f"\nAll {len(ASSETS)} assets generated & verified in {OUT_DIR}!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
