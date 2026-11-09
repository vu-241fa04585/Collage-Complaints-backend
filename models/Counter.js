const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Counter name is required'],
      unique: true,
      trim: true
    },
    sequence: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

/**
 * Atomically increment the named counter and return the new sequence value.
 * Creates the counter document with sequence = 1 if it does not yet exist.
 *
 * @param {string} name - The counter identifier (e.g. "complaint_tracking_id").
 * @returns {Promise<number>} The next sequence number.
 */
counterSchema.statics.getNextSequence = async function (name) {
  const counter = await this.findOneAndUpdate(
    { name },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return counter.sequence;
};

module.exports = mongoose.model('Counter', counterSchema);
