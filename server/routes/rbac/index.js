/**
 * RBAC Routes - Modular Structure
 *
 * This module combines all RBAC routes into a single router for backward compatibility.
 * The routes have been split from the monolithic rbac.js (2700+ lines) into focused modules:
 *
 * Route Files:
 * - users.routes.js     - User management (GET/POST/PUT/DELETE /users)
 * - booths.routes.js    - Booth operations (GET/POST/PUT/DELETE /booths)
 * - agents.routes.js    - Booth agent management (/booth-agents)
 * - analytics.routes.js - Dashboard statistics (/dashboard)
 * - helpers.js          - Shared helper functions
 *
 * Migration Status:
 * - helpers.js: COMPLETE
 * - users.routes.js: COMPLETE
 * - booths.routes.js: COMPLETE
 * - agents.routes.js: COMPLETE
 * - analytics.routes.js: COMPLETE
 */

import express from "express";
import usersRouter from "./users.routes.js";
import boothsRouter from "./booths.routes.js";
import agentsRouter from "./agents.routes.js";
import analyticsRouter from "./analytics.routes.js";

const router = express.Router();

// Mount route modules at their respective paths
router.use("/users", usersRouter);
router.use("/booths", boothsRouter);
router.use("/booth-agents", agentsRouter);
router.use("/dashboard", analyticsRouter);

export default router;
