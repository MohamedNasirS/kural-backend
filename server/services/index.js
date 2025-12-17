/**
 * Service Layer Index
 *
 * Exports all business logic services for use in route handlers.
 * Services decouple business logic from routes for better testability and maintainability.
 *
 * Usage:
 *   import { VoterService, UserService, BoothService, DashboardService } from '../services/index.js';
 *
 *   // In route handler:
 *   router.get('/voters/:acId', async (req, res) => {
 *     try {
 *       const result = await VoterService.getVotersByAC(req.params.acId, req.query);
 *       return res.json(result);
 *     } catch (error) {
 *       return res.status(error.status || 500).json({ message: error.message });
 *     }
 *   });
 */

// Core Services
export * as VoterService from './VoterService.js';
export * as UserService from './UserService.js';
export * as BoothService from './BoothService.js';
export * as DashboardService from './DashboardService.js';

// Re-export individual functions for convenience
export {
  // Voter operations
  getExistingFields,
  getAllVoterFields,
  createVoterField,
  renameVoterField,
  toggleFieldVisibility,
  updateVoterField,
  deleteVoterField,
  getVoterById,
  updateVoter,
  getVotersByAC,
  getBoothsByAC as getBoothsFromVoters,
} from './VoterService.js';

export {
  // User operations
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getBoothAgents,
  assignAgentToBooth,
  unassignAgentFromBooth,
  getUserStats,
  verifyCredentials,
} from './UserService.js';

export {
  // Booth operations
  getBooths,
  getBoothById,
  getBoothByNumber,
  createBooth,
  updateBooth as updateBoothRecord,
  deleteBooth,
  getBoothsByAC,
  getBoothStats,
  getBoothAgents as getAgentsForBooth,
  assignAgents,
  unassignAgents,
} from './BoothService.js';

export {
  // Dashboard/Analytics operations
  getDashboardStats,
  getRBACDashboardStats,
  getACOverview,
  getBoothPerformance,
  getDemographics,
  getBoothAgentActivities,
} from './DashboardService.js';

/**
 * Error handling helper for service errors
 * Use in route handlers to properly handle service-thrown errors
 */
export function handleServiceError(res, error) {
  const status = error.status || 500;
  const message = error.message || 'An error occurred';

  // Don't log 4xx errors as they are client errors
  if (status >= 500) {
    console.error('Service error:', error);
  }

  return res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && error.stack && { stack: error.stack })
  });
}
