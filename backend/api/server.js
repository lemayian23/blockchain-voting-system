const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Import our blockchain modules
const Blockchain = require('../blockchain/blockchain');
const Consensus = require('../network/consensus');
const VotingContract = require('../smartcontract/votingContract');
const VoteEncryption = require('../crypto/voteEncryption');

// Initialize system
const blockchain = new Blockchain(2);
const consensus = new Consensus();
const cryptoSystem = new VoteEncryption();
const electionKeys = cryptoSystem.generateElectionAuthorityKeys();

// Election period: now open for 24 hours
const startTime = Date.now();
const endTime = startTime + (24 * 60 * 60 * 1000);
const votingContract = new VotingContract(startTime, endTime);

// Mock student registry (in production, use database)
const studentRegistry = new Map();
const studentVoteStatus = new Map();

// Register mock students
const mockStudents = [
    { id: 'S001', name: 'Alice Mwangi', password: 'pass123', biometricHash: 'bio_hash_1' },
    { id: 'S002', name: 'Brian Ochieng', password: 'pass123', biometricHash: 'bio_hash_2' },
    { id: 'S003', name: 'Catherine Wanjiku', password: 'pass123', biometricHash: 'bio_hash_3' }
];

mockStudents.forEach(student => {
    studentRegistry.set(student.id, student);
    // Generate voter keys for each student
    const voterKeys = cryptoSystem.generateVoterKeys(student.id);
    studentRegistry.set(student.id + '_keys', voterKeys);
});

// Helper: hash voter ID
function hashVoterId(voterId) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(voterId + 'voting_salt_2024').digest('hex');
}

// Create HTTP server
const server = http.createServer((req, res) => {
    // Enable CORS for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // API Routes
    if (pathname === '/api/login' && req.method === 'POST') {
        handleLogin(req, res);
    } else if (pathname === '/api/cast-vote' && req.method === 'POST') {
        handleCastVote(req, res);
    } else if (pathname === '/api/election-status' && req.method === 'GET') {
        handleElectionStatus(req, res);
    } else if (pathname === '/api/tally' && req.method === 'GET') {
        handleTally(req, res);
    } else if (pathname === '/api/verify-vote' && req.method === 'POST') {
        handleVerifyVote(req, res);
    } else if (pathname === '/api/admin/finalize' && req.method === 'POST') {
        handleFinalizeElection(req, res);
    } else if (pathname === '/api/admin/audit' && req.method === 'GET') {
        handleAuditLog(req, res);
    } else if (pathname === '/' || pathname === '/student.html') {
        serveFile(res, '../frontend/pages/student.html', 'text/html');
    } else if (pathname === '/admin.html') {
        serveFile(res, '../frontend/pages/admin.html', 'text/html');
    } else if (pathname.startsWith('/css/')) {
        serveFile(res, `../frontend${pathname}`, 'text/css');
    } else if (pathname.startsWith('/js/')) {
        serveFile(res, `../frontend${pathname}`, 'application/javascript');
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

function serveFile(res, filePath, contentType) {
    const fullPath = path.join(__dirname, filePath);
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

function handleLogin(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const { studentId, password } = JSON.parse(body);
        const student = studentRegistry.get(studentId);
        
        if (student && student.password === password) {
            const hasVoted = votingContract.hasVoted(hashVoterId(studentId));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                student: { id: student.id, name: student.name },
                hasVoted: hasVoted,
                electionActive: votingContract.isElectionActive()
            }));
        } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
        }
    });
}

function handleCastVote(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const { studentId, candidateId, password } = JSON.parse(body);
        const student = studentRegistry.get(studentId);
        
        if (!student || student.password !== password) {
            res.writeHead(401);
            res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
            return;
        }
        
        const voterHash = hashVoterId(studentId);
        const voterKeys = studentRegistry.get(studentId + '_keys');
        
        // Create secured vote
        const securedVote = cryptoSystem.createSecuredVote(
            studentId,
            candidateId,
            voterKeys.privateKey,
            electionKeys.publicKey
        );
        
        // Cast vote via smart contract
        const blockIndex = blockchain.chain.length;
        const contractResult = votingContract.castVote(voterHash, candidateId, securedVote, blockIndex);
        
        if (contractResult.success) {
            // Add to blockchain pending votes
            blockchain.addVote({
                ...securedVote,
                voterHash: voterHash,
                candidateId: candidateId,
                timestamp: Date.now()
            });
            
            // Mine if we have threshold (simulate block creation)
            if (blockchain.pendingVotes.length >= 2) {
                const nextAuthority = consensus.getNextAuthority();
                if (nextAuthority) {
                    const newBlock = blockchain.minePendingVotes(nextAuthority.address);
                    // Update contract with block confirmation
                    for (const vote of newBlock.votes) {
                        votingContract.confirmVoteOnBlockchain(vote.voterHash, newBlock.index, newBlock.hash);
                    }
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: contractResult.message,
                transactionId: contractResult.transactionId,
                totalVotes: contractResult.totalVotes
            }));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: contractResult.reason }));
        }
    });
}

function handleElectionStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: votingContract.getElectionStatus(),
        startTime: votingContract.electionStartTime,
        endTime: votingContract.electionEndTime,
        isActive: votingContract.isElectionActive(),
        totalVotes: votingContract.totalVotes
    }));
}

function handleTally(req, res) {
    const tally = votingContract.getTally();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tally));
}

function handleVerifyVote(req, res) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        const { studentId, transactionId } = JSON.parse(body);
        const voterHash = hashVoterId(studentId);
        const verification = votingContract.verifyVote(voterHash, transactionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(verification));
    });
}

function handleFinalizeElection(req, res) {
    // Simple admin auth (in production, use proper auth)
    const result = votingContract.finalizeElection();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
}

function handleAuditLog(req, res) {
    // Only accessible by admin
    const auditLog = votingContract.getAuditLog();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ auditLog, contractInfo: votingContract.getContractInfo() }));
}

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Voting System API Server running on http://localhost:${PORT}`);
    console.log(`Student interface: http://localhost:${PORT}/student.html`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);
    
    // Register mock authorities for consensus
    consensus.registerAuthority("node_auth_001", "University Server - Main");
    consensus.registerAuthority("node_auth_002", "University Server - Backup");
    consensus.registerAuthority("node_auth_003", "University Server - Audit");
});