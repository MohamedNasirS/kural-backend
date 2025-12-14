/**
 * MLA Dashboard Routes - Index
 * Aggregates all MLA-related routes
 */

import express from 'express';
import dashboardRoutes from './dashboard.routes.js';

const router = express.Router();

// Mount dashboard routes
router.use('/', dashboardRoutes);

export default router;
