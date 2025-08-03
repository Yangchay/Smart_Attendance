const db = require('../config/db');

class Student {
    static async create(userId, name) {
        const result = await db.query(
            'INSERT INTO students (user_id, name) VALUES ($1, $2) RETURNING id, name',
            [userId, name]
        );
        return result.rows[0];
    }

    static async findByUserId(userId) {
        const result = await db.query('SELECT * FROM students WHERE user_id = $1 ORDER BY name', [userId]);
        return result.rows;
    }

    static async findByIdAndUserId(studentId, userId) {
        const result = await db.query('SELECT * FROM students WHERE id = $1 AND user_id = $2', [studentId, userId]);
        return result.rows[0];
    }
}

module.exports = Student;