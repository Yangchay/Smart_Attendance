const Student = require('../models/studentModel');

exports.addStudent = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id; // User ID from authenticated token

    if (!name) {
        return res.render('addStudent', { error: 'Student name is required.', success: null, user: req.user });
    }

    try {
        await Student.create(userId, name);
        res.render('addStudent', { success: 'Student added successfully!', error: null, user: req.user });
    } catch (err) {
        console.error('Error adding student:', err);
        res.render('addStudent', { error: 'Failed to add student. Please try again.', success: null, user: req.user });
    }
};

exports.getAddStudentPage = (req, res) => {
    res.render('addStudent', { error: null, success: null, user: req.user });
};

exports.getDashboard = async (req, res) => {
    try {
        const students = await Student.findByUserId(req.user.id);
        const currentDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        res.render('dashboard', {
            user: req.user,
            students: students,
            currentDate: currentDate,
            error: null,
            success: null
        });
    } catch (err) {
        console.error('Error fetching students for dashboard:', err);
        res.render('dashboard', { user: req.user, students: [], currentDate: new Date().toISOString().split('T')[0], error: 'Failed to load students.', success: null });
    }
};