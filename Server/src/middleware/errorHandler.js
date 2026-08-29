import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || 500;

  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    success: false,
    error: {
      message: status >= 500 && env.nodeEnv === 'production'
        ? 'Internal server error'
        : err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(env.nodeEnv !== 'production' && status >= 500 ? { stack: err.stack } : {}),
    },
  });
};
