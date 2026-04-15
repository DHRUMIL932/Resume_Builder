const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = `${req.user._id}-${Date.now()}${['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg'}`;
    cb(null, safe);
  }
});

function fileFilter(req, file, cb) {
  const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
}

const uploadAvatar = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter
});

const resumePhotoDir = path.join(__dirname, '..', 'uploads', 'resume-photos');
if (!fs.existsSync(resumePhotoDir)) {
  fs.mkdirSync(resumePhotoDir, { recursive: true });
}

const resumePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumePhotoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const rid = req.params.id || 'resume';
    cb(null, `${req.user._id}-${rid}-${Date.now()}${safeExt}`);
  }
});

const uploadResumePhoto = multer({
  storage: resumePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter
});

module.exports = { uploadAvatar, uploadResumePhoto, uploadDir, resumePhotoDir };
