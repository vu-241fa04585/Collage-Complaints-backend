const Department = require('../models/Department');

/**
 * Category-to-department-code mapping.
 * Maps each complaint category to the department code responsible for handling it.
 */
const CATEGORY_DEPARTMENT_MAP = {
  classroom: 'CIVIL',
  laboratory: 'LAB', // default; subcategory may override
  internet_wifi: 'IT',
  hostel: 'HOSTEL',
  transportation: 'TRANSPORT',
  library: 'LIBRARY',
  canteen: 'CANTEEN',
  drinking_water_sanitation: 'MAINT',
  academic: 'ACADEMIC',
  faculty_related: 'ACADEMIC',
  examination: 'EXAM',
  ragging_harassment: 'ANTIRAGGING',
  infrastructure: 'CIVIL',
  other: 'ADMIN',
};

/**
 * Laboratory subcategory overrides.
 * If the complaint category is 'laboratory', the subcategory may route
 * to a specific lab department.
 */
const LAB_SUBCATEGORY_MAP = {
  computer_lab: 'IT',
  physics_lab: 'PHYSICS',
  chemistry_lab: 'CHEMISTRY',
  electronics_lab: 'ECE',
  mechanical_lab: 'MECH',
  electrical_lab: 'EEE',
  civil_lab: 'CIVIL',
};

/**
 * Route a complaint to the appropriate department based on category and subcategory.
 *
 * @param {string} category - Complaint category
 * @param {string} [subcategory] - Optional subcategory for more specific routing
 * @returns {Promise<{ departmentId: string|null, departmentHead: string|null, departmentCode: string }>}
 */
const routeComplaint = async (category, subcategory) => {
  let departmentCode = CATEGORY_DEPARTMENT_MAP[category] || 'ADMIN';

  // Special handling for laboratory category: check subcategory
  if (category === 'laboratory' && subcategory) {
    const normalizedSub = subcategory.toLowerCase().replace(/\s+/g, '_');
    if (LAB_SUBCATEGORY_MAP[normalizedSub]) {
      departmentCode = LAB_SUBCATEGORY_MAP[normalizedSub];
    }
  }

  try {
    // Look up the department by code
    const department = await Department.findOne({ code: departmentCode }).populate(
      'head',
      'name email'
    );

    if (department) {
      return {
        departmentId: department._id,
        departmentHead: department.head ? department.head._id : null,
        departmentCode,
      };
    }

    // Fallback: try ADMIN department
    const fallback = await Department.findOne({ code: 'ADMIN' }).populate(
      'head',
      'name email'
    );

    if (fallback) {
      return {
        departmentId: fallback._id,
        departmentHead: fallback.head ? fallback.head._id : null,
        departmentCode: 'ADMIN',
      };
    }

    // No department found at all
    return {
      departmentId: null,
      departmentHead: null,
      departmentCode,
    };
  } catch (error) {
    console.error('Error routing complaint:', error.message);
    return {
      departmentId: null,
      departmentHead: null,
      departmentCode,
    };
  }
};

module.exports = { routeComplaint, CATEGORY_DEPARTMENT_MAP, LAB_SUBCATEGORY_MAP };
