# Lumora OS — AI Interview Platform

> **Project layout:** All app code lives in `frontend/` and `backend/`. If you still see old `client/` or `server/` folders, stop any running dev servers and delete them manually.

Production-style AI-powered interview platform with adaptive questioning, multilingual support (English, Tamil, Sinhala), ElevenLabs voice personalities, resume-based questions, real-time confidence analytics, anti-cheat, coding rounds, and admin analytics.

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | React 19, Vite, Tailwind CSS, GSAP, Lenis, Recharts, Monaco Editor |
| Backend | Node.js, Express, MongoDB, JWT, OpenAI, ElevenLabs |
| Security | bcrypt password hashing, JWT auth, Helmet, rate limiting |

## Project Structure

```
Lumora/
├── frontend/               # React + Vite frontend
│   └── src/
│       ├── components/     # Landing UI (Navbar, Hero, FeatureCard, etc.)
│       ├── pages/          # App pages (dashboard, interview, auth)
│       ├── hooks/          # Anti-cheat, confidence analysis
│       └── lib/            # API client, GSAP animations
├── backend/                # Express REST API
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   └── services/           # AI, ElevenLabs, resume parser
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+
- MongoDB running locally or MongoDB Atlas URI

### 1. Install dependencies

```bash
cd Lumora
npm install
npm run install:all
```

Or install separately:

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Environment variables

**Backend** — copy and edit:

```bash
cd backend
copy .env.example .env
```

Set at minimum:

- `MONGODB_URI`
- `JWT_SECRET`
- `OPENAI_API_KEY` (optional — fallbacks work without it)
- `ELEVENLABS_API_KEY` (optional — voice disabled without it)

**Frontend** (optional):

```bash
cd frontend
copy .env.example .env
```

### 3. Start development

**Terminal 1 — API:**

```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
```

Or from root (after `npm install` for concurrently):

```bash
npm run dev
```

- Landing & app: http://localhost:5173
- API: http://localhost:5000

## Features Implemented

1. **Multilingual** — EN / TA / SI language selection; AI prompts localized
2. **Adaptive interviews** — Difficulty adjusts from answer scores
3. **Personality modes** — 5 interviewer personas + ElevenLabs voice mapping
4. **Resume-based questions** — PDF upload → skill/project extraction
5. **Confidence analysis** — Fillers, WPM, hesitation → live scores
6. **AI career coach** — Post-interview roadmap and tips
7. **Recommendation engine** — selected / shortlisted / needs improvement / rejected
8. **Anti-cheat** — Tab switch, copy/paste block, inactivity warnings
9. **Live analytics** — Confidence meter, charts, progress
10. **Coding round** — Monaco editor + AI evaluation
11. **Multi-round** — HR, aptitude, technical, final
12. **Follow-up questions** — Triggered when answers are incomplete
13. **Conversational flow** — AI comments between questions
14. **Candidate history** — Scores, trends, strengths/weaknesses
15. **Admin analytics** — Performance, fail rates, top candidates
16. **PDF reports** — Downloadable interview summary
17. **Modern UI** — Dark luxury theme, glassmorphism, GSAP animations
18. **AI avatar** — Animated interviewer on interview screen
19. **Notifications** — Scheduled, result, completion alerts
20. **Scalable structure** — Modular routes, services, components

## Landing Page (Lumora OS)

Premium dark landing with:

- GSAP hero fade-up, scroll reveals, parallax dashboard
- Lenis smooth scroll + ScrollTrigger
- Glassmorphism cards, pill tags, fake dashboard widgets
- Components: `Navbar`, `Hero`, `FeatureCard`, `DashboardPreview`, `UseCases`

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register candidate/admin |
| POST | `/api/auth/login` | Login |
| POST | `/api/interviews/start` | Start interview session |
| POST | `/api/interviews/:id/answer` | Submit answer + get next question |
| POST | `/api/resume/parse` | Upload PDF resume |
| POST | `/api/voice/speak` | ElevenLabs TTS |
| GET | `/api/analytics/admin` | Admin dashboard stats |
| GET | `/api/reports/:id` | Interview report |

## Production Build

```bash
cd frontend && npm run build
cd backend && npm start
```

Serve `frontend/dist` via CDN or reverse proxy; point API to your deployed server and set `VITE_API_URL`.

## License

MIT — Built for Lumora AI Interviewer project.
