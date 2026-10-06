const express = require('express');
const { submitMobileAttendance, getAttendanceList, exportAttendance } = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Student submission route (open to Flutter app, rate limited at server level)
router.post('/submit', submitMobileAttendance);

// Lecturer dashboard data and file exports (protected by auth middleware)
router.get('/session/:sessionId', protect, getAttendanceList);
router.get('/session/:sessionId/export', protect, exportAttendance);

module.exports = router;
