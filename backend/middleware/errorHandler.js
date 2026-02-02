// Centralized error handler (add to app.js as last middleware)
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  const statusCode = err.statusCode || 500;
  const response = {
    message: err.message || 'Internal Server Error',
  };

  // Only include stack in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err.errors; // For validation errors
  }

  // Handle specific error types
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.errors.map(e => e.message)
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'Duplicate entry',
      field: err.errors?.[0]?.path
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      message: 'Referenced record not found'
    });
  }

  res.status(statusCode).json(response);
};

export default errorHandler;