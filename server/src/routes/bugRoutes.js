const express = require('express');
const bugController = require('../controllers/bugController');
const { validateBug, validateAssignment } = require('../middleware/validate');

const router = express.Router();

router.get('/', bugController.list);
router.post('/', validateBug, bugController.create);
router.get('/:id', bugController.getById);
router.patch('/:id', bugController.update);
router.patch('/:id/assign', validateAssignment, bugController.assign);
router.delete('/:id', bugController.remove);
router.get('/:id/comments', bugController.listComments);
router.post('/:id/comments', bugController.addComment);

module.exports = router;
