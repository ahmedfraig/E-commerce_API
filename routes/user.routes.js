const express = require('express');
const { addUser, getUsers, getUser, updateUser, deleteUser } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(protect); // All user routes require authentication

router.post('/add', authorize('admin'), addUser);
router.get('/all', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.patch('/:id', updateUser); // Authorized in controller
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
