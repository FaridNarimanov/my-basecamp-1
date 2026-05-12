const express = require('express');
const profileController = require('../controllers/profileController');
const { requireLogin } = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');

const router = express.Router();

router.get('/profile', requireLogin, profileController.showProfile);
router.put('/profile', requireLogin, profileController.updateProfile);
router.post('/profile/picture', requireLogin, avatarUpload.single('avatar'), profileController.updateProfilePicture);

module.exports = router;
