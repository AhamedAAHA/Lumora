import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import DashboardPreview from './DashboardPreview';
import { initHeroAnimation } from '../lib/gsapAnimations';

export default function Hero() {
  const sectionRef = useRef(null);
  const headlineRef = useRef(null);
  const subtitleRef = useRef(null);
  const ctasRef = useRef(null);
  const previewWrapRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      initHeroAnimation({
        headline: headlineRef.current,
        subtitle: subtitleRef.current,
        ctas: ctasRef.current,
        preview: previewWrapRef.current,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
    >
      <div className="relative mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mb-10 text-center md:mb-14">
          <p className="pill-tag mx-auto mb-4 w-fit">AI Interview Operating System</p>
          <h1
            ref={headlineRef}
            className="mx-auto max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight opacity-100 md:text-6xl lg:text-7xl"
          >
            <span className="gradient-text">The interview OS</span>
            <br />
            <span className="text-white/85">that thinks with you.</span>
          </h1>
          <p
            ref={subtitleRef}
            className="mx-auto mt-6 max-w-2xl text-base text-white/50 opacity-100 md:text-lg"
          >
            Adaptive AI interviews, multilingual voice, resume-aware questions, and a command
            center for hiring — all in one glass workspace.
          </p>
          <div ref={ctasRef} className="mt-8 flex flex-wrap justify-center gap-4 opacity-100">
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#platform" className="btn-secondary">
              See platform
            </a>
            <Link to="/login" className="btn-secondary">
              Admin Portal
            </Link>
            <Link to="/pin" className="btn-secondary">
              Candidate PIN
            </Link>
          </div>
        </div>

        <div ref={previewWrapRef} className="mx-auto w-full max-w-[1100px] opacity-100">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
