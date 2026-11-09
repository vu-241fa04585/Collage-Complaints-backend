const express = require('express');
const router = express.Router();
const { getUserProfile, getStaffList } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile', protect, getUserProfile);
router.get('/staff', protect, getStaffList);

module.exports = router;

