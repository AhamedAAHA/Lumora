import { Link } from 'react-router-dom';

const iconSizes = {
  sm: 'h-9 w-auto',
  md: 'h-11 w-auto',
  lg: 'h-16 w-auto',
  xl: 'h-24 w-auto',
};

const wordmarkSizes = {
  sm: { title: 'text-sm', tag: 'text-[9px]' },
  md: { title: 'text-base', tag: 'text-[10px]' },
  lg: { title: 'text-xl', tag: 'text-xs' },
  xl: { title: 'text-2xl', tag: 'text-sm' },
};

const iconClass =
  'shrink-0 object-contain [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))]';

function BrandWordmark({ size = 'md', stacked = false, className = '' }) {
  const type = wordmarkSizes[size] || wordmarkSizes.md;

  return (
    <div
      className={`flex ${stacked ? 'flex-col items-center text-center' : 'flex-col justify-center'} ${className}`}
    >
      <span
        className={`font-bold leading-none tracking-[0.22em] text-white ${type.title}`}
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        LUMOR
        <span className="relative inline-block px-[0.02em]">
          A
          <span
            className="pointer-events-none absolute left-1/2 top-[38%] h-1 w-1 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.85)]"
            aria-hidden="true"
          />
        </span>
      </span>
      <span
        className={`mt-0.5 font-medium uppercase leading-tight tracking-[0.28em] text-cyan-300/95 ${type.tag} ${
          stacked ? 'mt-1.5' : ''
        }`}
      >
        AI Interviewer
      </span>
      <span
        className={`mt-1 h-px bg-gradient-to-r from-purple-500/80 via-cyan-400/70 to-purple-500/80 ${
          stacked ? 'w-28' : 'w-full max-w-[8.5rem]'
        }`}
        aria-hidden="true"
      />
    </div>
  );
}

function BrandIcon({ size = 'md', className = '' }) {
  const sizeClass = iconSizes[size] || iconSizes.md;
  return (
    <img
      src="/lumora-icon.png"
      alt=""
      className={`${sizeClass} ${iconClass} ${className}`}
      aria-hidden="true"
      decoding="async"
    />
  );
}

/** Wolf mark only */
export function LumoraMark({ className = 'h-8 w-auto' }) {
  return <BrandIcon size="sm" className={className} />;
}

/**
 * Lumora brand — wolf icon + readable LUMORA / AI Interviewer wordmark.
 * @param {'compact'|'full'|'auto'} variant — compact: horizontal nav; full: stacked hero
 */
export default function LumoraLogo({
  to = '/',
  className = '',
  size = 'md',
  variant = 'auto',
}) {
  const stacked = variant === 'full' || (variant === 'auto' && (size === 'lg' || size === 'xl'));
  const gap = stacked ? 'gap-3' : 'gap-2.5';

  const content = (
    <div className={`inline-flex items-center ${stacked ? 'flex-col' : 'flex-row'} ${gap} ${className}`}>
      <BrandIcon size={size} />
      <BrandWordmark size={size} stacked={stacked} />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex shrink-0" aria-label="Lumora home">
        {content}
      </Link>
    );
  }

  return <div className="inline-flex shrink-0">{content}</div>;
}
