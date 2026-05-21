import { Link } from 'react-router-dom';

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="mountain-bg flex min-h-screen w-full flex-col overflow-x-hidden">
      <header className="flex w-full items-center justify-between px-4 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 flex-col justify-center gap-[3px] pl-1">
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
            <span className="block h-[2px] w-4 rotate-[-35deg] rounded bg-white" />
          </span>
          <span className="text-lg font-semibold">Lumora</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-white/50 sm:flex">
          <a href="/#features" className="hover:text-white">
            Product
          </a>
          <a href="/#platform" className="hover:text-white">
            Workflows
          </a>
          <a href="/#use-cases" className="hover:text-white">
            Security
          </a>
        </nav>
        <Link to="/register" className="btn-primary text-sm">
          Start Free
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="os-panel p-8">
            <div className="mb-6 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">
                L
              </span>
              <span className="font-semibold">Lumora OS</span>
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
