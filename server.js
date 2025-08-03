// server.js
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const db = require('./config/db'); // Import the db connection and initialization function
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const studentController = require('./controllers/studentController');
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main'); // Default layout for all views

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(cookieParser()); // For parsing cookies

// Serve static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes); // Auth routes (login, register, verify)
app.use('/students', studentRoutes); // Student management routes
app.use('/attendance', attendanceRoutes); // Attendance marking routes

// Protected Dashboard route
app.get('/dashboard', verifyToken, studentController.getDashboard);

// Root redirect
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Basic error handling for undefined routes
app.use((req, res, next) => {
    res.status(404).send("Sorry, that route doesn't exist.");
});

// Initialize database tables and then start the server
db.initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Visit http://localhost:${PORT}`);
        
    });
}).catch(err => {
    console.error('Failed to start server due to database initialization error:', err);
    // You might want to implement a more graceful shutdown or retry logic here
    process.exit(1); // Exit process if database init fails
});
