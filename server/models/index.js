/**
 * Models Index - Import all models to ensure they're registered with Mongoose
 *
 * This file must be imported BEFORE any route handlers that use populate()
 * to ensure all model schemas are registered with Mongoose.
 */

import User from "./User.js";
import Booth from "./Booth.js";
import Survey from "./Survey.js";

// Export models for convenience
export { User, Booth, Survey };

// Also export as default object
export default {
  User,
  Booth,
  Survey,
};
