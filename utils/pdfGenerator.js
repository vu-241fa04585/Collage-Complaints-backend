const PDFDocument = require('pdfkit');

/**
 * Generate a PDF report for a single complaint.
 *
 * @param {object} complaint - Populated complaint document
 * @returns {Promise<Buffer>} PDF file as a Buffer
 */
const generateComplaintReport = (complaint) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ── Header ──
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('College Complaint & Grievance Redressal System', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font('Helvetica')
        .text('Complaint Report', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#1a73e8')
        .lineWidth(2)
        .stroke();

      doc.moveDown(1);

      // ── Complaint Details ──
      const addField = (label, value) => {
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(`${label}: `, { continued: true })
          .font('Helvetica')
          .text(value || 'N/A');
        doc.moveDown(0.3);
      };

      addField('Tracking ID', complaint.trackingId);
      addField('Title', complaint.title);
      addField('Category', complaint.category ? complaint.category.replace(/_/g, ' ').toUpperCase() : 'N/A');
      addField('Subcategory', complaint.subcategory || 'N/A');
      addField('Priority', complaint.priority ? complaint.priority.toUpperCase() : 'N/A');
      addField('Status', complaint.status ? complaint.status.replace(/_/g, ' ').toUpperCase() : 'N/A');
      addField('Location', complaint.location || 'N/A');

      // Complainant
      const complainantName =
        complaint.complainant && typeof complaint.complainant === 'object'
          ? complaint.complainant.name
          : 'Anonymous';
      addField('Complainant', complaint.isAnonymous ? 'Anonymous' : complainantName);

      // Department
      const deptName =
        complaint.department && typeof complaint.department === 'object'
          ? complaint.department.name
          : complaint.department || 'Not Assigned';
      addField('Department', deptName);

      // Assigned To
      const assignedName =
        complaint.assignedTo && typeof complaint.assignedTo === 'object'
          ? complaint.assignedTo.name
          : 'Not Assigned';
      addField('Assigned To', assignedName);

      addField('Date Filed', complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : 'N/A');
      addField('Last Updated', complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleString() : 'N/A');

      if (complaint.slaDueDate) {
        addField('SLA Due Date', new Date(complaint.slaDueDate).toLocaleString());
      }

      // ── Description ──
      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#ccc')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.5);

      doc.fontSize(13).font('Helvetica-Bold').text('Description');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(complaint.description || 'No description provided.', {
        align: 'justify',
        lineGap: 4,
      });

      // ── Resolution ──
      if (complaint.resolution) {
        doc.moveDown(1);
        doc.fontSize(13).font('Helvetica-Bold').text('Resolution');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(complaint.resolution, {
          align: 'justify',
          lineGap: 4,
        });
      }

      // ── Status History ──
      if (complaint.statusHistory && complaint.statusHistory.length > 0) {
        doc.moveDown(1);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor('#ccc')
          .lineWidth(1)
          .stroke();
        doc.moveDown(0.5);

        doc.fontSize(13).font('Helvetica-Bold').text('Status History');
        doc.moveDown(0.3);

        complaint.statusHistory.forEach((entry, index) => {
          const changedBy =
            entry.changedBy && typeof entry.changedBy === 'object'
              ? entry.changedBy.name
              : 'System';
          const date = entry.changedAt
            ? new Date(entry.changedAt).toLocaleString()
            : 'N/A';

          doc
            .fontSize(9)
            .font('Helvetica')
            .text(
              `${index + 1}. ${entry.status ? entry.status.replace(/_/g, ' ').toUpperCase() : 'N/A'} — by ${changedBy} on ${date}${entry.remarks ? ` (${entry.remarks})` : ''}`
            );
          doc.moveDown(0.15);
        });
      }

      // ── Feedback ──
      if (complaint.feedback && complaint.feedback.rating) {
        doc.moveDown(1);
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .strokeColor('#ccc')
          .lineWidth(1)
          .stroke();
        doc.moveDown(0.5);

        doc.fontSize(13).font('Helvetica-Bold').text('Feedback');
        doc.moveDown(0.3);
        addField('Rating', `${complaint.feedback.rating} / 5`);
        addField('Comments', complaint.feedback.comments || 'No comments');
      }

      // ── Footer ──
      doc.moveDown(2);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999')
        .text(
          `Generated on ${new Date().toLocaleString()} | College Complaint & Grievance Redressal System`,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate an analytics PDF report.
 *
 * @param {object} data - Analytics data
 * @param {object} data.summary - Summary statistics
 * @param {number} data.summary.total - Total complaints
 * @param {number} data.summary.pending - Pending complaints
 * @param {number} data.summary.inProgress - In-progress complaints
 * @param {number} data.summary.resolved - Resolved complaints
 * @param {number} data.summary.rejected - Rejected complaints
 * @param {object[]} [data.categoryBreakdown] - Complaints per category
 * @param {object[]} [data.departmentBreakdown] - Complaints per department
 * @param {object[]} [data.priorityBreakdown] - Complaints per priority
 * @param {object} [data.slaMetrics] - SLA compliance metrics
 * @param {string} [data.period] - Reporting period label
 * @returns {Promise<Buffer>} PDF file as a Buffer
 */
const generateAnalyticsReport = (data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // ── Header ──
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('College Complaint & Grievance Redressal System', { align: 'center' });

      doc.moveDown(0.5);
      doc
        .fontSize(14)
        .font('Helvetica')
        .text('Analytics Report', { align: 'center' });

      if (data.period) {
        doc.moveDown(0.3);
        doc.fontSize(11).text(`Period: ${data.period}`, { align: 'center' });
      }

      doc.moveDown(0.3);
      doc
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .strokeColor('#1a73e8')
        .lineWidth(2)
        .stroke();

      doc.moveDown(1);

      // ── Summary Statistics ──
      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.moveDown(0.5);

      const summary = data.summary || {};
      const summaryTable = [
        ['Metric', 'Count'],
        ['Total Complaints', String(summary.total || 0)],
        ['Pending', String(summary.pending || 0)],
        ['In Progress', String(summary.inProgress || 0)],
        ['Resolved', String(summary.resolved || 0)],
        ['Rejected', String(summary.rejected || 0)],
        ['Closed', String(summary.closed || 0)],
      ];

      drawTable(doc, summaryTable, 50, doc.y, [250, 150]);
      doc.moveDown(1.5);

      // ── Category Breakdown ──
      if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Complaints by Category');
        doc.moveDown(0.5);

        const catRows = [['Category', 'Count']];
        data.categoryBreakdown.forEach((item) => {
          catRows.push([
            String(item._id || item.category || 'Unknown').replace(/_/g, ' '),
            String(item.count || 0),
          ]);
        });

        drawTable(doc, catRows, 50, doc.y, [300, 100]);
        doc.moveDown(1.5);
      }

      // ── Priority Breakdown ──
      if (data.priorityBreakdown && data.priorityBreakdown.length > 0) {
        // Check if we need a new page
        if (doc.y > 650) doc.addPage();

        doc.fontSize(14).font('Helvetica-Bold').text('Complaints by Priority');
        doc.moveDown(0.5);

        const prioRows = [['Priority', 'Count']];
        data.priorityBreakdown.forEach((item) => {
          prioRows.push([
            String(item._id || item.priority || 'Unknown').toUpperCase(),
            String(item.count || 0),
          ]);
        });

        drawTable(doc, prioRows, 50, doc.y, [250, 100]);
        doc.moveDown(1.5);
      }

      // ── Department Breakdown ──
      if (data.departmentBreakdown && data.departmentBreakdown.length > 0) {
        if (doc.y > 600) doc.addPage();

        doc.fontSize(14).font('Helvetica-Bold').text('Complaints by Department');
        doc.moveDown(0.5);

        const deptRows = [['Department', 'Count']];
        data.departmentBreakdown.forEach((item) => {
          deptRows.push([
            String(item.name || item._id || 'Unknown'),
            String(item.count || 0),
          ]);
        });

        drawTable(doc, deptRows, 50, doc.y, [300, 100]);
        doc.moveDown(1.5);
      }

      // ── SLA Metrics ──
      if (data.slaMetrics) {
        if (doc.y > 600) doc.addPage();

        doc.fontSize(14).font('Helvetica-Bold').text('SLA Compliance');
        doc.moveDown(0.5);

        const sla = data.slaMetrics;
        const slaRows = [
          ['Metric', 'Value'],
          ['Total Resolved', String(sla.totalResolved || 0)],
          ['Within SLA', String(sla.withinSLA || 0)],
          ['SLA Breached', String(sla.breached || 0)],
          [
            'Compliance Rate',
            sla.totalResolved
              ? `${(((sla.withinSLA || 0) / sla.totalResolved) * 100).toFixed(1)}%`
              : 'N/A',
          ],
          [
            'Average Resolution Time',
            sla.avgResolutionHours
              ? `${sla.avgResolutionHours.toFixed(1)} hours`
              : 'N/A',
          ],
        ];

        drawTable(doc, slaRows, 50, doc.y, [250, 150]);
        doc.moveDown(1.5);
      }

      // ── Footer ──
      doc.moveDown(2);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999')
        .text(
          `Generated on ${new Date().toLocaleString()} | College Complaint & Grievance Redressal System`,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Draw a simple table in the PDF document.
 *
 * @param {PDFDocument} doc - The PDFKit document instance
 * @param {string[][]} rows - Array of rows (first row is the header)
 * @param {number} startX - X coordinate of the table
 * @param {number} startY - Y coordinate of the table
 * @param {number[]} colWidths - Width of each column
 */
function drawTable(doc, rows, startX, startY, colWidths) {
  const rowHeight = 22;
  let y = startY;

  rows.forEach((row, rowIndex) => {
    let x = startX;
    const isHeader = rowIndex === 0;

    // Background for header
    if (isHeader) {
      const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
      doc.rect(x, y, totalWidth, rowHeight).fill('#1a73e8');
    }

    row.forEach((cell, colIndex) => {
      const colWidth = colWidths[colIndex] || 100;

      // Cell border
      doc
        .rect(x, y, colWidth, rowHeight)
        .strokeColor('#ccc')
        .lineWidth(0.5)
        .stroke();

      // Cell text
      doc
        .fontSize(9)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(isHeader ? '#ffffff' : '#333333')
        .text(cell, x + 5, y + 6, {
          width: colWidth - 10,
          height: rowHeight - 4,
          ellipsis: true,
        });

      x += colWidth;
    });

    y += rowHeight;

    // Page break if needed
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
  });
}

module.exports = {
  generateComplaintReport,
  generateAnalyticsReport,
};
