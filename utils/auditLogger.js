const AuditLog = require('../models/AuditLog');

/**
 * Log an auditable action to the database.
 *
 * @param {string|null} userId - ObjectId of the user performing the action (null for system actions)
 * @param {string} action - Description of the action (e.g., 'CREATE_COMPLAINT', 'UPDATE_STATUS')
 * @param {string} resourceType - Type of resource affected (e.g., 'Complaint', 'User', 'Department')
 * @param {string|null} resourceId - ObjectId of the affected resource
 * @param {object} [details={}] - Additional details about the action
 * @param {string} [ipAddress=''] - IP address of the requester
 * @returns {Promise<object|null>} The created audit log entry or null on error
 */
const logAction = async (userId, action, resourceType, resourceId, details = {}, ipAddress = '') => {
  try {
    const auditLog = await AuditLog.create({
      user: userId || undefined,
      action,
      resourceType,
      resourceId: resourceId || undefined,
      details,
      ipAddress: ipAddress || undefined,
      timestamp: new Date(),
    });

    return auditLog;
  } catch (error) {
    // Audit logging should never break the main flow — log and continue
    console.error('Audit log error:', error.message);
    return null;
  }
};

module.exports = { logAction };
