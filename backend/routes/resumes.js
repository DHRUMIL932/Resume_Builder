const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { uploadResumePhoto } = require('../middleware/upload');
const resumeController = require('../controllers/resumeController');

router.use(protect);

router.get('/', resumeController.getResumes);
router.post('/', resumeController.createResume);

router.post(
  '/:id/photo',
  (req, res, next) => {
    uploadResumePhoto.single('photo')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      }
      next();
    });
  },
  resumeController.uploadResumePhoto
);

router.get('/:id/pdf', resumeController.downloadPdf);
router.get('/:id', resumeController.getResume);
router.put('/:id', resumeController.updateResume);
router.delete('/:id', resumeController.deleteResume);

module.exports = router;
