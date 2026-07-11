const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');
const { MESSAGES } = require('../utils/constants');

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError(MESSAGES.NOT_AUTHORIZED, 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // Enforce forced password change
    if (req.user.needsPasswordChange) {
      const allowedPaths = ['/change-password', '/logout'];
      const isAllowed = allowedPaths.some(path => req.originalUrl.includes(path));
      
      if (!isAllowed) {
        return next(new AppError(MESSAGES.FORCE_PASSWORD_CHANGE, 403));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};
