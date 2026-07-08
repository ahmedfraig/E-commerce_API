const express = require('express');
const { addUser, getUsers, getUser, updateUser, deleteUser, changePassword } = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const { changePasswordSchema, addUserSchema } = require('../validation/auth.validation');

const router = express.Router();

router.use(protect); // All user routes require authentication

router.post('/add', authorize('admin'), upload.single('avatar'), validate(addUserSchema), addUser);
router.post('/change-password', validate(changePasswordSchema), changePassword);
router.get('/all', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.patch('/:id', upload.single('avatar'), updateUser); // Authorized in controller
router.delete('/:id', authorize('admin'), deleteUser);

module.exports = router;
