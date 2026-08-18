const express = require('express');
const db = require('../../db/queries');
const { generateToken } = require('../../middleware/auth');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { studentId, password } = req.body;
    try {
        const student = await db.verifyStudentPassword(studentId, password);
        if (!student) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        const token = generateToken(student.id, student.name);
        res.json({
            success: true,
            token,
            student: { id: student.id, name: student.name },
            hasVoted: student.has_voted || false
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

module.exports = router;