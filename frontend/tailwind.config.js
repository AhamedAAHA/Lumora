/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lumora: {
          black: '#030712',
          navy: '#0b1224',
          charcoal: '#0e1528',
          surface: '#121a2e',
          border: 'rgba(255,255,255,0.08)',
          glow: '#6366f1',
          accent: '#8b5cf6',
          cyan: '#22d3ee',
        },
      },
      fontFamily: {
        display: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        tamil: ['"Noto Sans Tamil"', 'Inter', 'system-ui', 'sans-serif'],
        sinhala: ['"Noto Sans Sinhala"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        glow: '0 0 60px rgba(99,102,241,0.25)',
        neon: '0 0 24px rgba(34,211,238,0.25)',
      },
      animation: {
        float: 'float-orb 7s ease-in-out infinite',
        pulseGlow: 'glow-pulse 3s ease-in-out infinite',
        pageFade: 'page-fade-in 0.55s ease-out both',
        slideUp: 'slide-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};
