// =====================================================
// server.js - Blockchain Voting System API
// Integrated with PostgreSQL database
// =====================================================

require('dotenv').config();
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Import blockchain modules
const Blockchain = require('../blockchain/blockchain');
const Consensus = require('../network/consensus');
const VotingContract = require('../smartcontract/votingContract');
const VoteEncryption = require('../crypto/voteEncryption');

// Import database functions
const db = require('../db/queries');

// =====================================================
// 1. GLOBALS & HELPERS
// =====================================================

// Helper: hash voter ID (consistent with contract)
function hashVoterId(voterId) {
    const crypto = require('crypto');
    const salt = process.env.VOTING_SALT || 'voting_salt_2024';
    return crypto.createHash('sha256').update(voterId + salt).digest('hex');
}

// =====================================================
// 2. INITIALIZATION (async)
// =====================================================

let blockchain;
let consensus;
let cryptoSystem;
let electionKeys;
let votingContract;

async function initSystem() {
    // 1. Load election settings from DB
    const settings = await db.getElectionSettings();
    let startTime, endTime;

    if (settings) {
        startTime = new Date(settings.start_time).getTime();
        endTime = new Date(settings.end_time).getTime();
        console.log(`Election period loaded from DB: ${new Date(startTime).toLocaleString()} → ${new Date(endTime).toLocaleString()}`);
    } else {
        // Default: now → +24h
        const now = Date.now();
        startTime = now;
        endTime = now + 24 * 60 * 60 * 1000;
        await db.updateElectionSettings(new Date(startTime), new Date(endTime));
        console.log('Created default election settings (24h from now)');
    }

    // 2. Initialize core components
    blockchain = new Blockchain(2);
    consensus = new Consensus();
    cryptoSystem = new VoteEncryption();
    electionKeys = cryptoSystem.generateElectionAuthorityKeys();

    // 3. Smart contract with DB times
    votingContract = new VotingContract(startTime, endTime);

    // 4. Register authorities (consensus)
    consensus.registerAuthority('node_auth_001', 'University Server - Main');
    consensus.registerAuthority('node_auth_002', 'University Server - Backup');
    consensus.registerAuthority('node_auth_003', 'University Server - Audit');

    console.log('✅ Blockchain system initialized');
    console.log(`   • Contract address: ${votingContract.contractAddress}`);
    console.log(`   • Election status: ${votingContract.getElectionStatus()}`);
    console.log(`   • Authority nodes: ${consensus.authorityList.length}`);

    return { blockchain, consensus, votingContract };
}

// =====================================================
// 3. ROUTE HANDLERS
// =====================================================

// ----- POST /api/login -----
async function handleLogin(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const { studentId, password } = JSON.parse(body);
            const student = await db.verifyStudentPassword(studentId, password);
            if (!student) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
            }

            const voterHash = hashVoterId(studentId);
            const hasVotedContract = votingContract.hasVoted(voterHash);
            const hasVotedDB = student.has_voted; // boolean from DB
            const hasVoted = hasVotedContract || hasVotedDB;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                student: { id: student.id, name: student.name },
                hasVoted,
                electionActive: votingContract.isElectionActive()
            }));
        } catch (err) {
            console.error('Login error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: 'Server error' }));
        }
    });
}

// ----- POST /api/cast-vote -----
async function handleCastVote(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const { studentId, candidateId, password } = JSON.parse(body);
            const student = await db.verifyStudentPassword(studentId, password);
            if (!student) {
                res.writeHead(401);
                return res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
            }

            // Check if already voted (both contract and DB)
            const voterHash = hashVoterId(studentId);
            if (votingContract.hasVoted(voterHash) || student.has_voted) {
                res.writeHead(400);
                return res.end(JSON.stringify({ success: false, error: 'Student has already voted' }));
            }

            // Generate voter keys (in production, keys would be stored securely)
            const voterKeys = cryptoSystem.generateVoterKeys(studentId);
            const securedVote = cryptoSystem.createSecuredVote(
                studentId,
                candidateId,
                voterKeys.privateKey,
                electionKeys.publicKey
            );

            // Cast vote via smart contract
            const blockIndex = blockchain.chain.length;
            const contractResult = votingContract.castVote(
                voterHash,
                candidateId,
                securedVote,
                blockIndex
            );

            if (!contractResult.success) {
                res.writeHead(400);
                return res.end(JSON.stringify({ success: false, error: contractResult.reason }));
            }

            // Add to blockchain pending votes
            blockchain.addVote({
                ...securedVote,
                voterHash,
                candidateId,
                timestamp: Date.now()
            });

            // Mine if threshold reached (2 votes)
            if (blockchain.pendingVotes.length >= 2) {
                const authority = consensus.getNextAuthority();
                if (authority) {
                    const newBlock = blockchain.minePendingVotes(authority.address);
                    consensus.signBlock(newBlock, authority.address);
                    // Confirm votes in contract
                    for (const v of newBlock.votes) {
                        votingContract.confirmVoteOnBlockchain(v.voterHash, newBlock.index, newBlock.hash);
                    }
                }
            }

            // Log transaction to DB
            await db.logVoteTransaction(
                voterHash,
                candidateId,
                contractResult.transactionId,
                blockIndex
            );
            // Mark student as voted
            await db.setStudentVoted(studentId);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                transactionId: contractResult.transactionId,
                totalVotes: contractResult.totalVotes,
                message: 'Vote recorded successfully'
            }));

        } catch (err) {
            console.error('Cast vote error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ success: false, error: 'Server error' }));
        }
    });
}

