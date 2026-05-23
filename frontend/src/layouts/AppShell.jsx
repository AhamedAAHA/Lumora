import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, X, Sparkles, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import LumoraBackground from '../components/LumoraBackground';
import LumoraLogo from '../components/LumoraLogo';

const candidateNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const adminNav = [{ to: '/admin', label: 'Interviews', icon: Shield }];

export default function AppShell({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = user?.role === 'admin' ? adminNav : candidateNav;

  return (
    <LumoraBackground>
      <header className="page-fade sticky top-0 z-40 flex w-full items-center justify-between border-b border-white/[0.06] bg-[#030712]/88 px-4 py-4 backdrop-blur-md md:px-8">
        <LumoraLogo to="/" size="sm" />
        <nav className="hidden items-center gap-8 text-sm text-white/50 md:flex">
          {nav.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {actions}
          <button type="button" onClick={logout} className="btn-ghost hidden sm:inline-flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
          <button
            type="button"
            className="rounded-lg border border-white/10 p-2 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-0 px-2 pb-6 pt-4 md:gap-4 md:px-6">
        <aside className="hidden w-16 shrink-0 flex-col items-center gap-2 py-2 md:flex lg:w-20">
          <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
            <Sparkles className="h-5 w-5" />
          </span>
          {nav.map((item) => {
            const active = location.pathname === item.to.split('#')[0];
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] lg:w-16 ${
                  active ? 'sidebar-item-active' : 'text-white/40 hover:text-white/70'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </aside>

        <main className="page-fade flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {(title || subtitle) && (
            <div className="mb-4 shrink-0 px-2 md:px-0">
              <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
              {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 md:px-0">{children}</div>
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="glass-card mt-16 space-y-2 p-4" onClick={(e) => e.stopPropagation()}>
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="block rounded-lg px-4 py-3 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button type="button" className="w-full rounded-lg px-4 py-3 text-left text-red-400" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      )}
    </LumoraBackground>
  );
}
