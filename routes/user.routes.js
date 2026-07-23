const express = require('express');
const { addUser, getUsers, getUser, updateUser, deleteUser, changePassword } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const { changePasswordSchema } = require('../validation/auth.validation');
const { addUserSchema, updateUserSchema, userIdSchema } = require('../validation/user.validation');

const router = express.Router();

router.use(protect);

router.post('/add', authorize('admin'), upload.single('avatar'), validate(addUserSchema), addUser);
router.post('/change-password', validate(changePasswordSchema), changePassword);
router.get('/all', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), validate(userIdSchema, 'params'), getUser);
router.patch('/:id', validate(userIdSchema, 'params'), upload.single('avatar'), validate(updateUserSchema), updateUser);
router.delete('/:id', authorize('admin'), validate(userIdSchema, 'params'), deleteUser);

module.exports = router;
