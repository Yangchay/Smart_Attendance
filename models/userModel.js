const db = require('../config/db');

class User {
    static async create(name, email, passwordHash, verificationToken) {
        const result = await db.query(
            'INSERT INTO users (name, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
            [name, email, passwordHash, verificationToken]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query('SELECT id, name, email, is_verified FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async findByVerificationToken(token) {
        const result = await db.query('SELECT * FROM users WHERE verification_token = $1', [token]);
        return result.rows[0];
    }

    static async markAsVerified(id) {
        await db.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1', [id]);
    }
}

module.exports = User;