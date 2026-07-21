const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');
exports.addUser = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      if (req.file) fs.unlinkSync(req.file.path);
      return next(new AppError(MESSAGES.USER_ALREADY_EXISTS, 400));
    }

    const tempUser = new User({ ...req.body, isVerified: true });
    try {
      await tempUser.validate();
    } catch (validationError) {
      if (req.file) fs.unlinkSync(req.file.path);
      return next(validationError);
    }

    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ecommerce/users'
        });
        req.body.avatar = {
          public_id: result.public_id,
          url: result.secure_url
        };
      } finally {
        fs.unlinkSync(req.file.path);
      }
    }

    const userData = { ...req.body, isVerified: true, needsPasswordChange: true };
    const user = await User.create(userData);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, isverify, isVerified, page: pageQuery = 1, limit: limitQuery = 10 } = req.query;
    const page = parseInt(pageQuery, 10);
    const limit = Math.min(parseInt(limitQuery, 10), 100);
    const skip = (page - 1) * limit;

    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const verifyStatus = isverify !== undefined ? isverify : isVerified;
    if (verifyStatus !== undefined) {
      query.isVerified = verifyStatus === 'true' || verifyStatus === true;
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      },
      data: users
    });
  } catch (error) {
    next(error);
  }
};
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
exports.updateUser = async (req, res, next) => {
  try {
    if (Object.keys(req.body).length === 0 && !req.file) {
      return next(new AppError('No data provided to update', 400));
    }

    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return next(new AppError(MESSAGES.USER_NOT_AUTHORIZED, 403));
    }

    if (req.user.role === 'admin' && req.body.email) {
      const emailExists = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
      if (emailExists) {
        if (req.file) fs.unlinkSync(req.file.path);
        return next(new AppError(MESSAGES.USER_ALREADY_EXISTS, 400));
      }
    }

    if (req.file) {
      try {
        const existingUser = await User.findById(req.params.id);

        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ecommerce/users'
        });

        if (existingUser?.avatar?.public_id) {
          await cloudinary.uploader.destroy(existingUser.avatar.public_id);
        }

        req.body.avatar = {
          public_id: result.public_id,
          url: result.secure_url
        };
      } finally {
        fs.unlinkSync(req.file.path);
      }
    }

    if (req.body.password) {
      delete req.body.password;
    }

    let allowedUpdates = {};

    if (req.user.role === 'admin') {
      allowedUpdates = { ...req.body };
      delete allowedUpdates.role;
      delete allowedUpdates.isVerified;
    } else {
      allowedUpdates = {
        username: req.body.username,
        phone: req.body.phone,
        avatar: req.body.avatar,
        addresses: req.body.addresses
      };

      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key] === undefined) {
          delete allowedUpdates[key];
        }
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true
    });

    if (!user) return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user.id === req.params.id) {
      return next(new AppError(MESSAGES.USER_CANNOT_DELETE_SELF, 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));

    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    await User.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
      return next(new AppError(MESSAGES.SAME_PASSWORD, 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return next(new AppError(MESSAGES.USER_NOT_FOUND, 404));

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(new AppError(MESSAGES.INCORRECT_CURRENT_PASSWORD, 401));

    user.password = newPassword;
    user.needsPasswordChange = false;
    await user.save();

    res.status(200).json({ success: true, message: MESSAGES.PASSWORD_UPDATED });
  } catch (error) {
    next(error);
  }
};
