const express = require('express');
const userController = require('../controllers/userController');
const { validateUser } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', userController.list);
router.post('/', validateUser, userController.create);
router.get('/me', requireAuth, userController.me);
router.get('/:id', userController.getById);

module.exports = router;
