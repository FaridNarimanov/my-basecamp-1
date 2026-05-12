const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin/users', requireAdmin, adminController.listUsers);

module.exports = router;
