/**
 * SLA (Service Level Agreement) Configuration
 * Defines default resolution timeframes based on complaint priority.
 * All durations are in hours.
 */

const SLA_HOURS = {
  critical: 4,
  high: 12,
  medium: 48,
  low: 120,
};

/**
 * Get the SLA hours for a given priority level.
 * @param {string} priority - Priority level (critical, high, medium, low)
 * @returns {number} SLA hours for the priority
 */
const getSLAHours = (priority) => {
  const normalizedPriority = (priority || 'medium').toLowerCase();
  return SLA_HOURS[normalizedPriority] || SLA_HOURS.medium;
};

/**
 * Calculate the SLA due date from a given start date and priority.
 * @param {Date} startDate - The date the complaint was filed or assigned
 * @param {string} priority - Priority level (critical, high, medium, low)
 * @returns {Date} The calculated due date
 */
const calculateDueDate = (startDate, priority) => {
  const hours = getSLAHours(priority);
  const dueDate = new Date(startDate);
  dueDate.setHours(dueDate.getHours() + hours);
  return dueDate;
};

/**
 * Check whether an SLA has been breached.
 * @param {Date} dueDate - The SLA due date
 * @returns {boolean} True if the current time exceeds the due date
 */
const isSLABreached = (dueDate) => {
  return new Date() > new Date(dueDate);
};

/**
 * Get the remaining time until the SLA due date.
 * @param {Date} dueDate - The SLA due date
 * @returns {{ hours: number, minutes: number, isBreached: boolean }}
 */
const getRemainingTime = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due - now;

  if (diffMs <= 0) {
    const overMs = Math.abs(diffMs);
    return {
      hours: -Math.floor(overMs / (1000 * 60 * 60)),
      minutes: -Math.floor((overMs % (1000 * 60 * 60)) / (1000 * 60)),
      isBreached: true,
    };
  }

  return {
    hours: Math.floor(diffMs / (1000 * 60 * 60)),
    minutes: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
    isBreached: false,
  };
};

/**
 * Escalation thresholds as a percentage of SLA time elapsed.
 * When the percentage of time elapsed crosses these thresholds,
 * the complaint should be escalated to a higher authority.
 */
const ESCALATION_THRESHOLDS = {
  warning: 0.5,   // 50% of SLA time elapsed
  critical: 0.75, // 75% of SLA time elapsed
  breach: 1.0,    // 100% — SLA breached
};

module.exports = {
  SLA_HOURS,
  getSLAHours,
  calculateDueDate,
  isSLABreached,
  getRemainingTime,
  ESCALATION_THRESHOLDS,
};
