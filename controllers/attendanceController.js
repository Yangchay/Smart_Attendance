const Attendance = require('../models/attendanceModel');
const Student = require('../models/studentModel'); // To get student details

exports.markAttendance = async (req, res) => {
    const { studentId, attendanceDate, attendanceTime, status } = req.body;
    const userId = req.user.id; // Get teacher's ID from authenticated user

    if (!studentId || !attendanceDate || !attendanceTime || !status) {
        return res.json({ success: false, message: 'Missing attendance data.' });
    }

    try {
        // Verify that the student belongs to the current teacher
        const student = await Student.findByIdAndUserId(studentId, userId);
        if (!student) {
            return res.status(403).json({ success: false, message: 'Unauthorized: Student does not belong to this teacher.' });
        }

        const attendanceRecord = await Attendance.mark(studentId, attendanceDate, attendanceTime, status);
        res.json({ success: true, message: 'Attendance marked successfully!', attendance: attendanceRecord });
    } catch (err) {
        console.error('Error marking attendance:', err);
        res.status(500).json({ success: false, message: 'Failed to mark attendance. Server error.' });
    }
};

exports.getAttendanceSummary = async (req, res) => {
    const { date } = req.query;
    const userId = req.user.id;

    if (!date) {
        return res.status(400).json({ success: false, message: 'Date is required for attendance summary.' });
    }

    try {
        const summary = await Attendance.getAttendanceSummaryByDate(userId, date);
        res.json({ success: true, summary: summary });
    } catch (err) {
        console.error('Error fetching attendance summary:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance summary. Server error.' });
    }
};
