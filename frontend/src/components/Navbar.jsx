import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { initNavbarScroll } from '../lib/gsapAnimations';

const navLinks = [
  { label: 'Product', href: '#features' },
  { label: 'Workflows', href: '#platform' },
  { label: 'Security', href: '#use-cases' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const header = document.getElementById('main-nav');
    return initNavbarScroll(header, setScrolled);
  }, []);

  return (
    <header
      id="main-nav"
      className={`fixed top-0 z-50 w-full border-b border-white/[0.06] px-4 py-5 transition-all md:px-10 ${
        scrolled ? 'nav-scrolled' : ''
      }`}
      style={{ backgroundColor: scrolled ? undefined : 'rgba(5,5,6,0.7)' }}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 flex-col justify-center gap-[3px] pl-0.5">
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Lumora</span>
        </Link>

        <ul className="hidden items-center gap-10 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-white/50 transition hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <Link to="/login" className="text-sm text-white/60 hover:text-white">
            Admin
          </Link>
          <Link to="/pin" className="text-sm text-white/60 hover:text-white">
            Candidate PIN
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-[#0c0c0e]/95 p-4 md:hidden">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block py-2 text-white/80"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
            <Link to="/login" className="btn-secondary text-center text-sm" onClick={() => setOpen(false)}>
              Admin Portal
            </Link>
            <Link to="/pin" className="btn-secondary text-center text-sm" onClick={() => setOpen(false)}>
              Candidate PIN
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
