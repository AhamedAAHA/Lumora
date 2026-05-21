import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Hero fade-up — fromTo avoids invisible state after StrictMode cleanup */
export function initHeroAnimation(refs) {
  if (prefersReducedMotion()) return null;
  const { headline, subtitle, ctas, preview } = refs;
  const targets = [headline, subtitle, ctas, preview].filter(Boolean);
  if (!targets.length) return null;

  gsap.set(targets, { opacity: 1, y: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  targets.forEach((el, i) => {
    tl.fromTo(
      el,
      { y: 32 + i * 4, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55 + i * 0.05 },
      i === 0 ? 0 : '-=0.35'
    );
  });

  return tl;
}

/** Feature cards reveal once on scroll */
export function initFeatureCards(cards) {
  if (prefersReducedMotion() || !cards?.length) return;
  gsap.set(cards, { opacity: 1, y: 0 });
  gsap.fromTo(
    cards,
    { y: 24, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: cards[0]?.parentElement,
        start: 'top 90%',
        once: true,
      },
    }
  );
}

/** Generic scroll reveal — fires once */
export function initScrollReveal(elements, trigger) {
  if (prefersReducedMotion() || !elements?.length || !trigger) return;
  gsap.set(elements, { opacity: 1, y: 0 });
  gsap.fromTo(
    elements,
    { y: 20, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.5,
      stagger: 0.06,
      ease: 'power2.out',
      scrollTrigger: { trigger, start: 'top 92%', once: true },
    }
  );
}

/** Lightweight navbar: toggle CSS class (no GSAP per frame) */
export function initNavbarScroll(navEl, onScrolled) {
  if (!navEl) return () => {};

  let ticking = false;
  let lastScrolled = null;

  const update = () => {
    const scrolled = window.scrollY > 64;
    if (scrolled !== lastScrolled) {
      lastScrolled = scrolled;
      onScrolled?.(scrolled);
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();

  return () => window.removeEventListener('scroll', onScroll);
}

export function cleanupScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
