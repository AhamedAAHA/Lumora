require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lumora';

function requireAdminCredentials() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || email === 'your-admin-email@example.com' || !password || password.startsWith('replace_with_')) {
    throw new Error('Set private ADMIN_EMAIL and ADMIN_PASSWORD values in backend/.env before seeding an admin.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  }
  return { email, password };
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const { email, password } = requireAdminCredentials();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.password = password;
    await existing.save();
    console.log('Admin account ready.');
  } else {
    await User.create({ name: 'Lumora Admin', email, password, role: 'admin' });
    console.log('Created admin account.');
  }
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
