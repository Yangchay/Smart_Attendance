const db = require('../config/db');

class Attendance {
    static async mark(studentId, date, time, status) {
        // Check if attendance already exists for the given student, date, and time
        const existingAttendance = await db.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 AND attendance_time = $3',
            [studentId, date, time]
        );

        if (existingAttendance.rows.length > 0) {
            // Update existing attendance
            const result = await db.query(
                'UPDATE attendance SET status = $1, marked_at = CURRENT_TIMESTAMP WHERE student_id = $2 AND attendance_date = $3 AND attendance_time = $4 RETURNING *',
                [status, studentId, date, time]
            );
            return result.rows[0];
        } else {
            // Insert new attendance
            const result = await db.query(
                'INSERT INTO attendance (student_id, attendance_date, attendance_time, status) VALUES ($1, $2, $3, $4) RETURNING *',
                [studentId, date, time, status]
            );
            return result.rows[0];
        }
    }

    static async getByStudentAndDate(studentId, date) {
        const result = await db.query(
            'SELECT * FROM attendance WHERE student_id = $1 AND attendance_date = $2 ORDER BY attendance_time',
            [studentId, date]
        );
        return result.rows;
    }

    static async getAttendanceSummaryByDate(userId, date) {
        try {
            const result = await db.query(
                `SELECT
                    s.id AS student_id,
                    s.name AS student_name,
                    a.status,
                    a.attendance_time
                FROM
                    students s
                LEFT JOIN
                    attendance a ON s.id = a.student_id AND a.attendance_date = $2
                WHERE
                    s.user_id = $1
                ORDER BY
                    s.name, a.attendance_time`,
                [userId, date]
            );

            // Group attendance by student
            const summary = {};
            result.rows.forEach(row => {
                if (!summary[row.student_id]) {
                    summary[row.student_id] = {
                        student_id: row.student_id,
                        student_name: row.student_name,
                        attendance_records: []
                    };
                }
                // Only push if there's an actual attendance record for the date
                if (row.status) { // `row.status` will be null for students with no attendance records for the date
                    summary[row.student_id].attendance_records.push({
                        status: row.status,
                        attendance_time: row.attendance_time
                    });
                }
            });
            return Object.values(summary);
        } catch (err) {
            console.error('Error in Attendance.getAttendanceSummaryByDate model:', err);
            throw err; // Re-throw to be caught by the controller
        }
    }
}

module.exports = Attendance;