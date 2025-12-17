/**
 * Application Constants Configuration
 *
 * Centralizes all hard-coded values for easy configuration and maintenance.
 */

/**
 * Assembly Constituency Configuration
 */
export const AC_CONFIG = {
  // All active AC IDs
  activeACs: [101, 102, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126],
  // Excluded ACs (not in scope)
  excludedACs: [103, 104, 105, 106, 107],
  // Full range (for validation)
  minAC: 101,
  maxAC: 126
};

/**
 * Cache TTL Configuration (in milliseconds)
 */
export const CACHE_CONFIG = {
  // Very short cache - for rapidly changing data
  veryShort: 30 * 1000,           // 30 seconds
  // Short cache - for frequently updated data
  short: 60 * 1000,               // 1 minute
  // Medium cache - for moderately stable data
  medium: 5 * 60 * 1000,          // 5 minutes
  // Long cache - for stable data
  long: 15 * 60 * 1000,           // 15 minutes
  // Very long cache - for rarely changing data
  veryLong: 30 * 60 * 1000,       // 30 minutes
  // Dashboard stats cache
  dashboardStats: 5 * 60 * 1000,  // 5 minutes
  // Survey forms cache
  surveyForms: 10 * 60 * 1000,    // 10 minutes
  // Precomputed stats max age
  precomputedStats: 10 * 60 * 1000 // 10 minutes
};

/**
 * Rate Limiting Configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Login endpoint
  login: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts per window
    message: 'Too many login attempts, please try again later.'
  },
  // General write operations (create, update, delete)
  write: {
    windowMs: 60 * 1000,       // 1 minute
    max: 30,                   // 30 operations per minute
    message: 'Too many requests, please slow down.'
  },
  // Heavy aggregation endpoints
  aggregation: {
    windowMs: 60 * 1000,       // 1 minute
    max: 10,                   // 10 queries per minute
    message: 'Too many aggregation requests, please wait.'
  },
  // Export endpoints
  export: {
    windowMs: 60 * 1000,       // 1 minute
    max: 5,                    // 5 exports per minute
    message: 'Too many export requests, please wait.'
  }
};

/**
 * Pagination Configuration
 */
export const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1
};

/**
 * User Role Configuration
 */
export const ROLE_CONFIG = {
  // Role hierarchy (higher number = more privileges)
  hierarchy: {
    BoothAgent: 1,
    MLA: 2,
    L2: 3,    // ACI - AC In-charge
    L1: 4,    // ACIM - AC In-charge Manager
    L0: 5     // Super Admin
  },
  // Roles with full AC access
  fullACAccess: ['L0', 'L1'],
  // Roles that can manage users
  canManageUsers: ['L0'],
  // Roles that can manage booths
  canManageBooths: ['L0', 'L1', 'L2'],
  // Roles that can manage agents
  canManageAgents: ['L0', 'L1', 'L2'],
  // Roles that can view MLA dashboard
  canViewMLADashboard: ['L0', 'L1', 'MLA'],
  // All valid roles
  validRoles: ['L0', 'L1', 'L2', 'MLA', 'BoothAgent']
};

/**
 * Party Configuration
 */
export const PARTY_CONFIG = {
  // Main parties
  mainParties: ['DMK', 'AIADMK'],
  // All parties (for analytics)
  allParties: ['DMK', 'AIADMK', 'BJP', 'INC', 'PMK', 'MDMK', 'VCK', 'Others'],
  // Default party colors for charts
  partyColors: {
    DMK: '#e11d48',
    AIADMK: '#4ade80',
    BJP: '#f97316',
    INC: '#3b82f6',
    PMK: '#fbbf24',
    MDMK: '#8b5cf6',
    VCK: '#06b6d4',
    Others: '#9ca3af'
  }
};

/**
 * Date/Time Configuration
 */
export const DATE_CONFIG = {
  monthLabels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  // Default bucket counts for analytics
  defaultMonthBuckets: 5,
  defaultWeekBuckets: 6,
  defaultDayBuckets: 7
};

/**
 * Validation Configuration
 */
export const VALIDATION_CONFIG = {
  // Password requirements
  password: {
    minLength: 6,
    maxLength: 128,
    requireUppercase: false,
    requireLowercase: false,
    requireNumber: false,
    requireSpecial: false
  },
  // Phone number format
  phone: {
    pattern: /^[6-9]\d{9}$/,
    length: 10
  },
  // Email format
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  // Name constraints
  name: {
    minLength: 2,
    maxLength: 100
  }
};

/**
 * API Response Messages
 */
export const MESSAGES = {
  // Success messages
  success: {
    created: 'Resource created successfully',
    updated: 'Resource updated successfully',
    deleted: 'Resource deleted successfully',
    fetched: 'Data retrieved successfully'
  },
  // Error messages
  error: {
    notFound: 'Resource not found',
    unauthorized: 'Authentication required',
    forbidden: 'Access denied',
    badRequest: 'Invalid request',
    serverError: 'Internal server error',
    validation: 'Validation failed',
    duplicate: 'Resource already exists'
  },
  // Auth messages
  auth: {
    loginSuccess: 'Login successful',
    logoutSuccess: 'Logout successful',
    invalidCredentials: 'Invalid email/phone or password',
    accountInactive: 'Account is inactive',
    sessionExpired: 'Session expired, please login again'
  }
};

export default {
  AC_CONFIG,
  CACHE_CONFIG,
  RATE_LIMIT_CONFIG,
  PAGINATION_CONFIG,
  ROLE_CONFIG,
  PARTY_CONFIG,
  DATE_CONFIG,
  VALIDATION_CONFIG,
  MESSAGES
};
