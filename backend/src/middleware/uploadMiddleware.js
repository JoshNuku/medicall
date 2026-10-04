const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../public/audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext || ext === '.') {
      if (file.mimetype === 'audio/webm') ext = '.webm';
      else if (file.mimetype === 'audio/wav' || file.mimetype === 'audio/x-wav') ext = '.wav';
      else if (file.mimetype === 'audio/ogg') ext = '.ogg';
      else if (file.mimetype === 'audio/mp4' || file.mimetype === 'audio/m4a' || file.mimetype === 'audio/x-m4a') ext = '.m4a';
      else ext = '.mp3';
    }
    const uniqueName = `recording_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

module.exports = upload;
