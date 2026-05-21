const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

function isPdf(file) {
  const name = (file.originalname || '').toLowerCase();
  return (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/x-pdf' ||
    name.endsWith('.pdf')
  );
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (isPdf(file)) cb(null, true);
    else cb(new Error('Only PDF resumes allowed'));
  },
});

module.exports = upload;
