"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, ChevronDown, Play, RotateCcw } from 'lucide-react';
import { chapterAt, type VideoLesson as Lesson } from '@/data/video-lessons';
import type { Lang } from '@/data/taxonomy';
import { pick } from '@/lib/i18n';

const copy = {
  play: { zh: '播放这段示范', en: 'Play this demonstration' },
  segments: { zh: '跳到关键片段', en: 'Jump to a moment' },
  watch: { zh: '看清楚，哪一步改变了对话', en: 'Notice what changes the conversation' },
  saved: { zh: '已收藏', en: 'Saved' }, save: { zh: '收藏这段视频', en: 'Save this video' },
  buffering: { zh: '正在加载视频…', en: 'Loading the video…' },
  error: { zh: '视频暂时没能加载。可以重试，或先阅读下面的完整文本。', en: 'The video could not load. Try again, or read the full transcript below.' },
  retry: { zh: '重新加载', en: 'Reload video' },
  blocked: { zh: '请用播放器的播放按钮继续。', en: 'Use the player’s play button to continue.' },
  transcript: { zh: '查看完整视频文本', en: 'Read the full transcript' },
  captions: { zh: '中文原片 · 提供中英文字幕与文本', en: 'Chinese original · Chinese and English captions and transcript' },
  breakdown: { zh: '从示范到自己的回应', en: 'Make the response your own' },
  practiceNote: { zh: '先确认开局，再试着回应。你已有的练习不会被这个入口直接替换。', en: 'Confirm the opening, then try your response. This link does not immediately replace an existing practice.' },
  fictional: { zh: '原创情境 · 示范不是标准答案', en: 'Original fiction · A demonstration, not a script to memorize' },
  source: { zh: '查看场景来源', en: 'See the scene source' },
  back: { zh: '返回学习目录', en: 'Back to learning' },
};

