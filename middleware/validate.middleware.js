const AppError = require('../utils/AppError');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    if (!req[source] || typeof req[source] !== 'object') {
      req[source] = {};
    }

    const { error, value } = schema.validate(req[source], { abortEarly: false });

    if (error) {
      const message = error.details.map(detail => detail.message.replace(/"/g, '')).join(', ');
      return next(new AppError(message, 400));
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;
