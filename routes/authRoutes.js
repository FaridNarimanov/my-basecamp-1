const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/sessions', authController.createSession);
router.delete('/sessions', authController.deleteSession);

module.exports = router;
