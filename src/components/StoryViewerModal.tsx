import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, Sparkles, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { StoryItem } from '../lib/firebase';
import { GoldBadge } from './GoldBadge';
import { MediaDisplay } from './MediaDisplay';

interface StoryViewerModalProps {
  stories: StoryItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onShareStory?: (story: StoryItem) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex = 0,
  isOpen,
  onClose,
  onShareStory
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sentToast, setSentToast] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setProgress(0);
    setIsLiked(false);
  }, [initialIndex, isOpen]);

  // Story progress timer (5 seconds duration)
  useEffect(() => {
    if (!isOpen || stories.length === 0 || isPaused) return;

    const interval = 50; // update every 50ms
    const step = (interval / 5000) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((curr) => curr + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentIndex, stories.length, isPaused, onClose]);

  if (!isOpen || stories.length === 0) return null;

  const currentStory = stories[currentIndex];

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setIsLiked(false);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setIsLiked(false);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSentToast(true);
    setReplyText('');
    setTimeout(() => setSentToast(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 select-none animate-fade-in">
      <div 
        className="relative w-full max-w-sm h-full max-h-[820px] bg-black sm:rounded-[36px] overflow-hidden flex flex-col justify-between"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Story Header & Segmented Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 pt-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex flex-col gap-2.5">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {stories.map((s, idx) => (
              <div key={s.id || idx} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                <div 
                  style={{
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                  className="h-full bg-white rounded-full transition-all duration-75"
                />
              </div>
            ))}
          </div>

          {/* User Info Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img
                src={currentStory.userAvatar}
                alt={currentStory.username}
                className="w-9 h-9 rounded-full object-cover border-2 border-[#6c5ce7]"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white drop-shadow">
                  @{currentStory.username}
                </span>
                {currentStory.isGoldVerified && <GoldBadge size="sm" />}
                <span className="text-[10px] text-white/60">• 24h Story</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShareStory?.(currentStory)}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80"
                aria-label="Share story"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/80"
                aria-label="Close story"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Media Content */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <MediaDisplay
            videoUrl={currentStory.mediaUrl}
            thumbnailUrl={currentStory.thumbnailUrl}
            caption={currentStory.caption}
            username={currentStory.username}
            isPlaying={!isPaused}
            className="w-full h-full"
          />

          {/* Left / Right Tap zones */}
          <div 
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-20 w-1/3 z-10 cursor-pointer"
          />
          <div 
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-20 w-1/3 z-10 cursor-pointer"
          />
        </div>

        {/* Story Caption (if provided) */}
        {currentStory.caption && (
          <div className="absolute bottom-20 left-4 right-4 z-20 text-center">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white font-medium text-xs shadow-md">
              {currentStory.caption}
            </span>
          </div>
        )}

        {/* Bottom Interactive Bar (Reply & Heart Reaction) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pb-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center gap-2">
          {sentToast ? (
            <div className="flex-1 py-2 px-3 rounded-full bg-[#2ed573]/20 border border-[#2ed573]/50 text-[#2ed573] text-xs font-bold text-center">
              Story Reply Sent!
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex-1 flex items-center bg-black/60 border border-white/20 rounded-full px-3 py-1.5">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${currentStory.username}...`}
                className="w-full bg-transparent text-white text-xs placeholder-white/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="text-white disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-125 ${
              isLiked ? 'bg-[#ff4757] text-white shadow-lg shadow-[#ff4757]/40' : 'bg-black/60 text-white border border-white/20'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
          </button>
        </div>

      </div>
    </div>
  );
};
