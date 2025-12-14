/**
 * MLA Admin Routes
 * APIs for L0/L1 to manage MLA users
 *
 * See docs/MLA_DASHBOARD_API_PLAN.md for full specification
 */

const express = require('express');
const router = express.Router();

// TODO: Import middleware
// const { isAuthenticated, hasRole } = require('../../middleware/auth');
// const User = require('../../models/User');

/**
 * POST /api/mla-dashboard/admin/users
 * Create a new MLA user (L0/L1 only)
 */
router.post('/users', async (req, res) => {
  try {
    const { email, phone, name, password, assignedAC, aci_name, party } = req.body;

    // TODO: Implement
    // 1. Validate required fields
    // 2. Check if email/phone already exists
    // 3. Hash password
    // 4. Create user with role: 'MLA'
    // 5. Return created user (without password)

    res.json({
      message: 'TODO: Implement create MLA user API',
      body: { email, name, assignedAC, aci_name, party }
    });
  } catch (error) {
    console.error('Error creating MLA user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/admin/users
 * List all MLA users (L0/L1 only)
 */
router.get('/users', async (req, res) => {
  try {
    // TODO: Implement
    // Query users where role = 'MLA' and deleted = false

    res.json({
      message: 'TODO: Implement list MLA users API',
      users: []
    });
  } catch (error) {
    console.error('Error listing MLA users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * GET /api/mla-dashboard/admin/users/:userId
 * Get single MLA user (L0/L1 only)
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // TODO: Implement
    // Query user by ID where role = 'MLA'

    res.json({
      message: 'TODO: Implement get MLA user API',
      userId
    });
  } catch (error) {
    console.error('Error getting MLA user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * PUT /api/mla-dashboard/admin/users/:userId
 * Update MLA user (L0/L1 only)
 */
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    // TODO: Implement
    // 1. Find user by ID
    // 2. Verify role is 'MLA'
    // 3. Apply allowed updates (name, phone, assignedAC, party, isActive)
    // 4. If password provided, hash it
    // 5. Save and return updated user

    res.json({
      message: 'TODO: Implement update MLA user API',
      userId,
      updates
    });
  } catch (error) {
    console.error('Error updating MLA user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * DELETE /api/mla-dashboard/admin/users/:userId
 * Soft delete MLA user (L0/L1 only)
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // TODO: Implement
    // 1. Find user by ID
    // 2. Verify role is 'MLA'
    // 3. Set deleted = true
    // 4. Save

    res.json({
      message: 'TODO: Implement delete MLA user API',
      userId
    });
  } catch (error) {
    console.error('Error deleting MLA user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
