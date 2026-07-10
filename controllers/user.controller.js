const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');

// @desc    Add a new user (Admin)
// @route   POST /users/add
exports.addUser = async (req, res, next) => {
  try {
    // Check if email already exists before uploading image
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Validate user data BEFORE uploading to Cloudinary
    const tempUser = new User({ ...req.body, isVerified: true });
    try {
      await tempUser.validate();
    } catch (validationError) {
      if (req.file) fs.unlinkSync(req.file.path);
      return next(validationError);
    }

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
    const { search, page: pageQuery = 1, limit: limitQuery = 10 } = req.query;
    const page = parseInt(pageQuery, 10);
    const limit = Math.min(parseInt(limitQuery, 10), 100);
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).lean(),
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
    // Check if any data was provided
    if (Object.keys(req.body).length === 0 && !req.file) {
      return res.status(400).json({ message: 'No data provided to update' });
    }

    // Only allow user to update their own profile, or allow admin to update any profile
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to update this user' });
    }
    
    // Check if new email already exists (for admin updates)
    if (req.user.role === 'admin' && req.body.email) {
      const emailExists = await User.findOne({ email: req.body.email, _id: { $ne: req.params.id } });
      if (emailExists) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    // Handle avatar upload to Cloudinary
    if (req.file) {
      try {
        const existingUser = await User.findById(req.params.id);

        // Upload new avatar FIRST
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'ecommerce/users'
        });

        // If upload is successful, delete old avatar from Cloudinary (if it exists)
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

    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    let allowedUpdates = {};

    if (req.user.role === 'admin') {
      allowedUpdates = { ...req.body };
      delete allowedUpdates.role;       // Use dedicated change-role endpoint
      delete allowedUpdates.isVerified; // Prevent accidentally changing verification status
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
    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

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

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password' });
    }

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

