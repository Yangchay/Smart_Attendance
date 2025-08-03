const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file locally

let pool;

// Use DATABASE_URL from environment variables
// This variable MUST be set, both locally (in .env) and on Render.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("CRITICAL ERROR: DATABASE_URL environment variable is not set. Cannot connect to the database.");
    process.exit(1); // Exit if the crucial connection string is missing
}

// Initialize the PostgreSQL connection pool
pool = new Pool({
    connectionString: connectionString,
    // Add SSL configuration, crucial for connecting to Render's PostgreSQL database
    ssl: {
        rejectUnauthorized: false // This is important for self-signed certificates or typical Render setups
    }
});


pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    // In a production app, you might want more sophisticated error handling here,
    // like sending alerts, logging, or trying to reconnect without exiting.
    // For development, process.exit(-1) can be useful for immediate feedback.
    // However, it's generally better to let the app crash and be restarted by a process manager.
    // For now, we'll keep it for clarity of critical errors.
    process.exit(-1);
});

// Function to initialize the database tables
const initializeDatabase = async () => {
    let client; // Declare client here to ensure it's in scope for the finally block
    try {
        client = await pool.connect();
        console.log('Attempting to initialize database tables...');

        // 1. Create the 'users' table
        // This table will store both teacher and student login information.
        // The 'role' column differentiates them.
        // 'student_id' links a user account (if role='student') to an entry in the 'students' table.
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'teacher', -- 'teacher' or 'student'
                student_id INTEGER UNIQUE, -- References students(id) if role is 'student'
                is_verified BOOLEAN DEFAULT FALSE, -- For email verification (if implemented)
                verification_token VARCHAR(255), -- For email verification (if implemented)
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "users" checked/created.');


        // 2. Create the 'students' table
        // This table stores the actual student records, managed by teachers.
        // 'user_id' here references the 'id' of the teacher in the 'users' table who added this student.
        await client.query(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- ID of the teacher (from users table)
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Table "students" checked/created.');


        // 3. Add foreign key constraint to 'users' table for 'student_id'
        // This links a 'student' user account (in the users table) to their corresponding
        // student record (in the students table).
        // `ON DELETE CASCADE` ensures that if a student record is deleted, their user account is also deleted.
        // This check prevents errors if the constraint already exists from a previous run.
        const fkeyCheck = await client.query(`
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_student_id'
        `);
        if (fkeyCheck.rows.length === 0) {
            await client.query(`
                ALTER TABLE users
                ADD CONSTRAINT fk_users_student_id
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
            `);
            console.log("Added foreign key constraint 'fk_users_student_id' to users table.");
        }


        // 4. Create the 'attendance' table
        // Records attendance for students.
        // 'student_id' links to the student record.
        // 'teacher_id' links to the teacher (user) who marked the attendance.
        // `UNIQUE (student_id, attendance_date)` ensures only one attendance mark per student per day.
        await client.query(`
            CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                attendance_date DATE NOT NULL,
                attendance_time TIME WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Automatically set on insert/update by the DB
                status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
                teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- ID of the teacher (from users table)
                marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (student_id, attendance_date) -- Ensures only one attendance record per student per day
            );
        `);
        console.log('Table "attendance" checked/created.');

        console.log('All database tables initialized successfully or already exist.');
    } catch (err) {
        console.error('Error initializing database tables:', err);
        // Re-throw the error so that the main application (server.js) can catch it
        // and decide whether to exit or attempt a retry.
        throw err;
    } finally {
        if (client) {
            client.release(); // Always release the client back to the pool
        }
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    getClient: () => pool.connect(), // Export getClient if you need direct client access for transactions etc.
    initializeDatabase, // Export the initialization function
    pool // Export the pool itself, useful for advanced scenarios like migrations
};