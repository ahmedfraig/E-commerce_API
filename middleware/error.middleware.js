const multer = require('multer');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!error.isOperational) {

    // Multer file upload errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        error = new AppError('File too large. Maximum allowed size is 5MB.', 400);
      } else if (err.code === 'LIMIT_FILE_COUNT') {
        error = new AppError('Too many files uploaded at once.', 400);
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        error = new AppError('Unexpected file field in the request.', 400);
      } else {
        error = new AppError(`File upload error: ${err.message}`, 400);
      }
    }

    else if (err.message === 'Not an image! Please upload only images.') {
      error = new AppError('Invalid file type. Please upload only image files (jpg, png, webp, etc.).', 400);
    }

    else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      error = new AppError('Invalid JSON format in request body. Please check your request syntax.', 400);
    }

    // Mongoose bad ObjectId
    else if (err.name === 'CastError') {
      error = new AppError(`Resource not found with id of ${err.value}`, 404);
    }

    // Mongoose duplicate key
    else if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      error = new AppError(`This ${field} is already taken`, 400);
    }

    // Mongoose validation error
    else if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error = new AppError(message, 400);
    }

    // JWT errors
    else if (err.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again.', 401);
    }

    else if (err.name === 'TokenExpiredError') {
      error = new AppError('Your token has expired. Please log in again.', 401);
    }

    else {
      logger.error('UNHANDLED ERROR', { message: err.message, stack: err.stack });
      error = new AppError('An unexpected error occurred. Please try again later.', 500);
    }
  }

  res.status(error.statusCode || 500).json({
    success: false,
    status: error.status || 'error',
    message: error.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;
