const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const ComplaintHistory = require('../models/ComplaintHistory');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');
const AuditLog = require('../models/AuditLog');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_complaints'
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Complaint.deleteMany({});
    await ComplaintHistory.deleteMany({});
    await Feedback.deleteMany({});
    await Notification.deleteMany({});
    await Counter.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Creating Departments...');
    const departmentsData = [
      {
        name: 'Information Technology & Systems',
        code: 'IT',
        description: 'Manages campus network, Wi-Fi infrastructure, computer labs, and portal systems.',
        categories: ['internet_wifi', 'laboratory'],
        slaSettings: { critical: 4, high: 12, medium: 48, low: 96 },
      },
      {
        name: 'Civil & Infrastructure Maintenance',
        code: 'CIVIL',
        description: 'Handles classroom maintenance, furniture, civil repairs, and physical buildings.',
        categories: ['classroom', 'infrastructure'],
        slaSettings: { critical: 6, high: 24, medium: 72, low: 168 },
      },
      {
        name: 'Hostel Administration',
        code: 'HOSTEL',
        description: 'Oversees student hostel accommodation, room amenities, and hostel discipline.',
        categories: ['hostel'],
        slaSettings: { critical: 4, high: 24, medium: 48, low: 120 },
      },
      {
        name: 'Public Health & Sanitation',
        code: 'MAINT',
        description: 'Responsible for drinking water purifiers, washrooms, cleanliness, and waste disposal.',
        categories: ['drinking_water_sanitation'],
        slaSettings: { critical: 2, high: 12, medium: 36, low: 72 },
      },
      {
        name: 'Transportation & Logistics',
        code: 'TRANSPORT',
        description: 'Manages college buses, fleet routes, and student transportation safety.',
        categories: ['transportation'],
        slaSettings: { critical: 4, high: 24, medium: 48, low: 96 },
      },
      {
        name: 'Central Library Services',
        code: 'LIBRARY',
        description: 'Manages book lending, digital library access, reading room discipline, and journal subscriptions.',
        categories: ['library'],
        slaSettings: { critical: 12, high: 24, medium: 48, low: 120 },
      },
      {
        name: 'Canteen & Food Quality Control',
        code: 'CANTEEN',
        description: 'Monitors food hygiene, pricing, mess facilities, and cafeteria quality.',
        categories: ['canteen'],
        slaSettings: { critical: 2, high: 12, medium: 24, low: 48 },
      },
      {
        name: 'Academic Affairs & Faculty Redressal',
        code: 'ACADEMIC',
        description: 'Resolves academic schedule disputes, course issues, and faculty concerns.',
        categories: ['academic', 'faculty_related', 'examination'],
        slaSettings: { critical: 12, high: 24, medium: 72, low: 168 },
      },
      {
        name: 'Anti-Ragging & Student Safety Committee',
        code: 'ANTIRAGGING',
        description: 'Zero tolerance anti-ragging cell, confidential grievance handling, and campus security.',
        categories: ['ragging_harassment'],
        slaSettings: { critical: 1, high: 4, medium: 12, low: 24 },
      },
      {
        name: 'General College Administration',
        code: 'ADMIN',
        description: 'Handles student verification, fee queries, certificates, and miscellaneous college matters.',
        categories: ['other'],
        slaSettings: { critical: 12, high: 24, medium: 72, low: 168 },
      },
    ];

    const createdDepartments = await Department.insertMany(departmentsData);
    const deptMap = {};
    createdDepartments.forEach((d) => {
      deptMap[d.code] = d._id;
    });

    console.log('Creating Demo Users across all 5 roles...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const usersData = [
      // 1. Student
      {
        name: 'Aarav Sharma',
        studentId: 'STU-2026-042',
        email: 'student@college.edu',
        password: hashedPassword,
        role: 'student',
        phone: '+91 98765 43210',
        isActive: true,
      },
      // Secondary Student
      {
        name: 'Ananya Verma',
        studentId: 'STU-2026-089',
        email: 'ananya.student@college.edu',
        password: hashedPassword,
        role: 'student',
        phone: '+91 98765 43211',
        isActive: true,
      },
      // 2. Faculty / Department Staff
      {
        name: 'Dr. Rajesh Kumar',
        employeeId: 'FAC-IT-102',
        email: 'faculty@college.edu',
        password: hashedPassword,
        role: 'faculty',
        department: deptMap['IT'],
        phone: '+91 98765 43220',
        isActive: true,
      },
      {
        name: 'Prof. Sunita Rao',
        employeeId: 'FAC-CIVIL-205',
        email: 'sunita.civil@college.edu',
        password: hashedPassword,
        role: 'faculty',
        department: deptMap['CIVIL'],
        phone: '+91 98765 43221',
        isActive: true,
      },
      // 3. Department Head
      {
        name: 'Dr. Vikramaditya Reddy',
        employeeId: 'HOD-IT-001',
        email: 'hod@college.edu',
        password: hashedPassword,
        role: 'department_head',
        department: deptMap['IT'],
        phone: '+91 98765 43230',
        isActive: true,
      },
      {
        name: 'Dr. Meenakshi Sundaram',
        employeeId: 'HOD-CIVIL-002',
        email: 'hod.civil@college.edu',
        password: hashedPassword,
        role: 'department_head',
        department: deptMap['CIVIL'],
        phone: '+91 98765 43231',
        isActive: true,
      },
      // 4. Administrator
      {
        name: 'Col. Sanjeev Kapoor (Retd.)',
        employeeId: 'ADM-SYS-001',
        email: 'admin@college.edu',
        password: hashedPassword,
        role: 'admin',
        phone: '+91 98765 43240',
        isActive: true,
      },
      // 5. College Management
      {
        name: 'Dr. Pradeep Nair (Dean & Director)',
        employeeId: 'DIR-MGMT-001',
        email: 'management@college.edu',
        password: hashedPassword,
        role: 'management',
        phone: '+91 98765 43250',
        isActive: true,
      },
    ];

    const createdUsers = await User.insertMany(usersData);
    const userMap = {};
    createdUsers.forEach((u) => {
      userMap[u.email] = u;
    });

    // Update departments with head and staff
    await Department.findByIdAndUpdate(deptMap['IT'], {
      head: userMap['hod@college.edu']._id,
      staff: [userMap['faculty@college.edu']._id],
    });
    await Department.findByIdAndUpdate(deptMap['CIVIL'], {
      head: userMap['hod.civil@college.edu']._id,
      staff: [userMap['sunita.civil@college.edu']._id],
    });

    console.log('Initializing tracking counter...');
    await Counter.create({ name: 'complaint_tracking_id', sequence: 10 });

    console.log('Seeding Sample Complaints with realistic statuses and histories...');
    const now = new Date();
    const student1 = userMap['student@college.edu'];
    const student2 = userMap['ananya.student@college.edu'];
    const itStaff = userMap['faculty@college.edu'];
    const civilStaff = userMap['sunita.civil@college.edu'];
    const itHod = userMap['hod@college.edu'];
    const adminUser = userMap['admin@college.edu'];

    const complaintsData = [
      {
        trackingId: 'CGR-2026-0001',
        student: student1._id,
        title: 'High latency and frequent Wi-Fi disconnection in Computer Lab 3',
        description: 'During our operating systems practicals, the Wi-Fi AP in Block B, 3rd Floor keeps dropping packets. Over 40 students were unable to push git commits to the lab server.',
        category: 'internet_wifi',
        subcategory: 'Wi-Fi Signal Drop',
        priority: 'high',
        status: 'in_progress',
        assignedDepartment: deptMap['IT'],
        assignedStaff: itStaff._id,
        isConfidential: false,
        location: 'Block B, 3rd Floor, Lab 3',
        dueDate: new Date(now.getTime() + 12 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 10 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0002',
        student: student1._id,
        title: 'Water cooler purifier leaking on 2nd Floor Library corridor',
        description: 'The RO drinking water station has been overflowing since yesterday evening, causing slippery corridor tiles and wasting clean drinking water.',
        category: 'drinking_water_sanitation',
        subcategory: 'RO Purifier Leakage',
        priority: 'critical',
        status: 'assigned',
        assignedDepartment: deptMap['MAINT'],
        isConfidential: false,
        location: 'Central Library, 2nd Floor Corridor',
        dueDate: new Date(now.getTime() - 1 * 3600 * 1000), // Overdue!
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0003',
        student: student2._id,
        title: 'Ceiling Projector bulb failure in Seminar Hall A',
        description: 'The HDMI projector display flickers intermittently and shuts down after 5 minutes of usage due to overheating warning.',
        category: 'classroom',
        subcategory: 'Audio/Visual Equipment',
        priority: 'medium',
        status: 'resolved',
        assignedDepartment: deptMap['CIVIL'],
        assignedStaff: civilStaff._id,
        isConfidential: false,
        location: 'Main Academic Block, Ground Floor',
        dueDate: new Date(now.getTime() + 48 * 3600 * 1000),
        resolvedDate: new Date(now.getTime() - 2 * 3600 * 1000),
        resolutionComments: 'Replaced projector cooling fan module and lamp assembly. Verified color calibration with test pattern.',
        createdAt: new Date(now.getTime() - 36 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0004',
        student: student1._id,
        title: 'Unhygienic food handling observed at main cafeteria counter',
        description: 'Staff handling raw snacks without food gloves or hairnets. Cutlery washing area lacks hot water sanitization.',
        category: 'canteen',
        subcategory: 'Hygiene & Cleanliness',
        priority: 'high',
        status: 'submitted',
        assignedDepartment: deptMap['CANTEEN'],
        isConfidential: false,
        location: 'Central Student Canteen',
        dueDate: new Date(now.getTime() + 8 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0005',
        student: student2._id,
        title: 'Confidential: Inappropriate behavior reported near Hostel Gate 2',
        description: 'Two non-college individuals were loitering and passing remarks at evening scholars near the South boundary wall between 8 PM and 9 PM.',
        category: 'ragging_harassment',
        subcategory: 'Campus Security',
        priority: 'critical',
        status: 'escalated',
        assignedDepartment: deptMap['ANTIRAGGING'],
        isConfidential: true,
        location: 'Hostel Gate 2, South Boundary',
        dueDate: new Date(now.getTime() - 2 * 3600 * 1000), // Overdue/Escalated
        escalationLevel: 1,
        createdAt: new Date(now.getTime() - 6 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0006',
        student: student1._id,
        title: 'Broken chair armrests and benches in Lecture Hall 204',
        description: 'Several wooden desk armrests are cracked with protruding nails that tore a student backpack.',
        category: 'infrastructure',
        subcategory: 'Furniture Repair',
        priority: 'low',
        status: 'resolved',
        assignedDepartment: deptMap['CIVIL'],
        assignedStaff: civilStaff._id,
        isConfidential: false,
        location: 'LH-204, Mechanical Block',
        dueDate: new Date(now.getTime() + 100 * 3600 * 1000),
        resolvedDate: new Date(now.getTime() - 24 * 3600 * 1000),
        resolutionComments: 'Carpentry contractor inspected and replaced 6 wooden desk tops and tightened mounting bolts.',
        createdAt: new Date(now.getTime() - 72 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0007',
        student: student2._id,
        title: 'College Bus Route 14 delays reaching campus',
        description: 'Bus 14 from Tambaram regularly arrives 25 minutes past 8:30 AM due to unscheduled stops, resulting in students missing their first morning lecture.',
        category: 'transportation',
        subcategory: 'Bus Schedule Delay',
        priority: 'medium',
        status: 'in_progress',
        assignedDepartment: deptMap['TRANSPORT'],
        isConfidential: false,
        location: 'Route 14 (South Corridor)',
        dueDate: new Date(now.getTime() + 30 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 14 * 3600 * 1000),
      },
      {
        trackingId: 'CGR-2026-0008',
        student: student1._id,
        title: 'IEEE Digital Xplore portal credentials expired in Digital Library',
        description: 'Students attempting to download journal papers for final year capstone projects encounter 403 authorization error on campus IP subnet.',
        category: 'library',
        subcategory: 'E-Resources Subscription',
        priority: 'medium',
        status: 'closed',
        assignedDepartment: deptMap['LIBRARY'],
        isConfidential: false,
        location: 'Digital Library Section',
        dueDate: new Date(now.getTime() + 20 * 3600 * 1000),
        resolvedDate: new Date(now.getTime() - 48 * 3600 * 1000),
        resolutionComments: 'Institutional subscription IP whitelist updated with national consortium coordinator.',
        createdAt: new Date(now.getTime() - 96 * 3600 * 1000),
      },
    ];

    const createdComplaints = await Complaint.insertMany(complaintsData);

    console.log('Seeding Complaint History entries...');
    for (const c of createdComplaints) {
      await ComplaintHistory.create({
        complaint: c._id,
        previousStatus: null,
        newStatus: 'submitted',
        action: 'created',
        performedBy: c.student,
        comments: 'Complaint lodged by student through web portal.',
        createdAt: c.createdAt,
      });

      if (c.status !== 'submitted') {
        await ComplaintHistory.create({
          complaint: c._id,
          previousStatus: 'submitted',
          newStatus: c.status === 'resolved' || c.status === 'closed' ? 'in_progress' : c.status,
          action: 'assigned',
          performedBy: adminUser._id,
          comments: `Smart routed to department ${c.assignedDepartment}.`,
          createdAt: new Date(c.createdAt.getTime() + 15 * 60 * 1000),
        });
      }

      if (c.status === 'resolved' || c.status === 'closed') {
        await ComplaintHistory.create({
          complaint: c._id,
          previousStatus: 'in_progress',
          newStatus: 'resolved',
          action: 'status_changed',
          performedBy: c.assignedStaff || itHod._id,
          comments: c.resolutionComments || 'Work completed and verified on site.',
          createdAt: c.resolvedDate,
        });
      }

      if (c.status === 'escalated') {
        await ComplaintHistory.create({
          complaint: c._id,
          previousStatus: 'assigned',
          newStatus: 'escalated',
          action: 'escalated',
          performedBy: adminUser._id,
          comments: 'Exceeded SLA deadline without staff action. Automatically escalated to committee head.',
          createdAt: new Date(c.createdAt.getTime() + 4 * 3600 * 1000),
        });
      }
    }

    console.log('Seeding Feedback for resolved complaints...');
    const resolvedComp1 = createdComplaints.find((c) => c.trackingId === 'CGR-2026-0003');
    if (resolvedComp1) {
      await Feedback.create({
        complaint: resolvedComp1._id,
        student: resolvedComp1.student,
        rating: 5,
        comments: 'Projector was fixed very promptly before our guest seminar. Thank you!',
        serviceQuality: 5,
        responseTime: 5,
        satisfaction: 5,
      });
    }

    const closedComp = createdComplaints.find((c) => c.trackingId === 'CGR-2026-0008');
    if (closedComp) {
      await Feedback.create({
        complaint: closedComp._id,
        student: closedComp.student,
        rating: 4,
        comments: 'Access is restored and we can now download IEEE research papers smoothly.',
        serviceQuality: 4,
        responseTime: 4,
        satisfaction: 4,
      });
    }

    console.log('Seeding Sample Notifications...');
    await Notification.create({
      user: student1._id,
      title: 'Complaint Status Updated',
      message: 'Your complaint CGR-2026-0001 has been assigned to Dr. Rajesh Kumar.',
      type: 'complaint_update',
      relatedComplaint: createdComplaints[0]._id,
      isRead: false,
    });
    await Notification.create({
      user: student1._id,
      title: 'Feedback Requested',
      message: 'Complaint CGR-2026-0008 was resolved. Please rate your experience.',
      type: 'feedback_request',
      relatedComplaint: createdComplaints[7]._id,
      isRead: true,
    });
    await Notification.create({
      user: itStaff._id,
      title: 'New Complaint Assignment',
      message: 'Complaint CGR-2026-0001 (Wi-Fi disconnection) has been routed to you.',
      type: 'assignment',
      relatedComplaint: createdComplaints[0]._id,
      isRead: false,
    });
    await Notification.create({
      user: adminUser._id,
      title: 'SLA Escalation Alert',
      message: 'Complaint CGR-2026-0005 has breached critical resolution threshold.',
      type: 'escalation',
      relatedComplaint: createdComplaints[4]._id,
      isRead: false,
    });

    console.log('Seeding Audit Logs...');
    await AuditLog.create({
      user: adminUser._id,
      action: 'seed_database',
      resourceType: 'system',
      details: { environment: 'development', initialSeed: true },
      ipAddress: '127.0.0.1',
    });

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Demo Credentials for All 5 Roles (Password: password123):');
    console.log('1. Student:           student@college.edu');
    console.log('2. Faculty / Staff:   faculty@college.edu');
    console.log('3. Department Head:   hod@college.edu');
    console.log('4. Administrator:     admin@college.edu');
    console.log('5. College Management: management@college.edu');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();

