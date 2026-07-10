const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in headers or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      return res.status(401).json({ message: 'The user belonging to this token does no longer exist.' });
    }

    // Enforce forced password change
    if (req.user.needsPasswordChange) {
      const allowedPaths = ['/change-password', '/logout'];
      const isAllowed = allowedPaths.some(path => req.originalUrl.includes(path));
      
      if (!isAllowed) {
        return res.status(403).json({ 
          message: 'You must change your password.',
          forcePasswordChange: true
        });
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
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};
