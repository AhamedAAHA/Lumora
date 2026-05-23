import { Link } from 'react-router-dom';

const sizes = {
  sm: { mark: 'h-7 w-6', full: 'h-7', text: 'text-base' },
  md: { mark: 'h-8 w-7', full: 'h-8', text: 'text-lg' },
  lg: { mark: 'h-10 w-9', full: 'h-10', text: 'text-xl' },
};

/** Three-line Lumora mark (matches brand logo) */
export function LumoraMark({ className = 'h-8 w-7 text-white' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <line x1="5" y1="28" x2="13" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="11" y1="28" x2="19" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="17" y1="28" x2="25" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Lumora brand logo — diagonal line mark + wordmark.
 * Used site-wide: nav, auth, admin, candidate interview.
 */
export default function LumoraLogo({
  to = '/',
  className = '',
  showText = true,
  size = 'md',
  variant = 'full',
}) {
  const s = sizes[size] || sizes.md;

  const content =
    variant === 'mark' ? (
      <LumoraMark className={`${s.mark} shrink-0 text-white`} />
    ) : showText ? (
      <>
        <LumoraMark className={`${s.mark} shrink-0 text-white`} />
        <span className={`${s.text} font-semibold tracking-tight text-white`}>Lumora</span>
      </>
    ) : (
      <img
        src="/lumora-logo.png"
        alt="Lumora"
        className={`${s.full} w-auto shrink-0 object-contain object-left`}
      />
    );

  const wrapClass = `inline-flex items-center gap-3 ${className}`;

  if (to) {
    return (
      <Link to={to} className={wrapClass} aria-label="Lumora home">
        {content}
      </Link>
    );
  }

  return <div className={wrapClass}>{content}</div>;
}
