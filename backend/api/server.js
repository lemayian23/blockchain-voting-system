require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const { verifyToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');
const logger = require('../middleware/logger');
const { initSystem } = require('../init'); // see below

const authRoutes = require('./routes/auth');
const voteRoutes = require('./routes/vote');
const adminRoutes = require('./routes/admin');
const blockchainRoutes = require('./routes/blockchain');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimiter);
app.use(logger);

// Static frontend
app.use(express.static(path.join(__dirname, '../../frontend/public')));
app.use('/css', express.static(path.join(__dirname, '../../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/js')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vote', verifyToken, voteRoutes);
app.use('/api/admin', verifyToken, adminRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Frontend pages
app.get('/student.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/student.html'));
});
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/admin.html'));
});
app.get('/explorer.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/pages/explorer.html'));
});
app.get('/', (req, res) => res.redirect('/student.html'));

// Start server after initialization
const PORT = process.env.PORT || 3000;
initSystem().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Student: http://localhost:${PORT}/student.html`);
        console.log(`🔐 Admin:   http://localhost:${PORT}/admin.html`);
        console.log(`🔍 Explorer: http://localhost:${PORT}/explorer.html`);
    });
}).catch(err => {
    console.error('Failed to initialize:', err);
    process.exit(1);
});