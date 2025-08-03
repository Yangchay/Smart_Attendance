const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, checkIfVerified } = require('../middleware/authMiddleware');

// Protect these routes: user must be logged in and email verified
router.get('/add', verifyToken, checkIfVerified, studentController.getAddStudentPage);
router.post('/add', verifyToken, checkIfVerified, studentController.addStudent);

module.exports = router;