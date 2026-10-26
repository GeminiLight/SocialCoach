import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { VIDEO_LESSONS, chapterAt, matchesVideo } from '../../src/data/video-lessons';
import { variants } from '../../src/features/dinner/lib/story';
import { parseArchive } from '../../src/lib/archive';

test('video lessons have real media, a source and a matching opening when they demonstrate a scene', () => {
  for (const lesson of VIDEO_LESSONS) {
    for (const path of [lesson.video.src, lesson.video.poster, lesson.video.cover, ...lesson.video.captions.map(c => c.src)]) {
      assert.ok(existsSync(fileURLToPath(new URL('../../public' + path, import.meta.url))), path);
    }
    assert.ok(lesson.source.label.zh && lesson.source.label.en && lesson.source.href && lesson.source.provenance.zh && lesson.source.provenance.en);
    if (lesson.kind === 'demonstration') {
      assert.ok(lesson.practice);
      const opening = variants.find(v => v.id === lesson.practice!.opening);
      assert.equal(opening?.scene, lesson.practice.scene);
    } else {
      assert.equal(lesson.practice, undefined, 'a research explainer must not claim to demonstrate a specific 3D opening');
    }
    for (const cue of lesson.transcript) {
      assert.ok(cue.from >= 0 && cue.to > cue.from && cue.to <= lesson.video.seconds);
      assert.ok(cue.text.zh && cue.text.en);
    }
  }
});

test('chapters follow the actual cut, including the rewind boundaries', () => {
  const lesson = VIDEO_LESSONS.find(video => video.id === 'video-dinner-toast')!;
  assert.equal(chapterAt(lesson, 14.49), 0);
  assert.equal(chapterAt(lesson, 14.5), 1);
  assert.equal(chapterAt(lesson, 21.5), 2);
  assert.equal(chapterAt(lesson, 30), 3);
  assert.equal(chapterAt(lesson, NaN), 0);
});

test('video search works with either language and scene keywords', () => {
  const lesson = VIDEO_LESSONS.find(video => video.id === 'video-dinner-toast')!;
  for (const q of ['领导', 'toast', 'deadline', '  饭局  ']) assert.ok(matchesVideo(lesson, q));
  assert.ok(matchesVideo(lesson, ''));
  assert.equal(matchesVideo(lesson, 'unrelated-search-word'), false);
});

test('video bookmarks survive the existing local archive round trip', () => {
  const id = VIDEO_LESSONS[0].id;
  const archive = parseArchive(JSON.parse(JSON.stringify({ bookmarks: [id] })));
  assert.deepEqual(archive.bookmarks, [id]);
});

test('the HR video is searchable and leads to the privacy opening, not the dinner', () => {
  const lesson = VIDEO_LESSONS.find(video => video.id === 'video-elevator-hr');
  assert.ok(lesson);
  assert.ok(lesson.practice);
  assert.deepEqual([lesson.practice.scene, lesson.practice.opening], ['elevator', 'elevator-privacy']);
  for (const query of ['HR', '隐私', '电梯', 'privacy']) assert.ok(matchesVideo(lesson, query));
  assert.equal(matchesVideo(VIDEO_LESSONS.find(video => video.id === 'video-dinner-toast')!, 'HR'), false, 'HR must not match the letters inside "three"');
  assert.equal(chapterAt(lesson, 19.99), 1);
  assert.equal(chapterAt(lesson, 20), 2);
  assert.equal(chapterAt(lesson, 27.5), 3);
  assert.ok(lesson.takeaways.some(item => item.quote.zh.includes('项目我照常推进')));
});

test('the five H explainers retain bilingual, timed evidence and the two earlier demonstrations', () => {
  const films = VIDEO_LESSONS.filter(video => video.kind === 'concept');
  assert.equal(films.length, 5);
  assert.equal(VIDEO_LESSONS.filter(video => video.kind === 'demonstration').length, 2);
  for (const film of films) {
    assert.ok(film.boundary.zh && film.boundary.en);
    assert.ok(film.source.provenance.zh.includes('Breeze TTS 2'));
    assert.ok(film.chapters.every((chapter, i) => chapter.at >= 0 && chapter.at < film.video.seconds && (!i || chapter.at > film.chapters[i-1].at)));
    for (const point of film.takeaways) assert.ok(film.transcript.some(cue => cue.from === point.at && cue.text.zh === point.quote.zh && cue.text.en === point.quote.en), film.id);
    for (const track of film.video.captions) {
      const vtt = readFileSync(fileURLToPath(new URL('../../public'+track.src, import.meta.url)), 'utf8');
      assert.ok(vtt.startsWith('WEBVTT\n'));
      assert.equal((vtt.match(/ --> /g) ?? []).length, film.transcript.length);
    }
  }
});

test('H web movies fit the transfer budget and place metadata before movie data', () => {
  let total = 0;
  for (const film of VIDEO_LESSONS.filter(video => video.kind === 'concept')) {
    const path = fileURLToPath(new URL('../../public'+film.video.src, import.meta.url));
    const size = statSync(path).size;
    assert.ok(size < 6*1024*1024, `${film.id}: maximum 6 MiB`);
    total += size;
    const bytes = readFileSync(path), atoms: string[] = [];
    for (let offset=0; offset+8<=bytes.length;) {
      const length=bytes.readUInt32BE(offset); atoms.push(bytes.toString('ascii',offset+4,offset+8));
      assert.ok(length>=8, 'valid MP4 box'); offset+=length;
    }
    assert.ok(atoms.indexOf('moov')>=0 && atoms.indexOf('moov')<atoms.indexOf('mdat'), 'faststart avoids downloading the movie to discover its metadata');
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0,12);
    assert.ok(film.video.src.endsWith(`-${hash}.mp4`), 'immutable movie URL follows the actual content');
  }
  assert.ok(total<24*1024*1024, 'five-film transfer budget: 24 MiB');
});
