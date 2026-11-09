const Counter = require('../models/Counter');

/**
 * Generate a unique complaint tracking ID in the format CGR-YYYY-NNNN.
 * Uses the Counter model to maintain an auto-incrementing sequence.
 *
 * @returns {Promise<string>} Tracking ID (e.g., "CGR-2026-0001")
 */
const generateTrackingId = async () => {
  const year = new Date().getFullYear();
  const counterName = `complaint_${year}`;

  // Atomically find and increment the counter for the current year
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad the sequence number to 4 digits
  const paddedSeq = String(counter.seq).padStart(4, '0');

  return `CGR-${year}-${paddedSeq}`;
};

module.exports = generateTrackingId;