export function videoTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function VideoLesson({ lesson, lang, saved, onSave, onClose }: { lesson: Lesson; lang: Lang; saved: boolean; onSave: () => void; onClose?: () => void }) {
  const player = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [chapter, setChapter] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playNotice, setPlayNotice] = useState(false);

  // The film already has burned-in Chinese text. English captions are enabled
  // for the English UI; either track remains available in the native controls.
  const syncCaptions = () => {
    const tracks = player.current?.textTracks;
    if (tracks) for (const track of Array.from(tracks)) track.mode = lang === 'en' && track.language === 'en' ? 'showing' : 'disabled';
  };
  useEffect(() => {
    const tracks = player.current?.textTracks;
    if (tracks) for (const track of Array.from(tracks)) track.mode = lang === 'en' && track.language === 'en' ? 'showing' : 'disabled';
  }, [lang]);
  useEffect(() => {
    const element = player.current;
    const pauseWhenHidden = () => { if (document.hidden) element?.pause(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => { document.removeEventListener('visibilitychange', pauseWhenHidden); element?.pause(); };
  }, []);

  const seek = (at: number) => {
    const element = player.current;
    if (!element || failed) return;
    setPlayNotice(false);
    if (element.readyState >= 1) element.currentTime = Math.min(at, element.duration);
    else pendingSeek.current = at;
    void element.play().catch(() => { setBuffering(false); setPlayNotice(true); });
  };
  const retry = () => {
    if (player.current && player.current.currentTime > 0) pendingSeek.current = player.current.currentTime;
    setFailed(false); setPlayNotice(false); setBuffering(true);
    player.current?.load();
    void player.current?.play().catch(() => { setBuffering(false); setPlayNotice(true); });
  };
  const metadataLoaded = () => {
    const element = player.current;
    if (element && pendingSeek.current !== null) {
      element.currentTime = Math.min(pendingSeek.current, element.duration);
      pendingSeek.current = null;
    }
    syncCaptions();
    setBuffering(false);
  };

  return (
    <div className="video-lesson">
      <h2 className="sr-only lg:hidden">{pick(lesson.title, lang)}</h2>
      {onClose && <button type="button" className="lesson-back press" onClick={onClose}><ArrowLeft size={15} aria-hidden />{pick(copy.back, lang)}</button>}
      <div className="video-lesson-layout">
        <div className="video-watch">
          <div className="lesson-player">
            <video ref={player} controls playsInline preload="none" width={720} height={1280}
              poster={lesson.video.poster} aria-label={`${pick(copy.play, lang)} · ${pick(lesson.title, lang)}`}
              onLoadedMetadata={metadataLoaded} onPlay={() => setBuffering((player.current?.readyState ?? 0) < 3)} onPause={() => setBuffering(false)}
              onWaiting={() => setBuffering(true)} onPlaying={() => { setBuffering(false); setPlayNotice(false); }}
              onCanPlay={() => setBuffering(false)} onSeeked={() => setBuffering(false)}
              onError={() => { setFailed(true); setBuffering(false); }}
              onTimeUpdate={() => setChapter(chapterAt(lesson, player.current?.currentTime ?? 0))}>
              <source src={lesson.video.src} type="video/mp4" />
              {lesson.video.captions.map(track => <track key={track.lang} src={track.src} kind="captions" srcLang={track.lang} label={pick(track.label, lang)} default={lang === 'en' && track.lang === 'en'} />)}
              {pick(copy.error, lang)}
            </video>
          </div>
          <p className="lesson-media-note">{pick(copy.captions, lang)}</p>
          <p className="lesson-play-status" role={failed ? 'alert' : 'status'}>
            {failed ? pick(copy.error, lang) : buffering ? pick(copy.buffering, lang) : playNotice ? pick(copy.blocked, lang) : ''}
          </p>
          {failed && <button type="button" className="lesson-retry press" onClick={retry}><RotateCcw size={15} aria-hidden />{pick(copy.retry, lang)}</button>}
          <div className="lesson-chapters" role="group" aria-label={pick(copy.segments, lang)}>
            {lesson.chapters.map((item, index) => <button key={item.at} type="button" className="press" aria-current={index === chapter ? 'true' : undefined} disabled={failed} onClick={() => seek(item.at)}>
              <span className="num">{videoTime(item.at)}</span><span>{pick(item.title, lang)}</span><Play size={11} aria-hidden />
            </button>)}
          </div>
          <button type="button" className="lesson-save press" aria-pressed={saved} onClick={onSave}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} aria-hidden />{pick(saved ? copy.saved : copy.save, lang)}</button>
        </div>

        <section className="lesson-notes" aria-label={pick(copy.breakdown, lang)}>
          <p className="eyebrow text-teal">{pick(copy.watch, lang)}</p>
          <ol className="lesson-takeaways">
            {lesson.takeaways.map((item, index) => <li key={`${item.at}-${index}`}>
              <h3><span className="num">{String(index + 1).padStart(2, '0')}</span>{pick(item.title, lang)}</h3>
              <button type="button" className="lesson-quote press" disabled={failed} onClick={() => seek(item.at)} aria-label={`${pick(item.quote, lang)} · ${videoTime(item.at)}`}>
                <span>{pick(item.quote, lang)}</span><span className="num">{videoTime(item.at)}</span>
              </button>
              <p>{pick(item.explanation, lang)}</p>
            </li>)}
          </ol>
        </section>
      </div>

      <details className="lesson-transcript">
        <summary className="press">{pick(copy.transcript, lang)}<ChevronDown size={15} aria-hidden /></summary>
        <ol>{lesson.transcript.map(cue => <li key={cue.from}>
          <button type="button" className="press num" disabled={failed} onClick={() => seek(cue.from)} aria-label={`${videoTime(cue.from)} · ${pick(cue.text, lang)}`}>{videoTime(cue.from)}</button>
          <p>{pick(cue.text, lang)}</p>
        </li>)}</ol>
      </details>

      <section className="lesson-practice">
        <p className="eyebrow">{pick(copy.fictional, lang)}</p>
        <p>{pick(lesson.boundary, lang)}</p>
        <Link prefetch={false} href={`/3d?scene=${lesson.practice.scene}&opening=${lesson.practice.opening}`} className="lesson-practice-link press">
          {pick(lesson.practice.label, lang)}<ArrowRight size={17} aria-hidden />
        </Link>
        <p className="lesson-media-note">{pick(copy.practiceNote, lang)}</p>
      </section>
      <p className="lesson-source">{pick(lesson.source.label, lang)} · <a href={lesson.source.href} target="_blank" rel="noopener noreferrer">{pick(copy.source, lang)}<ArrowUpRight size={12} aria-hidden /></a></p>
    </div>
  );
}
