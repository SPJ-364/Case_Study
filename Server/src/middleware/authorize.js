import { ApiError } from '../utils/ApiError.js';

/** Requires ALL of the listed permission codes. */
export const requirePermission = (...codes) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  const missing = codes.filter((c) => !req.user.permissions.includes(c));
  if (missing.length) {
    return next(ApiError.forbidden(`Missing permission: ${missing.join(', ')}`));
  }
  next();
};

/** Requires ANY of the listed permission codes. */
export const requireAnyPermission = (...codes) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!codes.some((c) => req.user.permissions.includes(c))) {
    return next(ApiError.forbidden(`Requires one of: ${codes.join(', ')}`));
  }
  next();
};

/** Restricts a route to specific role codes. */
export const requireRole = (...roleCodes) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roleCodes.includes(req.user.role.role_code)) {
    return next(ApiError.forbidden(`Restricted to: ${roleCodes.join(', ')}`));
  }
  next();
};
