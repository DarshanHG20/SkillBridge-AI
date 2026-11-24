export function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error]', err.stack || err.message);
  }

  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 422;
    const details = Object.values(err.errors || {}).map(e => e.message).join('; ');
    message = details || 'Validation failed';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for parameter '${err.path || 'id'}'`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const dupFields = Object.keys(err.keyPattern || {}).join(', ');
    message = dupFields ? `Duplicate value for existing field(s): ${dupFields}` : 'Resource already exists';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON request payload';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'Uploaded file exceeds maximum allowed size limit';
  } else if (err.message && err.message.toLowerCase().includes('cors')) {
    statusCode = 403;
    message = err.message;
  }

  res.status(statusCode).json({
    detail: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ detail: `Route not found: ${req.method} ${req.originalUrl}` });
}

export default {
  errorHandler,
  notFoundHandler,
};
