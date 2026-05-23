/** Lightweight animated backdrop — CSS-only, no canvas/WebGL */
export default function LumoraBackground({ children, className = '' }) {
  return (
    <div className={`lumora-bg relative flex min-h-screen w-full flex-col ${className}`}>
      <div className="lumora-bg__orb floating-orb" aria-hidden="true" />
      <div className="lumora-bg__particles particle-bg" aria-hidden="true" />
      <div className="lumora-bg__veil" aria-hidden="true" />
      <div className="relative z-[1] flex min-h-screen w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
