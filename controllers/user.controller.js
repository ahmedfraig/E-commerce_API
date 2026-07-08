const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Add a new user (Admin)
// @route   POST /users/add
exports.addUser = async (req, res, next) => {
  try {
    // Handle avatar upload to Cloudinary
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

    const userData = { ...req.body, isVerified: true };
    const user = await User.create(userData);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin)
// @route   GET /users/all
exports.getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).lean(),
      User.countDocuments()
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

// @desc    Get a single user by ID (Admin)
// @route   GET /users/:id
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user data (User)
// @route   PATCH /users/:id
exports.updateUser = async (req, res, next) => {
  try {
    // Only allow user to update their own profile, or allow admin to update any profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    // Handle avatar upload to Cloudinary
    if (req.file) {
      try {
        // Delete old avatar from Cloudinary (if it exists)
        const existingUser = await User.findById(req.params.id);
        if (existingUser?.avatar?.public_id) {
          await cloudinary.uploader.destroy(existingUser.avatar.public_id);
        }

        // Upload new avatar
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

    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    let allowedUpdates = {};

    if (req.user.role === 'admin') {
      allowedUpdates = { ...req.body };
      delete allowedUpdates.role; // Role updates should use the dedicated change-role endpoint
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

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Admin)
// @route   DELETE /users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up avatar from Cloudinary
    if (user.avatar?.public_id) {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    }

    await User.deleteOne({ _id: req.params.id });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   POST /users/change-password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password explicitly selected
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current password' });
    }

    // Save new password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user role (Admin)
// @route   PATCH /users/:id/role
exports.changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    
    // Check if user exists
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent changing your own role to avoid locking out the only admin
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
