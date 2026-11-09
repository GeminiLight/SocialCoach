"""Build the README demo GIF from frames recorded by screenshots.mjs --frames.

    node site/scripts/screenshots.mjs --base=http://localhost:3000 --lang=zh \
      --out=/tmp/sc-shots-zh --frames=/tmp/sc-frames-zh
    python3 site/scripts/demo-gif.py --frames=/tmp/sc-frames-zh --lang=zh \
      --out=docs/screenshots/demo-practice-zh.gif

Frames are `<index>-<phase>.jpg`. Each phase contributes either all of its frames
(typing) or its first / last frame (waiting, then the settled reply). Captions
describe what the recorded run shows, so reread them after every new recording.

Older recordings without the `end` / `reveal` / `better` phases can be re-tagged
with --retag=103-129:end,130-251:reveal and --better=<full-debrief.png>:<y-offset>.
Palette comes from globals.css through site/design-tokens.mjs.
"""
import argparse
import json
import os
import re
import subprocess
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CAPTIONS = {
    "zh": {
        "open": "下班前十分钟，经理来加活",
        "soft": "① 先含糊地答应一句",
        "softreply": "他顺势追问：几点能开始？",
        "clear": "② 再试一次：说清边界，给出方案",
        "clearreply": "他没有马上同意，还在追问细节",
        "reveal": "③ 结束后，看到对方没说的底牌",
        "debrief": "复盘先引用你的原话",
        "better": "再指出：哪一句被听成了「好」",
    },
    "en": {
        "open": "Ten minutes before you leave, the manager asks",
        "soft": "① A vague first answer",
        "softreply": "He takes it as a yes: when can you start?",
        "clear": "② Try again: a clear limit and a plan",
        "clearreply": "He accepts “not tonight”, then bargains",
        "reveal": "③ Afterwards, see what he kept to himself",
        "debrief": "The debrief starts from your own words",
        "better": "And shows which line sounded like “yes”",
    },
}
# (phase, which frames, seconds per frame, seconds to hold the last frame)
STORY = [
    ("open", "last", 0, 1.6),
    ("soft", "all", 0.2, 0.8),
    ("softreply", "ends", 0.5, 2.6),
    ("clear", "all", 0.16, 0.6),
    ("clearreply", "ends", 0.6, 3.0),
    ("reveal", "last", 0, 2.4),
    ("debrief", "last", 0, 3.0),
    ("better", "last", 0, 3.4),
]
WIDTH, BAR = 480, 68


def palette():
    js = ("import {hexToken} from './site/design-tokens.mjs';"
          "console.log(JSON.stringify(Object.fromEntries(['paper','ink','paper-deep','ink-3'].map(n=>[n,hexToken('--'+n)]))))")
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT))


def font(size):
    for path in ("/System/Library/Fonts/Hiragino Sans GB.ttc", "/System/Library/Fonts/STHeiti Medium.ttc",
                 "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--lang", default="zh", choices=["zh", "en"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--retag", default="", help="first-last:phase,... inclusive frame index ranges")
    ap.add_argument("--better", default="", help="full-page debrief png:y-offset, used when no better frames exist")
    a = ap.parse_args()

    retag = [(*map(int, r.split("-")), p) for r, p in (x.split(":") for x in a.retag.split(",") if x)]
    phases = {}
    for name in sorted(os.listdir(a.frames)):
        m = re.match(r"(\d+)-(\w+)\.jpg$", name)
        if not m:
            continue
        idx, phase = int(m.group(1)), m.group(2)
        for first, last, p in retag:
            if first <= idx <= last:
                phase = p
        phases.setdefault(phase, []).append(os.path.join(a.frames, name))

    def load(path, crop_y=None):
        im = Image.open(path).convert("RGB")
        if crop_y is not None:
            im = im.crop((0, crop_y, im.width, crop_y + round(im.width * 2532 / 1170)))
        return im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)

    if "better" not in phases and a.better:
        path, y = a.better.rsplit(":", 1)
        phases["better"] = [(path, int(y))]

    c = palette()
    f_caption, f_brand = font(19), font(13)
    frames, durations = [], []
    for phase, pick, each, hold in STORY:
        items = phases.get(phase)
        if not items:
            raise SystemExit(f"missing phase: {phase}")
        chosen = {"all": items, "last": items[-1:], "ends": [items[0], items[-1]]}[pick]
        for i, item in enumerate(chosen):
            shot = load(*item) if isinstance(item, tuple) else load(item)
            canvas = Image.new("RGB", (WIDTH, BAR + shot.height), c["paper"])
            canvas.paste(shot, (0, BAR))
            d = ImageDraw.Draw(canvas)
            d.rectangle((0, 0, WIDTH, BAR), fill=c["ink"])
            d.text((18, BAR / 2 - 4), CAPTIONS[a.lang][phase], font=f_caption, fill=c["paper"], anchor="lm")
            d.text((18, BAR - 12), "SocialCoach", font=f_brand, fill=c["ink-3"], anchor="lm")
            frames.append(canvas)
            durations.append(round(1000 * (hold if i == len(chosen) - 1 else each)))

    # One shared adaptive palette keeps flat UI colours stable between frames.
    sample = Image.new("RGB", (WIDTH, frames[0].height * 4))
    for i, f in enumerate(frames[:: max(1, len(frames) // 4)][:4]):
        sample.paste(f, (0, i * frames[0].height))
    pal = sample.quantize(colors=128, method=Image.MEDIANCUT)
    out = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    out[0].save(a.out, save_all=True, append_images=out[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(f"{a.out}: {len(out)} frames, {sum(durations) / 1000:.1f}s, {os.path.getsize(a.out) // 1024} KB")


if __name__ == "__main__":
    main()
