const AppError = require('../utils/AppError');

const validate = (schema) => {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const message = error.details.map(detail => detail.message.replace(/"/g, '')).join(', ');
      return next(new AppError(message, 400));
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
