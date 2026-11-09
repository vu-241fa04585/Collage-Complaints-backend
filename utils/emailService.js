const nodemailer = require('nodemailer');

/**
 * Determine whether email configuration is present in environment variables.
 * @returns {boolean}
 */
const isEmailConfigured = () => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
};

/**
 * Create and return a nodemailer transporter.
 * Returns null if SMTP env vars are not configured.
 * @returns {import('nodemailer').Transporter | null}
 */
const createTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send a generic email.
 * If email is not configured, logs the email details to the console.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML body of the email
 * @returns {Promise<object|null>} Nodemailer send result or null
 */
const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();

  if (!transporter) {
    console.log('=== EMAIL (not configured — logging to console) ===');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${html}`);
    console.log('===================================================');
    return null;
  }

  try {
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'College Complaint System'}" <${
        process.env.FROM_EMAIL || process.env.SMTP_USER
      }>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return null;
  }
};

/**
 * Send a complaint confirmation email to the complainant.
 *
 * @param {string} email - Recipient email
 * @param {object} complaint - Complaint document
 * @param {string} complaint.trackingId - Tracking ID
 * @param {string} complaint.title - Complaint title
 * @param {string} complaint.category - Complaint category
 * @param {string} complaint.priority - Priority level
 * @param {Date}   complaint.createdAt - Submission date
 */
const sendComplaintConfirmation = async (email, complaint) => {
  const subject = `Complaint Registered — ${complaint.trackingId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a73e8; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Complaint Registered Successfully</h2>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <p>Dear User,</p>
        <p>Your complaint has been successfully registered. Below are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Tracking ID</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.trackingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Title</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Category</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Priority</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.priority}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Submitted On</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(complaint.createdAt).toLocaleString()}</td>
          </tr>
        </table>
        <p>You can track your complaint status using the tracking ID above.</p>
        <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

/**
 * Send a status update email when a complaint's status changes.
 *
 * @param {string} email - Recipient email
 * @param {object} complaint - Complaint document
 * @param {string} newStatus - New status value
 */
const sendStatusUpdate = async (email, complaint, newStatus) => {
  const subject = `Complaint ${complaint.trackingId} — Status Updated to ${newStatus}`;

  const statusColors = {
    pending: '#ff9800',
    assigned: '#2196f3',
    in_progress: '#673ab7',
    resolved: '#4caf50',
    closed: '#607d8b',
    rejected: '#f44336',
    reopened: '#ff5722',
  };

  const color = statusColors[newStatus] || '#333';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a73e8; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Complaint Status Update</h2>
      </div>
      <div style="padding: 20px; background: #f9f9f9;">
        <p>Dear User,</p>
        <p>The status of your complaint has been updated:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Tracking ID</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.trackingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Title</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">New Status</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold;">
                ${newStatus.replace(/_/g, ' ').toUpperCase()}
              </span>
            </td>
          </tr>
        </table>
        <p>Please log in to the portal to view complete details.</p>
        <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

/**
 * Send an escalation notification email.
 *
 * @param {string} email - Recipient email (typically a department head or admin)
 * @param {object} complaint - Complaint document
 */
const sendEscalationNotification = async (email, complaint) => {
  const subject = `⚠️ Complaint Escalated — ${complaint.trackingId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #d32f2f; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">⚠️ Complaint Escalation Alert</h2>
      </div>
      <div style="padding: 20px; background: #fff3f3;">
        <p>Dear Sir/Madam,</p>
        <p>A complaint has been <strong>escalated</strong> and requires your immediate attention:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Tracking ID</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.trackingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Title</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Category</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Priority</td>
            <td style="padding: 8px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">${complaint.priority}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Description</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${complaint.description ? complaint.description.substring(0, 200) + '...' : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #eee;">Submitted On</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${new Date(complaint.createdAt).toLocaleString()}</td>
          </tr>
        </table>
        <p>Please take appropriate action immediately.</p>
        <p style="color: #666; font-size: 12px;">This is an automated escalation alert. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail(email, subject, html);
};

module.exports = {
  sendEmail,
  sendComplaintConfirmation,
  sendStatusUpdate,
  sendEscalationNotification,
};
