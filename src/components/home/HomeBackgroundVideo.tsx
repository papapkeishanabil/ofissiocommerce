"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import assets from "./home-video-assets.json";

type VideoAssets = { poster: string; desktop?: string; mobile?: string };

function assetsFor(src: string): VideoAssets | undefined {
  // Only replace the exact CMS upload these derivatives were made from.
  // A newly uploaded video must never inherit an older video's poster.
  const path = src.replace(/^https:\/\/(?:www\.)?ofissio\.com(?=\/)/, "");
  return (assets as Record<string, VideoAssets>)[path];
}

export function HomeBackgroundVideo(props: {
  src: string;
  eager?: boolean;
  className?: string;
  objectPosition?: string;
}) {
  // Reset loading/error state when the CMS source changes.
  return <VideoSurface key={props.src} {...props} />;
}

function VideoSurface({
  src,
  eager = false,
  className = "",
  objectPosition = "center",
}: {
  src: string;
  eager?: boolean;
  className?: string;
  objectPosition?: string;
}) {
  const media = assetsFor(src);
  const wrapper = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [nearViewport, setNearViewport] = useState(eager);
  const [posterReady, setPosterReady] = useState(!media?.poster);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [compact, setCompact] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);

  useEffect(() => {
    // Select once at mount; resizing must not restart an already playing film.
    setCompact(window.matchMedia("(max-width: 767px)").matches);
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setMotionAllowed(!query.matches);
      if (query.matches) {
        video.current?.pause();
        setPlaying(false);
      }
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (eager || !wrapper.current) return;
    if (!("IntersectionObserver" in window)) {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "400px 0px" });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, [eager]);

  const loadVideo = nearViewport && posterReady && (motionAllowed || !media?.poster);
  const optimized = !useOriginal && (compact ? media?.mobile ?? media?.desktop : media?.desktop);

  return (
    <div ref={wrapper} aria-hidden="true" className={`absolute inset-0 ${className}`} data-home-video={eager ? "hero" : "deferred"}>
      {media?.poster && (
        <Image
          src={media.poster}
          alt=""
          fill
          sizes="100vw"
          unoptimized
          preload={eager}
          className="object-cover"
          style={{ objectPosition }}
          onLoad={() => setPosterReady(true)}
          onError={() => setPosterReady(true)}
        />
      )}
      {loadVideo && (
        <video
          key={useOriginal ? "original" : "optimized"}
          ref={video}
          src={optimized || src}
          autoPlay={motionAllowed}
          loop
          muted
          playsInline
          preload={motionAllowed ? "auto" : "metadata"}
          poster={media?.poster}
          tabIndex={-1}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${playing ? "opacity-100" : "opacity-0"}`}
          style={{ objectPosition }}
          onPlaying={() => setPlaying(true)}
          onLoadedData={() => {
            if (!motionAllowed && !media?.poster) setPlaying(true);
          }}
          onError={() => {
            setPlaying(false);
            if (optimized) setUseOriginal(true);
          }}
        />
      )}
    </div>
  );
}
