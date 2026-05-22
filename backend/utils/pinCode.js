const Interview = require('../models/Interview');

async function generateUniquePin() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0');
    const exists = await Interview.findOne({
      pinCode: pin,
      status: { $in: ['scheduled', 'active'] },
    });
    if (!exists) return pin;
  }
  throw new Error('Could not generate unique PIN. Try again.');
}

module.exports = { generateUniquePin };
