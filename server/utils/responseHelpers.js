/**
 * Standardized API Response Helpers
 *
 * Provides consistent response format across all API endpoints:
 *
 * Success: { success: true, data: any, message?: string }
 * Error: { success: false, message: string, error?: string (dev only) }
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Patterns that indicate sensitive information in error messages
 */
const SENSITIVE_PATTERNS = [
  /mongodb(\+srv)?:\/\/[^\s]+/gi,  // MongoDB connection strings
  /password[=:][^\s]+/gi,          // Password leaks
  /api[_-]?key[=:][^\s]+/gi,       // API keys
  /secret[=:][^\s]+/gi,            // Secrets
  /token[=:][^\s]+/gi,             // Tokens
  /\/[\w-]+\/[\w-]+\/node_modules/gi, // File paths
  /at\s+[\w.]+\s+\([^)]+\)/g,      // Stack traces
  /Error:\s+.+\n\s+at/g,           // Error stack traces
];

/**
 * Sanitize error message for production
 * Removes sensitive information that could be exploited
 * @param {Error|string} error - Error object or message
 * @returns {string} - Safe error message
 */
export const sanitizeErrorMessage = (error) => {
  if (!error) return 'An error occurred';

  let message = error instanceof Error ? error.message : String(error);

  // In development, return full message
  if (isDevelopment) {
    return message;
  }

  // In production, sanitize sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, '[REDACTED]');
  }

  // Truncate very long messages
  if (message.length > 200) {
    message = message.substring(0, 200) + '...';
  }

  return message;
};

/**
 * Send a successful response
 * @param {Response} res - Express response object
 * @param {any} data - Response data
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
export const sendSuccess = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 * @param {Response} res - Express response object
 * @param {any} data - Created resource
 * @param {string} [message] - Optional success message
 */
export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {string} message - User-friendly error message
 * @param {number} [statusCode=500] - HTTP status code
 * @param {Error|string} [error] - Error object or message (dev only)
 */
export const sendError = (res, message, statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };

  // Include error details only in development (sanitized in production)
  if (error) {
    if (isDevelopment) {
      response.error = error instanceof Error ? error.message : error;
      if (error instanceof Error && error.stack) {
        response.stack = error.stack;
      }
    } else {
      // In production, only include sanitized error for debugging
      // but keep user-facing message generic
      response.error = sanitizeErrorMessage(error);
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a 400 Bad Request response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Error|string} [error] - Error details
 */
export const sendBadRequest = (res, message, error = null) => {
  return sendError(res, message, 400, error);
};

/**
 * Send a 401 Unauthorized response
 * @param {Response} res - Express response object
 * @param {string} [message='Authentication required'] - Error message
 */
export const sendUnauthorized = (res, message = 'Authentication required') => {
  return sendError(res, message, 401);
};

/**
 * Send a 403 Forbidden response
 * @param {Response} res - Express response object
 * @param {string} [message='Access denied'] - Error message
 */
export const sendForbidden = (res, message = 'Access denied') => {
  return sendError(res, message, 403);
};

/**
 * Send a 404 Not Found response
 * @param {Response} res - Express response object
 * @param {string} [message='Resource not found'] - Error message
 */
export const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

/**
 * Send a 409 Conflict response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 */
export const sendConflict = (res, message) => {
  return sendError(res, message, 409);
};

/**
 * Send a 500 Internal Server Error response
 * @param {Response} res - Express response object
 * @param {string} [message='Internal server error'] - Error message
 * @param {Error|string} [error] - Error details
 */
export const sendServerError = (res, message = 'Internal server error', error = null) => {
  return sendError(res, message, 500, error);
};

/**
 * Send a paginated response
 * @param {Response} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.total - Total item count
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {string} [message] - Optional message
 */
export const sendPaginated = (res, data, pagination, message = null) => {
  const { total, page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  const response = {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };

  if (message) {
    response.message = message;
  }

  return res.status(200).json(response);
};

/**
 * Async route handler wrapper for consistent error handling
 * @param {Function} fn - Async route handler function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Route handler error:', error);
      sendServerError(res, 'An unexpected error occurred', error);
    });
  };
};

export default {
  sendSuccess,
  sendCreated,
  sendError,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendServerError,
  sendPaginated,
  asyncHandler,
  sanitizeErrorMessage
};
