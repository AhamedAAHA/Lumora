import { useEffect, useRef } from 'react';
import { Building2, GraduationCap, Rocket, Users } from 'lucide-react';
import { initScrollReveal } from '../lib/gsapAnimations';

const cases = [
  {
    icon: Building2,
    title: 'Enterprise Hiring',
    desc: 'Multi-round HR + technical interviews with anti-cheat and admin analytics.',
  },
  {
    icon: Rocket,
    title: 'Startup Screening',
    desc: 'Founder-mode AI personality with fast shortlisting and confidence scoring.',
  },
  {
    icon: GraduationCap,
    title: 'Campus Placements',
    desc: 'Aptitude + technical rounds with downloadable AI reports for recruiters.',
  },
  {
    icon: Users,
    title: 'Remote Teams',
    desc: 'Multilingual voice interviews in English, Tamil, and Sinhala.',
  },
];

export default function UseCases() {
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    initScrollReveal(cardsRef.current.filter(Boolean), sectionRef.current);
  }, []);

  return (
    <section id="use-cases" ref={sectionRef} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <p className="pill-tag mb-4">Use Cases</p>
        <h2 className="max-w-2xl text-3xl font-bold md:text-5xl">
          Built for every hiring workflow
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((c, i) => (
            <div
              key={c.title}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              className="os-card p-6"
            >
              <c.icon className="mb-4 h-8 w-8 text-indigo-400" />
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-white/55">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
