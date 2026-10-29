import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Smartphone,
  Lock,
  Film,
  Sparkles
} from 'lucide-react';
import { PostItem } from '../lib/firebase';

export interface ShareTargetItem {
  type: 'post' | 'reel' | 'story';
  id: string;
  username: string;
  title?: string;
  thumbnailUrl?: string;
}

interface ShareModalProps {
  post: PostItem | null;
  shareTarget?: ShareTargetItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShareCompleted?: (platform: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  post,
  shareTarget,
  isOpen,
  onClose,
  onShareCompleted
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || (!post && !shareTarget)) return null;

  const itemType = shareTarget?.type || 'reel';
  const itemId = shareTarget?.id || post?.id || 'reel';
  const itemUsername = shareTarget?.username || post?.username || 'telapp_creator';
  const itemCaption = shareTarget?.title || post?.caption || 'Check out this video on TelApp!';
  const itemThumbnail = shareTarget?.thumbnailUrl || post?.thumbnailUrl;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://telapp.stream';
  const realShareUrl = `${originUrl}/#${itemType}-${itemId}`;
  const shareTitle = `Watch @${itemUsername}'s ${itemType} on TelApp: "${itemCaption}"`;

  // Hidden masked link representation as requested
  const maskedUrlPreview = `${originUrl}/#${itemType}/••••••••••••`;

  const copyToClipboard = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(realShareUrl);
    }
    setCopied(true);
    onShareCompleted?.('clipboard');
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TelApp ${itemType.toUpperCase()}`,
          text: shareTitle,
          url: realShareUrl
        });
        onShareCompleted?.('native');
        onClose();
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard();
    }
  };

  // Real official icons & brand colors
  const socialTargets = [
    {
      name: 'WhatsApp',
      color: '#25D366',
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105">
          <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.074-1.028-.051-.252-.08-.57-.187-.98-.364-1.748-.755-2.883-2.518-2.97-2.635-.088-.117-.714-.95-.714-1.815 0-.865.452-1.291.614-1.467.161-.176.353-.221.471-.221.118 0 .235.001.339.006.109.005.255-.041.399.303.145.348.497 1.212.54 1.301.043.088.072.191.014.307-.059.117-.088.191-.175.293-.087.103-.185.23-.264.309-.088.088-.18.184-.078.36.103.176.456.753.978 1.219.673.6 1.241.787 1.417.875.176.088.279.074.382-.044.103-.118.441-.514.558-.69.118-.176.236-.147.398-.088.161.059 1.029.485 1.205.573.177.088.294.132.338.206.044.073.044.426-.1 1.026zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.662 1.442 5.176L2 22l4.981-1.309C8.389 21.524 10.134 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
          </svg>
        </div>
      ),
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n${realShareUrl}`)}`
    },
    {
      name: 'X (Twitter)',
      color: '#000000',
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#000000] border border-white/20 flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105">
          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </div>
      ),
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(realShareUrl)}`
    },
    {
      name: 'Telegram',
      color: '#229ED9',
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#229ED9] flex items-center justify-center text-white shadow-lg shadow-[#229ED9]/30 transition-transform hover:scale-105">
          <svg className="w-5 h-5 fill-white -translate-x-0.5" viewBox="0 0 24 24">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </div>
      ),
      url: `https://t.me/share/url?url=${encodeURIComponent(realShareUrl)}&text=${encodeURIComponent(shareTitle)}`
    },
    {
      name: 'Facebook',
      color: '#1877F2',
      icon: (
        <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-lg shadow-[#1877F2]/30 transition-transform hover:scale-105">
          <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </div>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(realShareUrl)}`
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#16122c] border border-[#a29bfe]/25 rounded-t-[32px] sm:rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#a29bfe]/15">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6c5ce7] to-[#e84393] flex items-center justify-center text-white">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Share {itemType === 'story' ? 'Story' : 'Specific Reel'}</h3>
              <span className="text-[11px] text-[#8b85b1]">Instant social sharing for @{itemUsername}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#0b0914] border border-[#a29bfe]/15 flex items-center justify-center text-[#8b85b1] hover:text-white gpu-tap"
            aria-label="Close share dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Snippet */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0b0914] border border-[#a29bfe]/15">
          {itemThumbnail ? (
            <img 
              src={itemThumbnail} 
              alt={itemCaption} 
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-[#a29bfe]/20" 
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#211c42] flex items-center justify-center text-[#a29bfe]">
              <Film className="w-6 h-6" />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white truncate">@{itemUsername}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#6c5ce7]/20 text-[#a29bfe] uppercase font-mono">
                {itemType}
              </span>
            </div>
            <p className="text-[11px] text-[#8b85b1] line-clamp-2 mt-0.5">{itemCaption}</p>
          </div>
        </div>

        {/* Real App Icons Grid (WhatsApp, X, Telegram, Facebook) */}
        <div>
          <span className="text-[10px] font-bold text-[#8b85b1] uppercase tracking-wider block mb-3">
            Share Directly to Real Apps
          </span>
          <div className="grid grid-cols-4 gap-2">
            {socialTargets.map((target) => (
              <a
                key={target.name}
                href={target.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  onShareCompleted?.(target.name);
                  onClose();
                }}
                className="flex flex-col items-center gap-2 p-2.5 rounded-2xl hover:bg-[#211c42] transition-all text-center gpu-tap"
              >
                {target.icon}
                <span className="text-[10px] font-semibold text-[#e2e0f0]">{target.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Native System Share & Masked/Hidden Copy Link */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[#a29bfe]/15">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#e84393] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#6c5ce7]/30 gpu-tap"
            >
              <Smartphone className="w-4 h-4" />
              <span>More Options / System Share</span>
            </button>
          )}

          {/* Masked Secret Link Display as requested */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#0b0914] border border-[#a29bfe]/20">
            <div className="flex items-center gap-1.5 px-2 flex-1 min-w-0">
              <Lock className="w-3.5 h-3.5 text-[#a29bfe] flex-shrink-0" />
              <span className="text-xs text-[#8b85b1] font-mono tracking-wider truncate">
                {maskedUrlPreview}
              </span>
            </div>
            <button
              onClick={copyToClipboard}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all gpu-tap ${
                copied 
                  ? 'bg-[#2ed573] text-black shadow-md' 
                  : 'bg-[#211c42] hover:bg-[#6c5ce7] text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
