import React from 'react';

export interface EstateLogoProps {
  /**
   * Layout variant:
   * - 'horizontal': Emblem on left + Wordmark/Subtitle on right (header, footer, modals, admin)
   * - 'stacked': Centered emblem on top + Wordmark/Subtitle below (compact cards)
   * - 'icon-only': Emblem only (compact buttons, badges, favicons)
   */
  variant?: 'horizontal' | 'stacked' | 'icon-only';
  /**
   * Size preset
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
   * Theme styling
   */
  theme?: 'auto' | 'light' | 'dark' | 'gold';
  /**
   * Custom estate name override
   */
  estateName?: string;
  /**
   * Custom subtitle override
   */
  subtitle?: string;
  /**
   * Hide subtitle on mobile screens for ultra-compact headers
   */
  hideSubtitleOnMobile?: boolean;
  /**
   * Additional wrapper classes
   */
  className?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

export const EstateLogo: React.FC<EstateLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'auto',
  estateName = 'Finger of God Estate',
  subtitle = 'SECURITY MANAGEMENT • ASABA',
  hideSubtitleOnMobile = false,
  className = '',
  onClick
}) => {
  // Proportional emblem sizes (Clean, compact, website-ready)
  const dimensions = {
    xs: { iconSize: 26, titleClass: 'text-xs font-bold', subClass: 'text-[9px]' },
    sm: { iconSize: 32, titleClass: 'text-sm font-bold', subClass: 'text-[10px]' },
    md: { iconSize: 38, titleClass: 'text-base font-bold', subClass: 'text-[11px]' },
    lg: { iconSize: 44, titleClass: 'text-lg font-bold', subClass: 'text-xs' }
  }[size];

  const isDark = theme === 'dark';
  const isGold = theme === 'gold';

  const titleColor = isDark
    ? 'text-white'
    : isGold
    ? 'text-amber-950'
    : 'text-slate-900';

  const subtitleColor = isDark
    ? 'text-emerald-400'
    : isGold
    ? 'text-amber-700'
    : 'text-emerald-700';

  const isStacked = variant === 'stacked';
  const isIconOnly = variant === 'icon-only';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${
        isStacked ? 'flex-col text-center gap-2' : 'flex-row text-left gap-2.5 sm:gap-3'
      } ${onClick ? 'cursor-pointer select-none transition-opacity hover:opacity-90' : ''} ${className}`}
    >
      {/* Professional Compact Emblem Icon */}
      <div 
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Rich Gold Gradient */}
            <linearGradient id="estate-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>

            {/* Deep Slate Shield Background */}
            <linearGradient id="estate-shield-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Emerald Accent */}
            <linearGradient id="estate-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Hexagonal Shield Foundation */}
          <polygon
            points="32,3 58,16 58,48 32,61 6,48 6,16"
            fill="url(#estate-shield-bg)"
            stroke="url(#estate-gold-grad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Inner Accent Line */}
          <polygon
            points="32,8 53,18 53,46 32,56 11,46 11,18"
            fill="none"
            stroke="url(#estate-gold-grad)"
            strokeWidth="1"
            strokeOpacity="0.4"
          />

          {/* 3D Residential Building Towers */}
          {/* Left Tower (Taller) */}
          <polygon points="21,24 29,20 29,45 21,45" fill="url(#estate-gold-grad)" />
          <polygon points="29,20 34,23 34,45 29,45" fill="#78350F" />
          
          {/* Right Tower (Shorter) */}
          <polygon points="35,28 42,24 42,45 35,45" fill="url(#estate-gold-grad)" />
          <polygon points="42,24 46,27 46,45 42,45" fill="#78350F" />

          {/* Security Star / Shield Center Badge */}
          <circle cx="32" cy="47" r="3.5" fill="url(#estate-emerald-grad)" />
          <polygon points="32,44.5 33,46.5 35,46.5 33.5,47.5 34,49.5 32,48.2 30,49.5 30.5,47.5 29,46.5 31,46.5" fill="#FEF3C7" />
        </svg>
      </div>

      {/* Clean Proportional Wordmark & Subtitle */}
      {!isIconOnly && (
        <div className="flex flex-col justify-center min-w-0">
          <div className={`${dimensions.titleClass} ${titleColor} tracking-tight leading-snug whitespace-nowrap`}>
            {estateName.replace(/Security Management/gi, '').trim() || 'Finger of God Estate'}
          </div>
          <div className={`${dimensions.subClass} ${subtitleColor} font-semibold tracking-normal leading-tight ${hideSubtitleOnMobile ? 'hidden sm:block' : 'block'}`}>
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
};

export default EstateLogo;

