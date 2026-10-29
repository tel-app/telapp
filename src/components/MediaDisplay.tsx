import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2, VolumeX, Music, Disc3, Sparkles } from 'lucide-react';
import { getMediaBlob } from '../lib/mediaStorage';

interface MediaDisplayProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  username?: string;
  audioTrack?: string;
  isPlaying?: boolean;
  isMuted?: boolean;
  className?: string;
  aspectRatio?: 'portrait' | 'square' | 'video';
  onClick?: () => void;
  onDoubleTap?: () => void;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  videoUrl,
  thumbnailUrl,
  caption,
  username,
  audioTrack,
  isPlaying = false,
  isMuted = true,
  className = '',
  aspectRatio = 'portrait',
  onClick,
  onDoubleTap
}) => {
  const [resolvedVideoSrc, setResolvedVideoSrc] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef<number>(0);

  // Check if videoUrl is an IndexedDB key (e.g. "idb:...")
  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    async function resolveSource() {
      setVideoError(false);
      setIsLoading(true);

      if (!videoUrl) {
        setResolvedVideoSrc(null);
        setIsLoading(false);
        return;
      }

      if (videoUrl.startsWith('idb:')) {
        const key = videoUrl.replace('idb:', '');
        const blob = await getMediaBlob(key);
        if (blob && active) {
          const url = URL.createObjectURL(blob);
          objectUrlToRevoke = url;
          setResolvedVideoSrc(url);
          setIsLoading(false);
          return;
        }
      }

      if (active) {
        setResolvedVideoSrc(videoUrl);
        setIsLoading(false);
      }
    }

    resolveSource();

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [videoUrl]);

  // Handle Play/Pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedVideoSrc || videoError) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Autoplay may be restricted by browser until user gesture
      });
    } else {
      video.pause();
    }
  }, [isPlaying, resolvedVideoSrc, videoError]);

  const handlePointerClick = (e: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap!
      onDoubleTap?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      onClick?.();
    }
  };

  const isVideoSource = resolvedVideoSrc && !videoError && (
    resolvedVideoSrc.startsWith('data:video') ||
    resolvedVideoSrc.startsWith('blob:') ||
    resolvedVideoSrc.match(/\.(mp4|webm|mov|ogg)($|\?)/i) ||
    resolvedVideoSrc.includes('/video/')
  );

  return (
    <div
      onClick={handlePointerClick}
      className={`relative w-full h-full overflow-hidden bg-[#0b0914] flex items-center justify-center select-none ${className}`}
    >
      {/* 1. HTML5 Video Player if valid video source */}
      {isVideoSource ? (
        <video
          ref={videoRef}
          src={resolvedVideoSrc}
          poster={thumbnailUrl && !imageError ? thumbnailUrl : undefined}
          muted={isMuted}
          playsInline
          loop
          autoPlay={isPlaying}
          onError={() => setVideoError(true)}
          className="w-full h-full object-cover"
        />
      ) : thumbnailUrl && !imageError ? (
        /* 2. Image Thumbnail if Video Unavailable or Image Mode */
        <img
          src={thumbnailUrl}
          alt={caption || 'TelApp Media'}
          onError={() => setImageError(true)}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      ) : (
        /* 3. Graceful Elegant Fallback (No broken image icons!) */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#16122c] via-[#0b0914] to-[#211c42] relative overflow-hidden">
          {/* Ambient decorative glowing rings */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#6c5ce7]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#e84393]/20 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center gap-3 max-w-[240px]">
            {/* Spinning Neon Disk Vinyl */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-[#6c5ce7] to-[#e84393] p-0.5 shadow-[0_0_25px_rgba(108,92,231,0.4)] flex items-center justify-center animate-spin-slow">
              <div className="w-full h-full rounded-full bg-[#0b0914] flex items-center justify-center">
                <Disc3 className="w-8 h-8 text-[#a29bfe] animate-pulse" />
              </div>
              <div className="absolute w-3 h-3 rounded-full bg-white shadow-sm" />
            </div>

            {/* Audio Waveform Animation Bars */}
            <div className="flex items-end gap-1 h-6">
              {[40, 75, 55, 90, 60, 100, 45, 80, 65, 95].map((h, i) => (
                <span
                  key={i}
                  style={{
                    height: `${isPlaying ? h : Math.max(25, h * 0.4)}%`,
                    animationDelay: `${i * 0.1}s`
                  }}
                  className={`w-1 rounded-full bg-gradient-to-t from-[#6c5ce7] to-[#e84393] transition-all duration-300 ${
                    isPlaying ? 'animate-pulse' : ''
                  }`}
                />
              ))}
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white truncate max-w-[200px]">
                {audioTrack || 'Original Stream Audio'}
              </span>
              <span className="text-[11px] text-[#a29bfe] flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-[#ffd700]" />
                <span>@{username || 'telapp_creator'}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Subtle bottom shadow vignette for readable captions */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20 pointer-events-none" />
    </div>
  );
};
