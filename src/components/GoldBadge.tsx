import React from 'react';
import { Check, Sparkles } from 'lucide-react';

interface GoldBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export const GoldBadge: React.FC<GoldBadgeProps> = ({ 
  size = 'md', 
  showTooltip = true,
  className = '' 
}) => {
  const sizeMap = {
    sm: 'w-3.5 h-3.5 text-[8px]',
    md: 'w-4 h-4 text-[9px]',
    lg: 'w-5 h-5 text-[11px]'
  };

  const iconSizeMap = {
    sm: 9,
    md: 10,
    lg: 12
  };

  return (
    <span 
      className={`relative inline-flex items-center justify-center rounded-full flex-shrink-0 cursor-default select-none gold-badge-container group ${sizeMap[size]} ${className}`}
      title={showTooltip ? "Official Gold Verified Creator • TelApp Premium" : undefined}
      aria-label="Gold Verified Creator"
    >
      {/* Outer Golden Aura Glow */}
      <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ffd700] via-[#f59e0b] to-[#b45309] opacity-80 blur-[2px] animate-pulse"></span>
      
      {/* Shimmering Metallic Gold Body */}
      <span className="relative w-full h-full rounded-full flex items-center justify-center p-[1px] bg-gradient-to-tr from-[#b45309] via-[#fbbf24] to-[#fef08a] shadow-[0_0_8px_rgba(251,191,36,0.6)] border border-[#fef08a]/80 overflow-hidden">
        {/* Dynamic Sheen Light Sweep Animation */}
        <span className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/70 to-transparent -translate-x-full animate-gold-sheen pointer-events-none"></span>
        
        {/* Crisp Checkmark Insignia in Deep Purple Contrast */}
        <Check 
          size={iconSizeMap[size]} 
          className="text-[#16122c] stroke-[3.5] relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]" 
        />
      </span>

      {/* Floating Sparkle Glint */}
      <Sparkles 
        size={size === 'lg' ? 9 : 7} 
        className="absolute -top-1 -right-1 text-[#fff6a6] fill-[#ffd700] animate-spin-slow pointer-events-none" 
      />
    </span>
  );
};
