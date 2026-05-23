import { LogOut } from 'lucide-react';
import LumoraBackground from '../components/LumoraBackground';
import LumoraLogo from '../components/LumoraLogo';
import { clearPinAuth } from '../lib/pinApi';

export default function PinShell({ children, title, subtitle, actions }) {
  const exit = () => {
    clearPinAuth();
    window.location.href = '/pin';
  };

  return (
    <LumoraBackground>
      <header className="page-fade sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-[#030712]/85 px-4 py-4 backdrop-blur-md md:px-8">
        <LumoraLogo to="/pin" size="sm" />
        <div className="flex items-center gap-3">
          {actions}
          <button type="button" onClick={exit} className="btn-ghost inline-flex items-center gap-2 text-sm">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>
      <main className="page-fade mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        {(title || subtitle) && (
          <div className="mb-6 slide-up">
            {title && <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </LumoraBackground>
  );
}
