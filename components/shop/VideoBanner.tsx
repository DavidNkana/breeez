'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type VideoBannerProps = {
  /** Direct .mp4 URL (Pexels, Mixkit, Coverr all allow commercial use with no attribution). */
  videoUrl: string;
  /** Optional .webm/.mp4 fallback URLs in order of preference. Browsers will pick the first one they support. */
  sources?: string[];
  /** Optional still image shown while the video loads or autoplay is blocked (mobile data-saver, low-power mode). */
  posterUrl?: string;
  /** Small uppercase eyebrow above the headline */
  eyebrow?: string;
  /** Main headline. Shown in white over the video. */
  headline: string;
  /** Supporting copy under the headline */
  subheadline?: string;
  /** Where the CTA goes. Defaults to /categories. */
  ctaHref?: string;
  /** CTA label. Defaults to "Shop now". */
  ctaLabel?: string;
  /** Alignment */
  align?: 'left' | 'center';
};

/**
 * Full-bleed looping muted video banner with headline + sub-copy + CTA.
 * - Video is muted, autoplays, loops, plays inline. Required for mobile browsers.
 * - If autoplay is blocked (low-power / data-saver / iOS low-power), the
 *   poster image still renders and the video plays when the user taps the
 *   "Tap to play" overlay.
 * - We pause the video when offscreen via IntersectionObserver to save
 *   battery on mobile.
 */
export function VideoBanner({
  videoUrl,
  sources,
  posterUrl,
  eyebrow,
  headline,
  subheadline,
  ctaHref = '/categories',
  ctaLabel = 'Shop now',
  align = 'left'
}: VideoBannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [visible, setVisible] = useState(true);

  // Pause when offscreen, play when visible.
  useEffect(() => {
    const wrap = wrapperRef.current;
    const vid = videoRef.current;
    if (!wrap || !vid || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting);
          if (entry.isIntersecting) {
            vid.play().catch(() => {
              // Autoplay blocked — let user tap the poster overlay.
              setNeedsTap(true);
            });
          } else {
            vid.pause();
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  function handleTapToPlay() {
    const vid = videoRef.current;
    if (!vid) return;
    vid.play()
      .then(() => setNeedsTap(false))
      .catch(() => {
        // Still blocked — leave overlay up.
      });
  }

  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left items-start';

  return (
    <section
      ref={wrapperRef}
      className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden"
      aria-label={headline}
    >
      <div className="relative h-[440px] sm:h-[520px] md:h-[560px] bg-brand-900">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl}
          // If the browser supports lazy attribute on video it will skip loading until near viewport.
          // We keep that off for above-the-fold banners.
        >
          {sources && sources.length > 0 ? (
            sources.map((src) => (
              <source key={src} src={src} />
            ))
          ) : (
            <source src={videoUrl} type="video/mp4" />
          )}
        </video>

        {/* Dark gradient so white copy stays readable over any video frame. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              align === 'left'
                ? 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)'
                : 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.75) 100%)'
          }}
          aria-hidden="true"
        />

        {/* Tap-to-play overlay if autoplay is blocked (mobile data-saver, low-power mode). */}
        {needsTap && (
          <button
            type="button"
            onClick={handleTapToPlay}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 text-white"
            aria-label="Play background video"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm ring-1 ring-white/30">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
              Tap to play
            </span>
          </button>
        )}

        {/* Copy */}
        <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center px-4">
          <div className={`flex max-w-xl flex-col gap-3 ${alignClass} text-white`}>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                {eyebrow}
              </p>
            )}
            <h2 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {headline}
            </h2>
            {subheadline && (
              <p className="max-w-md text-sm text-white/90 sm:text-base md:max-w-lg">
                {subheadline}
              </p>
            )}
            <div className="mt-2">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-brand-950 shadow-md transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
              >
                {ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Tiny mute indicator so the user knows it's a video and it has no audio. */}
        <div className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] font-medium text-white/80 backdrop-blur-sm" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.916 8.916 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
          muted
        </div>
      </div>
    </section>
  );
}
