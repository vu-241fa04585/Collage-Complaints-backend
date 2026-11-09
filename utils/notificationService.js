const Notification = require('../models/Notification');

/**
 * Create a single notification record in the database.
 *
 * @param {string} userId - ObjectId of the recipient user
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body message
 * @param {string} options.type - Notification type (e.g., 'complaint_update', 'escalation', 'assignment', 'general')
 * @param {string} [options.relatedComplaint] - ObjectId of the related complaint (optional)
 * @returns {Promise<object>} The created notification document
 */
const createNotification = async (userId, { title, message, type, relatedComplaint }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type || 'general',
      relatedComplaint: relatedComplaint || undefined,
    });

    // Emit via Socket.IO if available
    const io = require('../server').io;
    if (io) {
      io.to(userId.toString()).emit('notification', {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        relatedComplaint: notification.relatedComplaint,
        read: notification.read,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error.message);
    return null;
  }
};

/**
 * Create notifications for multiple users in bulk.
 *
 * @param {string[]} userIds - Array of recipient user ObjectIds
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body message
 * @param {string} options.type - Notification type
 * @param {string} [options.relatedComplaint] - ObjectId of the related complaint (optional)
 * @returns {Promise<object[]>} Array of created notification documents
 */
const createBulkNotifications = async (userIds, { title, message, type, relatedComplaint }) => {
  try {
    const notificationDocs = userIds.map((userId) => ({
      user: userId,
      title,
      message,
      type: type || 'general',
      relatedComplaint: relatedComplaint || undefined,
    }));

    const notifications = await Notification.insertMany(notificationDocs);

    // Emit via Socket.IO if available
    try {
      const io = require('../server').io;
      if (io) {
        notifications.forEach((notification) => {
          io.to(notification.user.toString()).emit('notification', {
            _id: notification._id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            relatedComplaint: notification.relatedComplaint,
            read: notification.read,
            createdAt: notification.createdAt,
          });
        });
      }
    } catch (socketError) {
      // Socket.IO may not be initialized yet; silently continue
    }

    return notifications;
  } catch (error) {
    console.error('Error creating bulk notifications:', error.message);
    return [];
  }
};

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId - ObjectId of the notification
 * @param {string} userId - ObjectId of the user (ensures ownership)
 * @returns {Promise<object|null>} Updated notification or null
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error.message);
    return null;
  }
};

/**
 * Mark all notifications for a user as read.
 *
 * @param {string} userId - ObjectId of the user
 * @returns {Promise<object>} Update result with modifiedCount
 */
const markAllAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error.message);
    return { modifiedCount: 0 };
  }
};

module.exports = {
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
};
