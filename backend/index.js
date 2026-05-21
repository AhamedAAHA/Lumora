require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'lumora_dev_secret_change_in_production';
  console.warn('JWT_SECRET not set — using development default');
}

const authRoutes = require('./routes/auth');
const interviewRoutes = require('./routes/interviews');
const resumeRoutes = require('./routes/resume');
const voiceRoutes = require('./routes/voice');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB().catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  console.error('Start MongoDB or set MONGODB_URI in backend/.env');
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

app.get('/api/health', (_, res) =>
  res.json({
    status: 'ok',
    service: 'Lumora OS API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
);

app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: 'Database unavailable. Start MongoDB and restart the backend server.',
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Lumora API running on http://localhost:${PORT}`);
});
