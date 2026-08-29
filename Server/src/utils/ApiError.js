export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
  static badRequest(msg, details)   { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'Not authenticated')      { return new ApiError(401, msg); }
  static forbidden(msg = 'You do not have permission to perform this action') { return new ApiError(403, msg); }
  static notFound(msg = 'Resource not found')         { return new ApiError(404, msg); }
  static conflict(msg)              { return new ApiError(409, msg); }
}
