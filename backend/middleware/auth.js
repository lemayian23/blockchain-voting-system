const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

function generateToken(studentId, name) {
    return jwt.sign({ studentId, name }, JWT_SECRET, { expiresIn: '8h' });
}

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid token format' });
    }
    const token = parts[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.student = decoded; // { studentId, name, iat, exp }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { generateToken, verifyToken };