import { ApiError } from '../utils/ApiError.js';

/** Validates req.body against a zod schema and replaces it with the parsed value. */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(body)',
      message: i.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  req.body = result.data;
  next();
};

/** Validates req.query against a zod schema. */
export const validateQuery = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(query)',
      message: i.message,
    }));
    return next(ApiError.badRequest('Invalid query parameters', details));
  }
  req.validatedQuery = result.data;
  next();
};
