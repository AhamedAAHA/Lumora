import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain,
  Link2,
  Cpu,
  ShieldCheck,
  Mic,
  BarChart3,
  Code2,
  Globe,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import UseCases from '../components/UseCases';
import { initFeatureCards, initScrollReveal, cleanupScrollTriggers } from '../lib/gsapAnimations';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Brain,
    title: 'Generative Interfaces',
    description:
      'Adaptive AI interview flows that evolve question difficulty in real time based on candidate performance.',
  },
  {
    icon: Link2,
    title: 'Connected Memory',
    description:
      'Resume-aware questioning with follow-ups, career coaching, and performance history across sessions.',
  },
  {
    icon: Cpu,
    title: 'Bring Your Own Model',
    description:
      'Plug in OpenAI, ElevenLabs voices, and personality modes — Friendly HR to Senior Engineer.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit & Rollback',
    description:
      'Anti-cheat monitoring, tab detection, full interview audit trail, and downloadable AI reports.',
  },
];

const platformFeatures = [
  { icon: Globe, label: 'Multilingual EN / TA / SI' },
  { icon: Mic, label: 'ElevenLabs Voice AI' },
  { icon: BarChart3, label: 'Live Confidence Analytics' },
  { icon: Code2, label: 'Coding Round + Evaluation' },
];

export default function LandingPage() {
  const featuresRef = useRef(null);
  const platformRef = useRef(null);

  useEffect(() => {
    const cards = featuresRef.current?.querySelectorAll('[data-feature-card]');
    initFeatureCards(cards);
    initScrollReveal(
      platformRef.current?.querySelectorAll('[data-platform-item]'),
      platformRef.current
    );
    return () => cleanupScrollTriggers();
  }, []);

  return (
    <div className="mountain-bg min-h-screen w-full overflow-x-hidden">
      <Navbar />
      <Hero />

      <section id="features" ref={featuresRef} className="relative w-full py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="pill-tag mb-4">Core Capabilities</p>
          <h2 className="max-w-3xl text-3xl font-bold md:text-4xl">
            Everything your hiring stack needs
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section id="platform" ref={platformRef} className="relative w-full py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="pill-tag mb-4">Integrations</p>
          <h2 className="text-3xl font-bold md:text-4xl">Works with your stack</h2>
          <ul className="mt-8 flex flex-wrap gap-2">
            {['Gmail', 'Stripe', 'Drive', 'Notion', 'Calendar', 'Tasks', 'Linear'].map((tag) => (
              <li key={tag} data-platform-item className="pill-tag">
                {tag}
              </li>
            ))}
          </ul>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {platformFeatures.map((p) => (
              <li
                key={p.label}
                data-platform-item
                className="os-card flex items-center gap-3 text-sm"
              >
                <p.icon className="h-5 w-5 text-white/50" />
                {p.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <UseCases />

      <footer className="w-full border-t border-white/[0.06] py-12 text-center text-sm text-white/35">
        <p>© {new Date().getFullYear()} Lumora OS. AI Interview Platform.</p>
      </footer>
    </div>
  );
}
