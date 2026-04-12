const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const userController = require('../controllers/userController');
const { uploadAvatar } = require('../middleware/upload');

router.use(protect);

router.patch('/me', userController.updateProfile);
router.post('/me/avatar', (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}, userController.uploadAvatar);

module.exports = router;
