import { writeFileSync } from 'node:fs';
import { VIDEO_LESSONS } from '../src/data/video-lessons';

function timestamp(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${Math.floor(ms / 3600000).toString().padStart(2, '0')}:${Math.floor(ms / 60000 % 60).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}.${(ms % 1000).toString().padStart(3, '0')}`;
}
for (const lesson of VIDEO_LESSONS) for (const caption of lesson.video.captions) {
  const body = lesson.transcript.map((cue, i) => `${i + 1}\n${timestamp(cue.from)} --> ${timestamp(cue.to)}\n${cue.text[caption.lang].replaceAll('&', '&amp;').replaceAll('<', '&lt;')}\n`).join('\n');
  writeFileSync(new URL(`../public${caption.src}`, import.meta.url), `WEBVTT\n\n${body}`);
}
