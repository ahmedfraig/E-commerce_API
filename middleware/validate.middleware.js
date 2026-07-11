const AppError = require('../utils/AppError');

const validate = (schema) => {
  return (req, res, next) => {
    // Guard: form-data can arrive as a non-object if Content-Type is mismatched
    if (!req.body || typeof req.body !== 'object') {
      req.body = {};
    }

    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new AppError(message, 400));
    }

    // Apply Joi's coerced value back to req.body
    // This converts form-data strings to correct types (e.g. "50" → 50, "true" → true)
    req.body = value;
    next();
  };
};

module.exports = validate;
