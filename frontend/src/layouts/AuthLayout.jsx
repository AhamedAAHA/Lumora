import { Link } from 'react-router-dom';
import LumoraBackground from '../components/LumoraBackground';
import LumoraLogo from '../components/LumoraLogo';

export default function AuthLayout({ children, title, subtitle, showCta = true }) {
  return (
    <LumoraBackground className="overflow-x-hidden">
      <header className="page-fade flex w-full items-center justify-between px-4 py-5 md:px-10">
        <LumoraLogo to="/" />
        {showCta && (
          <Link to="/pin" className="btn-secondary text-sm">
            Candidate PIN
          </Link>
        )}
      </header>

      <div className="slide-up flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="glass-card glow-border p-8">
            <div className="mb-6 flex justify-center border-b border-white/10 pb-6">
              <LumoraLogo to={null} size="xl" />
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </LumoraBackground>
  );
}
