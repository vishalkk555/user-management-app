const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { getMe, updateMe, uploadAvatar } = require('../controllers/userController');

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), uploadAvatar);

module.exports = router;