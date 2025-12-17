/**
 * Soft Delete Plugin for Mongoose
 *
 * This plugin adds consistent soft delete functionality to Mongoose models.
 * It supports both `isActive` and `deleted` fields for backward compatibility.
 *
 * Usage:
 * 1. Apply globally: mongoose.plugin(softDeletePlugin)
 * 2. Apply to specific model: schema.plugin(softDeletePlugin, { field: 'isActive' })
 *
 * Options:
 * - field: The soft delete field name ('isActive' or 'deleted')
 * - indexField: Whether to add an index on the soft delete field (default: true)
 * - overrideFields: Additional fields to consider as soft delete fields
 *
 * The plugin adds:
 * - Pre-find middleware to filter soft-deleted documents
 * - softDelete() method to soft delete a document
 * - restore() method to restore a soft-deleted document
 * - findWithDeleted() static method to include soft-deleted documents
 * - findOnlyDeleted() static method to find only soft-deleted documents
 */

const DEFAULT_OPTIONS = {
  field: 'isActive',       // Default field (isActive: true means NOT deleted)
  indexField: true,
  overrideFields: []
};

/**
 * Build the filter condition based on field type
 * - isActive: true means document is active (not deleted)
 * - deleted: true means document IS deleted
 */
function buildSoftDeleteFilter(field) {
  if (field === 'isActive') {
    // isActive: true means NOT deleted
    return { [field]: { $ne: false } };
  } else if (field === 'deleted') {
    // deleted: true means IS deleted
    return { [field]: { $ne: true } };
  }
  // Default: assume field indicates "deleted" state
  return { [field]: { $ne: true } };
}

/**
 * Check if a query explicitly includes soft-deleted documents
 */
function queryIncludesDeleted(query, field) {
  const conditions = query.getFilter();

  // Check if the field is explicitly set in the query
  if (conditions[field] !== undefined) {
    return true;
  }

  // Check in $and conditions
  if (conditions.$and) {
    for (const cond of conditions.$and) {
      if (cond[field] !== undefined) {
        return true;
      }
    }
  }

  // Check in $or conditions
  if (conditions.$or) {
    for (const cond of conditions.$or) {
      if (cond[field] !== undefined) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Soft Delete Plugin
 */
function softDeletePlugin(schema, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const field = opts.field;
  const allFields = [field, ...opts.overrideFields];

  // Add the soft delete field if it doesn't exist
  if (!schema.path(field)) {
    if (field === 'isActive') {
      schema.add({ [field]: { type: Boolean, default: true } });
    } else if (field === 'deleted') {
      schema.add({ [field]: { type: Boolean, default: false } });
    }
  }

  // Add deletedAt field for tracking when document was deleted
  if (!schema.path('deletedAt')) {
    schema.add({ deletedAt: { type: Date, default: null } });
  }

  // Add index on soft delete field
  if (opts.indexField) {
    schema.index({ [field]: 1 });
  }

  /**
   * Pre-find middleware to automatically filter soft-deleted documents
   * This applies to: find, findOne, findById, count, countDocuments, etc.
   */
  const findMethods = [
    /^find/,         // find, findOne, findById, findOneAndUpdate, etc.
    /^count/,        // count, countDocuments
    'updateMany',
    'updateOne',
    'deleteMany',    // Note: deleteMany with soft delete should use softDeleteMany
    'deleteOne'
  ];

  findMethods.forEach(method => {
    schema.pre(method, function() {
      // Skip if includeDeleted flag is set
      if (this._includeDeleted) {
        return;
      }

      // Skip if query already specifies the soft delete field
      for (const f of allFields) {
        if (queryIncludesDeleted(this, f)) {
          return;
        }
      }

      // Add soft delete filter
      this.where(buildSoftDeleteFilter(field));
    });
  });

  /**
   * Pre-aggregate middleware to filter soft-deleted documents
   */
  schema.pre('aggregate', function() {
    // Skip if includeDeleted flag is set
    if (this.options._includeDeleted) {
      return;
    }

    // Check if pipeline already has a $match with the soft delete field
    const pipeline = this.pipeline();
    const hasDeletedFilter = pipeline.some(stage => {
      if (stage.$match) {
        for (const f of allFields) {
          if (stage.$match[f] !== undefined) {
            return true;
          }
        }
      }
      return false;
    });

    if (!hasDeletedFilter) {
      // Add soft delete filter as the first stage
      this.pipeline().unshift({ $match: buildSoftDeleteFilter(field) });
    }
  });

  /**
   * Instance method: Soft delete a document
   */
  schema.methods.softDelete = async function() {
    if (field === 'isActive') {
      this[field] = false;
    } else {
      this[field] = true;
    }
    this.deletedAt = new Date();
    return this.save();
  };

  /**
   * Instance method: Restore a soft-deleted document
   */
  schema.methods.restore = async function() {
    if (field === 'isActive') {
      this[field] = true;
    } else {
      this[field] = false;
    }
    this.deletedAt = null;
    return this.save();
  };

  /**
   * Static method: Find including soft-deleted documents
   */
  schema.statics.findWithDeleted = function(conditions = {}) {
    const query = this.find(conditions);
    query._includeDeleted = true;
    return query;
  };

  /**
   * Static method: Find only soft-deleted documents
   */
  schema.statics.findOnlyDeleted = function(conditions = {}) {
    const deletedFilter = field === 'isActive'
      ? { [field]: false }
      : { [field]: true };
    return this.find({ ...conditions, ...deletedFilter });
  };

  /**
   * Static method: Soft delete multiple documents
   */
  schema.statics.softDeleteMany = async function(conditions = {}) {
    const update = field === 'isActive'
      ? { [field]: false, deletedAt: new Date() }
      : { [field]: true, deletedAt: new Date() };
    return this.updateMany(conditions, update);
  };

  /**
   * Static method: Restore multiple documents
   */
  schema.statics.restoreMany = async function(conditions = {}) {
    const deletedFilter = field === 'isActive'
      ? { [field]: false }
      : { [field]: true };
    const update = field === 'isActive'
      ? { [field]: true, deletedAt: null }
      : { [field]: false, deletedAt: null };
    return this.updateMany({ ...conditions, ...deletedFilter }, update);
  };

  /**
   * Static method: Hard delete (permanently remove)
   */
  schema.statics.hardDelete = function(conditions = {}) {
    // Use the native deleteMany without soft delete filter
    return this.collection.deleteMany(conditions);
  };
}

/**
 * Apply soft delete to an existing query
 * Useful for queries that don't go through the model's pre-hooks
 */
export function applySoftDeleteFilter(query, field = 'isActive') {
  return { ...query, ...buildSoftDeleteFilter(field) };
}

/**
 * Get the soft delete filter for a field
 */
export function getSoftDeleteFilter(field = 'isActive') {
  return buildSoftDeleteFilter(field);
}

export default softDeletePlugin;
