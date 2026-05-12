const express = require('express');
const userController = require('../controllers/userController');
const adminController = require('../controllers/adminController');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/users', userController.createUser);
router.get('/api/me', requireLogin, userController.getCurrentUser);
router.get('/users/:id', requireLogin, userController.showUser);
router.delete('/users/:id', requireLogin, userController.destroyUser);
router.patch('/users/:id/admin', requireAdmin, adminController.makeAdmin);
router.delete('/users/:id/admin', requireAdmin, adminController.removeAdmin);
router.get('/api/users/:username', requireLogin, userController.getUserByUsername);

module.exports = router;
