# Lumora AI Interviewer

Professional AI-powered interview platform with **PIN-based candidate access**, admin-scheduled interviews, custom questions, CV analysis, personalized AI questions, ElevenLabs voice, and full evaluation reports.

**Use only one URL in the browser:** http://localhost:5173

- **Admin UI:** http://localhost:5173/login → http://localhost:5173/admin  
- **Candidate PIN:** http://localhost:5173/pin (same React UI as the rest of the app)

### Demo data

```bash
npm run seed:demo
```

Demo access values are generated or configured locally through `backend/.env`; do not publish them.

## Tech Stack

| Layer | Stack |
|-------|--------|
| App (UI) | React 19 + Vite + HTML/CSS/JS interview pages — **port 5173** |
| API | Node.js, Express, MongoDB — runs in background, proxied through 5173 |
| Security | bcrypt, JWT, Helmet, rate limiting |

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally or Atlas URI

### 1. Install

```bash
cd Lumora
npm run install:all
```

### 2. Environment

```bash
cd backend
copy .env.example .env
```

Set at minimum:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/lumora
JWT_SECRET=replace_with_a_long_random_secret
SERVER_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
```

Optional: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`

### 3. Seed admin

```bash
cd backend
npm run seed:admin
```

<<<<<<< HEAD
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env` before running the seed command. Use a unique production password.

=======
>>>>>>> f894758bd757597925ba5af5ed0f5bc05a567ac1
### 4. Run (single command)

From project root:

```bash
npm run dev
```

This starts **everything** on **http://localhost:5173** (API is auto-started and proxied — do not open port 5000).

| Page | URL |
|------|-----|
| Landing | http://localhost:5173/ |
| Admin login | http://localhost:5173/admin-login.html |
| Admin dashboard | http://localhost:5173/admin-dashboard.html |
| Candidate PIN | http://localhost:5173/candidate-pin-login.html |

## Workflows

**Admin:** Login → Dashboard → Create interview → Add questions → Generate PIN → Share with candidate → View report

**Candidate:** PIN login → Upload CV → AI questions → Interview → Complete

## Testing

See [TESTING.md](TESTING.md) for the full end-to-end checklist.

## License

MIT
