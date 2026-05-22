import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { clearPinAuth } from '../lib/pinApi';

export default function PinShell({ children, title, subtitle, actions }) {
  const exit = () => {
    clearPinAuth();
    window.location.href = '/pin';
  };

  return (
    <div className="mountain-bg flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-[#050506]/90 px-4 py-4 backdrop-blur-sm md:px-8">
        <Link to="/" className="text-lg font-semibold">
          Lumora
        </Link>
        <div className="flex items-center gap-3">
          {actions}
          <button type="button" onClick={exit} className="btn-ghost inline-flex items-center gap-2 text-sm">
            <LogOut className="h-4 w-4" />
            Exit
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
