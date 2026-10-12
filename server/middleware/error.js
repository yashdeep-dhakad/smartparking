const { ZodError } = require('zod');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

exports.notFound = (req, res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  let details;

  if (err instanceof ZodError) {
    status = 400;
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    message = details.length ? `${details[0].field ? details[0].field + ': ' : ''}${details[0].message}` : 'Invalid input.';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = 'Invalid identifier.';
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyPattern || {}).join(', ') || 'unique field'}.`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body.';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (process.env.NODE_ENV === 'production') message = 'Internal server error.';
  }
  res.status(status).json({ message, ...(details && { errors: details }), ...(err.details && { details: err.details }) });
};
