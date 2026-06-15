const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Import modules (adjust paths)
const Blockchain = require('./blockchain/blockchain');
const Consensus = require('./network/consensus');
const VotingContract = require('./smartcontract/votingContract');
const VoteEncryption = require('./crypto/voteEncryption');

// Initialize system
const blockchain = new Blockchain(2);
const consensus = new Consensus();
const cryptoSystem = new VoteEncryption();
const electionKeys = cryptoSystem.generateElectionAuthorityKeys();

const startTime = Date.now();
const endTime = startTime + (24 * 60 * 60 * 1000);
const votingContract = new VotingContract(startTime, endTime);

// Mock student registry
const studentRegistry = new Map();
mockStudents = [
    { id: 'S001', name: 'Alice Mwangi', password: 'pass123' },
    { id: 'S002', name: 'Brian Ochieng', password: 'pass123' },
    { id: 'S003', name: 'Catherine Wanjiku', password: 'pass123' }
];
mockStudents.forEach(student => {
    studentRegistry.set(student.id, student);
    const voterKeys = cryptoSystem.generateVoterKeys(student.id);
    studentRegistry.set(student.id + '_keys', voterKeys);
});

function hashVoterId(voterId) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(voterId + 'voting_salt_2024').digest('hex');
}

const server = http.createServer((req, res) => {
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
    
    // API routes (same as before, but simplified)
    if (pathname === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { studentId, password } = JSON.parse(body);
            const student = studentRegistry.get(studentId);
            if (student && student.password === password) {
                const hasVoted = votingContract.hasVoted(hashVoterId(studentId));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, student: { id: student.id, name: student.name }, hasVoted, electionActive: votingContract.isElectionActive() }));
            } else {
                res.writeHead(401);
                res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
            }
        });
    } 
    else if (pathname === '/api/cast-vote' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
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
            const securedVote = cryptoSystem.createSecuredVote(studentId, candidateId, voterKeys.privateKey, electionKeys.publicKey);
            const contractResult = votingContract.castVote(voterHash, candidateId, securedVote, blockchain.chain.length);
            if (contractResult.success) {
                blockchain.addVote({ ...securedVote, voterHash, candidateId, timestamp: Date.now() });
                // Auto-mine if 2 votes pending
                if (blockchain.pendingVotes.length >= 2) {
                    const authority = consensus.getNextAuthority();
                    if (authority) {
                        const newBlock = blockchain.minePendingVotes(authority.address);
                        for (const v of newBlock.votes) {
                            votingContract.confirmVoteOnBlockchain(v.voterHash, newBlock.index, newBlock.hash);
                        }
                    }
                }
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, transactionId: contractResult.transactionId, totalVotes: contractResult.totalVotes }));
            } else {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: contractResult.reason }));
            }
        });
    }
    else if (pathname === '/api/election-status' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: votingContract.getElectionStatus(), startTime, endTime, isActive: votingContract.isElectionActive(), totalVotes: votingContract.totalVotes }));
    }
    else if (pathname === '/api/tally' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify(votingContract.getTally()));
    }
    else if (pathname === '/api/verify-vote' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { studentId, transactionId } = JSON.parse(body);
            const voterHash = hashVoterId(studentId);
            const verification = votingContract.verifyVote(voterHash, transactionId);
            res.writeHead(200);
            res.end(JSON.stringify(verification));
        });
    }
    else if (pathname === '/api/admin/finalize' && req.method === 'POST') {
        const result = votingContract.finalizeElection();
        res.writeHead(200);
        res.end(JSON.stringify(result));
    }
    else if (pathname === '/api/admin/audit' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ auditLog: votingContract.getAuditLog(), contractInfo: votingContract.getContractInfo() }));
    }
    else {
        // Serve static files from ../frontend (assuming frontend folder exists one level up)
        let filePath = path.join(__dirname, '../frontend', pathname === '/' ? 'pages/student.html' : pathname);
        if (pathname === '/student.html') filePath = path.join(__dirname, '../frontend/pages/student.html');
        if (pathname === '/admin.html') filePath = path.join(__dirname, '../frontend/pages/admin.html');
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript'
        }[ext] || 'text/plain';
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    }
});

// Register mock authorities
consensus.registerAuthority("node_auth_001", "University Server - Main");
consensus.registerAuthority("node_auth_002", "University Server - Backup");
consensus.registerAuthority("node_auth_003", "University Server - Audit");

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Student: http://localhost:${PORT}/student.html`);
    console.log(`Admin:   http://localhost:${PORT}/admin.html`);
});