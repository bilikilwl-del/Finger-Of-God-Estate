import React from 'react';

export interface EstateLogoProps {
  /**
   * Layout variant:
   * - 'horizontal': Icon + text next to it (standard for headers, navbars)
   * - 'stacked': Centered icon with text underneath (for heroes, auth modals, splash screens)
   * - 'icon-only': Just the crest emblem (for compact buttons, avatars, badges)
   * - 'seal': Official circular/shield seal lockup (for receipts, official stamps, certificates)
   */
  variant?: 'horizontal' | 'stacked' | 'icon-only' | 'seal';
  /**
   * Size preset
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /**
   * Color theme:
   * - 'auto': Blends with surrounding context (dark text on light, light text on dark)
   * - 'light': Optimized for white/light slate backgrounds
   * - 'dark': Optimized for dark midnight/slate backgrounds
   * - 'gold': High-prestige gold & emerald metallic finish
   * - 'monochrome': Clean single-tone for receipt printing
   */
  theme?: 'auto' | 'light' | 'dark' | 'gold' | 'monochrome';
  /**
   * Custom estate name override
   */
  estateName?: string;
  /**
   * Custom subtitle / location (default: 'SECURITY MANAGEMENT • ASABA')
   */
  subtitle?: string;
  /**
   * Additional class names for outer wrapper
   */
  className?: string;
  /**
   * Custom click handler
   */
  onClick?: () => void;
}

