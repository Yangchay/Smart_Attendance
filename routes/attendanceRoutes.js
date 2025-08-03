const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, checkIfVerified } = require('../middleware/authMiddleware');

// API endpoint for marking attendance (POST request from dashboard)
router.post('/mark', verifyToken, checkIfVerified, attendanceController.markAttendance);
// API endpoint for getting attendance summary for a date
router.get('/summary', verifyToken, checkIfVerified, attendanceController.getAttendanceSummary);

module.exports = router;