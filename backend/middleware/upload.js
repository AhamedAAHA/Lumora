const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const ALLOWED_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function isAllowedCv(file) {
  const name = (file.originalname || '').toLowerCase();
  return (
    ALLOWED_TYPES.includes(file.mimetype) ||
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  );
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (isAllowedCv(file)) cb(null, true);
    else cb(new Error('Only PDF, DOC, or DOCX resumes allowed'));
  },
});

module.exports = upload;
