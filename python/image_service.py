"""
image_service.py — Crop a region from a source PNG and paste it onto a template.

Usage:
    python image_service.py <source_image> <template_image> <x> <y> <width> <height> \
                            <paste_x> <paste_y> [output_dir]

Arguments:
    source_image   Path to the source PNG to crop from
    template_image Path to the template PNG to paste onto
    x              Crop box left edge (pixels)
    y              Crop box top edge (pixels)
    width          Crop box width (pixels)
    height         Crop box height (pixels)
    paste_x        X position on template where the crop is pasted
    paste_y        Y position on template where the crop is pasted
    output_dir     (optional) Folder to save result; defaults to ./output

Returns (stdout, one JSON line):
    {"file_name": "result_<uuid>.png", "file_path": "/absolute/path/to/file"}

On error (stderr + exit code 1):
    {"error": "<message>"}
"""

import sys
import json
import os
import uuid
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"error": "Pillow is not installed. Run: pip install Pillow"}))
    sys.exit(1)


def process(source_path: str, template_path: str,
            crop_x: int, crop_y: int, crop_w: int, crop_h: int,
            paste_x: int, paste_y: int,
            output_dir: str = "output") -> dict:

    # ── Validate inputs ──────────────────────────────────────────────────────
    for path, label in [(source_path, "source_image"), (template_path, "template_image")]:
        if not os.path.isfile(path):
            return {"error": f"{label} not found: {path}"}

    # ── Open images ──────────────────────────────────────────────────────────
    source   = Image.open(source_path).convert("RGBA")
    template = Image.open(template_path).convert("RGBA")

    # ── Crop ─────────────────────────────────────────────────────────────────
    crop_box = (crop_x, crop_y, crop_x + crop_w, crop_y + crop_h)
    src_w, src_h = source.size
    if crop_x < 0 or crop_y < 0 or crop_x + crop_w > src_w or crop_y + crop_h > src_h:
        return {"error": f"Crop box {crop_box} is outside source image bounds {source.size}"}

    cropped = source.crop(crop_box)

    # ── Paste ─────────────────────────────────────────────────────────────────
    result = template.copy()
    # Use the cropped image's alpha channel as a mask so transparency is preserved
    result.paste(cropped, (paste_x, paste_y), mask=cropped)

    # ── Save ──────────────────────────────────────────────────────────────────
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"result_{uuid.uuid4().hex[:8]}.png"
    file_path = (out_dir / file_name).resolve()

    result.save(str(file_path), format="PNG")

    return {"file_name": file_name, "file_path": str(file_path)}


def main():
    if len(sys.argv) < 9:
        print(json.dumps({
            "error": (
                "Usage: python image_service.py "
                "<source> <template> <x> <y> <width> <height> "
                "<paste_x> <paste_y> [output_dir]"
            )
        }))
        sys.exit(1)

    try:
        source_path   = sys.argv[1]
        template_path = sys.argv[2]
        crop_x        = int(sys.argv[3])
        crop_y        = int(sys.argv[4])
        crop_w        = int(sys.argv[5])
        crop_h        = int(sys.argv[6])
        paste_x       = int(sys.argv[7])
        paste_y       = int(sys.argv[8])
        output_dir    = sys.argv[9] if len(sys.argv) > 9 else "output"
    except ValueError as e:
        print(json.dumps({"error": f"Invalid argument: {e}"}))
        sys.exit(1)

    result = process(source_path, template_path,
                     crop_x, crop_y, crop_w, crop_h,
                     paste_x, paste_y, output_dir)

    if "error" in result:
        print(json.dumps(result), file=sys.stderr)
        sys.exit(1)

    print(json.dumps(result))


if __name__ == "__main__":
    main()
