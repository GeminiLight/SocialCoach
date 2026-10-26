import { createElement } from 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { VideoLesson } from '../../src/components/VideoLesson';
import { VIDEO_LESSONS } from '../../src/data/video-lessons';

test('opening a lesson renders a poster and an explicit play button without any movie or caption source', () => {
  for (const lesson of VIDEO_LESSONS.filter(item => item.kind === 'concept')) for (const lang of ['zh','en'] as const) {
    const html = renderToStaticMarkup(createElement(VideoLesson, { lesson, lang, saved:false, onSave:() => {} }));
    assert.ok(html.includes(`poster="${lesson.video.poster}"`));
    assert.ok(html.includes('preload="none"'));
    assert.ok(/<video[^>]*aria-hidden="true"/.test(html), 'only the accessible play button is announced before activation');
    assert.ok(html.includes(lang === 'zh' ? '播放视频' : 'Play video'));
    assert.ok(!html.includes(lesson.video.src), 'not even metadata may be requested until an explicit play/seek');
    assert.ok(!html.includes('<track') && !html.includes('<source'));
    assert.ok(html.includes(lesson.boundary[lang]));
  }
});