// ----- GET /api/election-status -----
function handleElectionStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: votingContract.getElectionStatus(),
        startTime: votingContract.electionStartTime,
        endTime: votingContract.electionEndTime,
        isActive: votingContract.isElectionActive(),
        totalVotes: votingContract.totalVotes,
        uniqueVoters: votingContract.votedStudents.size
    }));
}

// ----- GET /api/tally -----
function handleTally(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(votingContract.getTally()));
}

// ----- POST /api/verify-vote -----
async function handleVerifyVote(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const { studentId, transactionId } = JSON.parse(body);
            const voterHash = hashVoterId(studentId);
            // First check contract
            const verification = votingContract.verifyVote(voterHash, transactionId);
            // Optionally cross-check with DB
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(verification));
        } catch (err) {
            console.error('Verify vote error:', err);
            res.writeHead(500);
            res.end(JSON.stringify({ verified: false, reason: 'Server error' }));
        }
    });
}

// ----- GET /api/candidates -----
async function handleGetCandidates(req, res) {
    try {
        const candidates = await db.getAllCandidates();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates }));
    } catch (err) {
        console.error('Get candidates error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to load candidates' }));
    }
}

// ----- POST /api/admin/finalize -----
async function handleFinalizeElection(req, res) {
    try {
        // Finalize in contract
        const result = votingContract.finalizeElection();
        if (result.success) {
            // Update DB
            await db.finalizeElection();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (err) {
        console.error('Finalize election error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: 'Server error' }));
    }
}

// ----- GET /api/admin/audit -----
function handleAuditLog(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        auditLog: votingContract.getAuditLog(),
        contractInfo: votingContract.getContractInfo()
    }));
}

// =====================================================
// 4. CREATE HTTP SERVER
// =====================================================

function createServer() {
    return http.createServer((req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        // ---------- API Routes ----------
        if (pathname === '/api/login' && req.method === 'POST') {
            return handleLogin(req, res);
        }
        if (pathname === '/api/cast-vote' && req.method === 'POST') {
            return handleCastVote(req, res);
        }
        if (pathname === '/api/election-status' && req.method === 'GET') {
            return handleElectionStatus(req, res);
        }
        if (pathname === '/api/tally' && req.method === 'GET') {
            return handleTally(req, res);
        }
        if (pathname === '/api/verify-vote' && req.method === 'POST') {
            return handleVerifyVote(req, res);
        }
        if (pathname === '/api/candidates' && req.method === 'GET') {
            return handleGetCandidates(req, res);
        }
        if (pathname === '/api/admin/finalize' && req.method === 'POST') {
            return handleFinalizeElection(req, res);
        }
        if (pathname === '/api/admin/audit' && req.method === 'GET') {
            return handleAuditLog(req, res);
        }

        // ---------- Static Files ----------
        // Map routes to frontend files
        let filePath = path.join(__dirname, '../frontend', pathname);
        if (pathname === '/') filePath = path.join(__dirname, '../frontend/pages/student.html');
        if (pathname === '/student.html') filePath = path.join(__dirname, '../frontend/pages/student.html');
        if (pathname === '/admin.html') filePath = path.join(__dirname, '../frontend/pages/admin.html');

        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        }[ext] || 'text/plain';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                return res.end('File not found');
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
}

// =====================================================
// 5. START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initSystem();
        const server = createServer();
        server.listen(PORT, () => {
            console.log(`🚀 Server running at http://localhost:${PORT}`);
            console.log(`📱 Student portal: http://localhost:${PORT}/student.html`);
            console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin.html`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();