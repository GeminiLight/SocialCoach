"""Explicit, local-only export. Builds consume the committed media, never ffmpeg.

Usage: python3 scripts/prepare-social-science-media.py --source-root /path/to/H-series
The supplied source directory is not copied into the product repository.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
JOBS = {
    'transparency': '01-transparency-H',
    'weak-ties': '02-weak-ties-H',
    'front-back-stage': '03-front-back-stage',
    'self-fulfilling-prophecy': '04-self-fulfilling-prophecy',
    'schelling-neighbors': '05-schelling-neighbors',
}
PROFILE = '720x1280-30fps-x264-slow-animation-crf27-aac96k-faststart-v1'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(args):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args],
                            capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-4000:])
    return result.stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, required=True)
    source = parser.parse_args().source_root
    out = APP/'public/videos/learning/social-science'
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = APP/'src/data/social-science-media.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest = {}
    for slug, folder in JOBS.items():
        project = source/'episodes'/folder
        original = project/'final.mp4'
        original_sha = digest(original)
        old = previous.get(slug, {})
        if old.get('sourceSha256')==original_sha and old.get('profile')==PROFILE and all(
            (APP/'public'/old[key].lstrip('/')).is_file() for key in ['src','poster','cover']
        ):
            manifest[slug] = old
            print(f'{slug}: reuse', flush=True)
            continue
        temp = out/f'.{slug}.mp4'
        progress = run(['-i', str(original), '-map', '0:v:0', '-map', '0:a:0',
                        '-vf', 'scale=720:1280:flags=lanczos', '-r', '30',
                        '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '27',
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ar', '48000',
                        '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', str(temp)])
        frames = int(re.findall(r'^frame=(\d+)', progress, re.M)[-1])
        sha = digest(temp)
        movie = out/f'{slug}-{sha[:12]}.mp4'
        temp.replace(movie)
        paths = {}
        for kind, width, quality in [('poster',720,'85'), ('cover',256,'80')]:
            image = out/f'.{slug}-{kind}.webp'
            run(['-i', str(project/'poster.jpg'), '-vf', f'scale={width}:-1:flags=lanczos',
                 '-frames:v', '1', '-c:v', 'libwebp', '-q:v', quality, str(image)])
            name = out/f'{slug}-{kind}-{digest(image)[:12]}.webp'
            image.replace(name)
            paths[kind] = '/'+name.relative_to(APP/'public').as_posix()
        manifest[slug] = {
            'src': '/'+movie.relative_to(APP/'public').as_posix(), **paths,
            'seconds': frames/30, 'frames':frames, 'width':720, 'height':1280,
            'bytes':movie.stat().st_size, 'sourceBytes':original.stat().st_size,
            'sha256':sha, 'sourceSha256':original_sha, 'profile':PROFILE,
        }
        print(json.dumps({'film':slug,'bytes':movie.stat().st_size,
                          'sourceBytes':original.stat().st_size,'frames':frames}), flush=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')

if __name__ == '__main__':
    main()