export const EstateLogo: React.FC<EstateLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  theme = 'auto',
  estateName = 'Finger of God Estate',
  subtitle = 'Security Management • Asaba',
  className = '',
  onClick
}) => {
  // Size mappings for the emblem
  const iconDimensions = {
    xs: { w: 28, h: 28, textMain: 'text-xs', textSub: 'text-[9px]' },
    sm: { w: 36, h: 36, textMain: 'text-sm', textSub: 'text-[10px]' },
    md: { w: 44, h: 44, textMain: 'text-base', textSub: 'text-[11px]' },
    lg: { w: 56, h: 56, textMain: 'text-lg sm:text-xl', textSub: 'text-xs' },
    xl: { w: 72, h: 72, textMain: 'text-2xl', textSub: 'text-sm' },
    '2xl': { w: 96, h: 96, textMain: 'text-3xl', textSub: 'text-base' }
  }[size];

  // Theme color styles
  const isDark = theme === 'dark';
  const isMono = theme === 'monochrome';
  const isGold = theme === 'gold';

  const titleColor = isMono
    ? 'text-slate-900'
    : isDark
    ? 'text-white'
    : isGold
    ? 'text-amber-950'
    : 'text-slate-900';

  const subtitleColor = isMono
    ? 'text-slate-600'
    : isDark
    ? 'text-emerald-400'
    : isGold
    ? 'text-amber-700'
    : 'text-emerald-600';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${
        variant === 'stacked' || variant === 'seal' ? 'flex-col text-center' : 'flex-row text-left'
      } ${onClick ? 'cursor-pointer select-none transition-transform hover:opacity-95' : ''} ${className}`}
    >
      {/* Precision Vector Emblem (Rearranged Crest with Residential Skyline & Golden Borders) */}
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: iconDimensions.w, height: iconDimensions.h }}
      >
        <svg
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            {/* Rich Golden Gradients */}
            <linearGradient id="fog-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBF5B7" />
              <stop offset="25%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#AA771C" />
              <stop offset="75%" stopColor="#F9DF7B" />
              <stop offset="100%" stopColor="#85581A" />
            </linearGradient>

            <linearGradient id="fog-gold-bright" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF2A3" />
              <stop offset="50%" stopColor="#E5B83B" />
              <stop offset="100%" stopColor="#9E6B17" />
            </linearGradient>

            {/* Deep Slate / Midnight Navy Background for Crest */}
            <linearGradient id="fog-shield-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#0B1329" />
              <stop offset="100%" stopColor="#040814" />
            </linearGradient>

            {/* Emerald Security Accent Gradient */}
            <linearGradient id="fog-emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Building Lighting Shimmer */}
            <linearGradient id="fog-tower-fill" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFEA85" />
              <stop offset="40%" stopColor="#D4AF37" />
              <stop offset="70%" stopColor="#B8860B" />
              <stop offset="100%" stopColor="#7A5408" />
            </linearGradient>

            <linearGradient id="fog-tower-side" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B6508" />
              <stop offset="100%" stopColor="#5E4003" />
            </linearGradient>

            {/* Drop shadow filter */}
            <filter id="fog-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Outer Shield / Hexagonal Crest Frame */}
          <path
            d="M100 6 L178 36 L178 120 C178 162 144 186 100 196 C56 186 22 162 22 120 L22 36 Z"
            fill="url(#fog-shield-bg)"
            stroke="url(#fog-gold-grad)"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* Inner Accent Ring / Inset Border */}
          <path
            d="M100 16 L168 42 L168 116 C168 152 138 174 100 183 C62 174 32 152 32 116 L32 42 Z"
            fill="none"
            stroke="url(#fog-gold-bright)"
            strokeWidth="1.5"
            strokeOpacity="0.85"
            strokeDasharray="4 2"
          />

          {/* Geometric Top Accent / Sunburst Crest */}
          <polygon
            points="100,22 108,34 92,34"
            fill="url(#fog-gold-bright)"
          />

          {/* Architectural Skyline: Left Tower (Residential) */}
          <g filter="url(#fog-glow)">
            {/* Left Tower Body */}
            <polygon points="56,76 74,68 74,136 56,136" fill="url(#fog-tower-fill)" />
            <polygon points="74,68 84,74 84,136 74,136" fill="url(#fog-tower-side)" />
            {/* Left Spire */}
            <polygon points="65,52 68,68 62,68" fill="url(#fog-gold-bright)" />
            {/* Left Windows */}
            <rect x="60" y="82" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="67" y="82" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="60" y="94" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="67" y="94" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="60" y="106" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="67" y="106" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="60" y="118" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="67" y="118" width="4" height="6" rx="1" fill="#0B1329" />

            {/* Right Tower Body */}
            <polygon points="116,74 126,68 144,76 144,136 116,136" fill="url(#fog-tower-side)" />
            <polygon points="126,68 144,76 144,136 126,136" fill="url(#fog-tower-fill)" />
            {/* Right Spire */}
            <polygon points="135,52 138,68 132,68" fill="url(#fog-gold-bright)" />
            {/* Right Windows */}
            <rect x="129" y="82" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="136" y="82" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="129" y="94" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="136" y="94" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="129" y="106" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="136" y="106" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="129" y="118" width="4" height="6" rx="1" fill="#0B1329" />
            <rect x="136" y="118" width="4" height="6" rx="1" fill="#0B1329" />

            {/* Center Main High-Rise Pinnacle Tower */}
            <polygon points="80,56 100,44 100,136 80,136" fill="url(#fog-tower-fill)" />
            <polygon points="100,44 120,56 120,136 100,136" fill="url(#fog-tower-side)" />
            {/* Center Pinnacle Needle / Spire */}
            <polygon points="100,28 103,44 97,44" fill="url(#fog-gold-bright)" />
            {/* Central Modern Grid Window Matrix */}
            <rect x="85" y="60" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="92" y="60" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="103" y="60" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="110" y="60" width="5" height="7" rx="1" fill="#0B1329" />

            <rect x="85" y="72" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="92" y="72" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="103" y="72" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="110" y="72" width="5" height="7" rx="1" fill="#0B1329" />

            <rect x="85" y="84" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="92" y="84" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="103" y="84" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="110" y="84" width="5" height="7" rx="1" fill="#0B1329" />

            <rect x="85" y="96" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="92" y="96" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="103" y="96" width="5" height="7" rx="1" fill="#0B1329" />
            <rect x="110" y="96" width="5" height="7" rx="1" fill="#0B1329" />
          </g>

          {/* Lower Security Seal Ribbon & Shield Foundation */}
          <path
            d="M44 136 L156 136 L146 158 C132 168 116 174 100 176 C84 174 68 168 54 158 Z"
            fill="#0F172A"
            stroke="url(#fog-gold-grad)"
            strokeWidth="2.5"
          />

          {/* Central Security Shield & Finger Of God Monogram / Star */}
          <path
            d="M100 142 L112 148 L112 160 C112 167 106 172 100 174 C94 172 88 167 88 160 L88 148 Z"
            fill="url(#fog-emerald-grad)"
            stroke="url(#fog-gold-bright)"
            strokeWidth="1.5"
          />
          {/* Security Star in Center */}
          <polygon
            points="100,149 102,154 107,154 103,157 105,162 100,159 95,162 97,157 93,154 98,154"
            fill="#FFF2A3"
          />

          {/* Corner Trim Accents */}
          <circle cx="100" cy="18" r="2" fill="url(#fog-gold-bright)" />
          <circle cx="28" cy="38" r="2" fill="url(#fog-gold-bright)" />
          <circle cx="172" cy="38" r="2" fill="url(#fog-gold-bright)" />
        </svg>
      </div>

      {/* Typography Section */}
      {variant !== 'icon-only' && (
        <div
          className={`${
            variant === 'stacked' || variant === 'seal'
              ? 'mt-2.5 items-center'
              : 'ml-3 items-start'
          } flex flex-col justify-center min-w-0`}
        >
          {/* Main Title */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-display font-black tracking-tight uppercase leading-tight ${iconDimensions.textMain} ${titleColor}`}
            >
              {estateName.replace(/Security Management/gi, '').trim() || 'Finger of God Estate'}
            </span>
          </div>

          {/* Subtitle / Department & Location Badge */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`font-mono font-bold tracking-wider uppercase text-[10px] sm:${iconDimensions.textSub} ${subtitleColor}`}
            >
              {subtitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstateLogo;
