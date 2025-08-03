const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        // Ensure success is null when error is present
        return res.render('register', { error: 'Please enter all fields.', success: null });
    }

    try {
        let user = await User.findByEmail(email);
        if (user) {
            // Ensure success is null when error is present
            return res.render('register', { error: 'Email already registered.', success: null });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        user = await User.create(name, email, hashedPassword, verificationToken);

        const verificationLink = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email for Smart Attendance System',
            html: `
                <p>Hello ${name},</p>
                <p>Thank you for registering. Please verify your email by clicking on this link:</p>
                <p><a href="${verificationLink}">Verify Email Address</a></p>
                <p>If you did not register for this service, please ignore this email.</p>
            `,
        };

        await transporter.sendMail(mailOptions);

        // Ensure error is null when success is present
        res.render('register', { success: 'Registration successful! Please check your email to verify your account.', error: null });

    } catch (err) {
        console.error('Registration error:', err);
        // Ensure success is null when error is present
        res.render('register', { error: 'Server error during registration.', success: null });
    }
};

exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        // Ensure success and message are null when error is present
        return res.render('login', { error: 'Invalid verification link.', success: null, message: null });
    }

    try {
        const user = await User.findByVerificationToken(token);
        if (!user) {
            // Ensure success and message are null when error is present
            return res.render('login', { error: 'Invalid or expired verification token.', success: null, message: null });
        }

        if (user.is_verified) {
            // Ensure error and message are null when success is present
            return res.render('login', { success: 'Your email is already verified. Please log in.', error: null, message: null });
        }

        await User.markAsVerified(user.id);
        // Ensure error and message are null when success is present
        res.render('login', { success: 'Your email has been successfully verified! You can now log in.', error: null, message: null });

    } catch (err) {
        console.error('Email verification error:', err);
        // Ensure success and message are null when error is present
        res.render('login', { error: 'Server error during email verification.', success: null, message: null });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        // Ensure success and message are null when error is present
        return res.render('login', { error: 'Please enter all fields.', success: null, message: null });
    }

    try {
        const user = await User.findByEmail(email);
        if (!user) {
            // Ensure success and message are null when error is present
            return res.render('login', { error: 'Invalid credentials.', success: null, message: null });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Ensure success and message are null when error is present
            return res.render('login', { error: 'Invalid credentials.', success: null, message: null });
        }

        if (!user.is_verified) {
            // Ensure success is null when message is present
            return res.render('login', { message: 'Please verify your email before logging in.', error: null, success: null });
        }

        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            isVerified: user.is_verified
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Set token as a httpOnly cookie
        res.cookie('token', token, {
            httpOnly: true, // Prevents client-side JS from accessing the cookie
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
            maxAge: 3600000 // 1 hour
        });

        res.redirect('/dashboard');

    } catch (err) {
        console.error('Login error:', err);
        // Ensure success and message are null when error is present
        res.render('login', { error: 'Server error during login.', success: null, message: null });
    }
};

exports.logoutUser = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
};

exports.getRegisterPage = (req, res) => {
    // Always pass all expected variables, even if null
    res.render('register', { error: null, success: null });
};

exports.getLoginPage = (req, res) => {
    const message = req.query.message || null;
    const error = req.query.error || null;
    const success = req.query.success || null;
    // Always pass all expected variables
    res.render('login', { error, success, message });
};
