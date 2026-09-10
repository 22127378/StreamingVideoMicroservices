/**
 * Shared Express Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (status === 500) {
    console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  }

  res.status(status).json({
    success: false,
    error: { message, ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }) }
  });
};

module.exports = errorHandler;
