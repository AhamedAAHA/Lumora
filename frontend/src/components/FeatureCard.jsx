import { useRef } from 'react';

export default function FeatureCard({ icon: Icon, title, description, index = 0 }) {
  const cardRef = useRef(null);

  return (
    <article
      ref={cardRef}
      data-feature-card
      className="os-card group p-6 opacity-100 transition hover:border-white/20 md:p-8"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 text-indigo-300 ring-1 ring-white/10">
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/55">{description}</p>
    </article>
  );
}
