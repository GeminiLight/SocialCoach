import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VIDEO_LESSONS, chapterAt, matchesVideo } from '../../src/data/video-lessons';
import { variants } from '../../src/features/dinner/lib/story';
import { parseArchive } from '../../src/lib/archive';

test('video lessons have real media, a source and a matching playable opening', () => {
  for (const lesson of VIDEO_LESSONS) {
    for (const path of [lesson.video.src, lesson.video.poster, lesson.video.cover, ...lesson.video.captions.map(c => c.src)]) {
      assert.ok(existsSync(fileURLToPath(new URL('../../public' + path, import.meta.url))), path);
    }
    assert.ok(lesson.source.label.zh && lesson.source.label.en && lesson.source.href && lesson.source.provenance.zh && lesson.source.provenance.en);
    const opening = variants.find(v => v.id === lesson.practice.opening);
    assert.equal(opening?.scene, lesson.practice.scene);
    for (const cue of lesson.transcript) {
      assert.ok(cue.from >= 0 && cue.to > cue.from && cue.to <= lesson.video.seconds);
      assert.ok(cue.text.zh && cue.text.en);
    }
  }
});

test('chapters follow the actual cut, including the rewind boundaries', () => {
  const lesson = VIDEO_LESSONS[0];
  assert.equal(chapterAt(lesson, 14.49), 0);
  assert.equal(chapterAt(lesson, 14.5), 1);
  assert.equal(chapterAt(lesson, 21.5), 2);
  assert.equal(chapterAt(lesson, 30), 3);
  assert.equal(chapterAt(lesson, NaN), 0);
});

test('video search works with either language and scene keywords', () => {
  const lesson = VIDEO_LESSONS[0];
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
  assert.deepEqual([lesson.practice.scene, lesson.practice.opening], ['elevator', 'elevator-privacy']);
  for (const query of ['HR', '隐私', '电梯', 'privacy']) assert.ok(matchesVideo(lesson, query));
  assert.equal(matchesVideo(VIDEO_LESSONS[0], 'HR'), false, 'HR must not match the letters inside "three"');
  assert.equal(chapterAt(lesson, 19.99), 1);
  assert.equal(chapterAt(lesson, 20), 2);
  assert.equal(chapterAt(lesson, 27.5), 3);
  assert.ok(lesson.takeaways.some(item => item.quote.zh.includes('项目我照常推进')));
});
