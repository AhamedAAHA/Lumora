import { Link } from 'react-router-dom';

const sizes = {
  sm: 'h-9 max-w-[4.5rem]',
  md: 'h-11 max-w-[5.5rem]',
  lg: 'h-20 max-w-[10rem]',
  xl: 'h-28 max-w-[14rem]',
};

const logoClass =
  'shrink-0 object-contain object-left [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.35))]';

/** Compact Lumora logo image (icon + wordmark) */
export function LumoraMark({ className = 'h-8 w-auto' }) {
  return (
    <img
      src="/lumora-logo.png"
      alt=""
      className={`${className} w-auto ${logoClass}`}
      aria-hidden="true"
      decoding="async"
    />
  );
}

/**
 * Lumora brand logo — full mark with wolf icon and wordmark.
 * Used site-wide: nav, auth, admin, candidate interview.
 */
export default function LumoraLogo({ to = '/', className = '', size = 'md' }) {
  const sizeClass = sizes[size] || sizes.md;

  const content = (
    <img
      src="/lumora-logo.png"
      alt="Lumora AI Interviewer"
      className={`${sizeClass} w-auto ${logoClass}`}
      decoding="async"
    />
  );

  const wrapClass = `inline-flex items-center ${className}`;

  if (to) {
    return (
      <Link to={to} className={wrapClass} aria-label="Lumora home">
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
