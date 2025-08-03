const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token; // Assuming token is stored in a cookie

    if (!token) {
        // If no token, redirect to login page for unauthorized access
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user information to the request
        next();
    } catch (err) {
        console.error('Token verification failed:', err);
        // Clear invalid token and redirect to login
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

const checkIfVerified = (req, res, next) => {
    if (!req.user || !req.user.isVerified) {
        // If user is not verified, redirect to a message page or login
        // For simplicity, we'll redirect to login and show a message there
        console.log("User not verified:", req.user);
        return res.redirect('/login?message=Please verify your email to access this feature.');
    }
    next();
};

module.exports = { verifyToken, checkIfVerified };