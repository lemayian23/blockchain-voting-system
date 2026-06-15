const API_BASE = 'http://localhost:3000/api';

async function apiRequest(endpoint, method, body) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    return response.json();
}

async function login(studentId, password) {
    return apiRequest('/login', 'POST', { studentId, password });
}

async function castVote(studentId, candidateId, password) {
    return apiRequest('/cast-vote', 'POST', { studentId, candidateId, password });
}

async function getElectionStatus() {
    return apiRequest('/election-status', 'GET');
}

async function getTally() {
    return apiRequest('/tally', 'GET');
}

async function verifyVote(studentId, transactionId) {
    return apiRequest('/verify-vote', 'POST', { studentId, transactionId });
}

async function finalizeElection() {
    return apiRequest('/admin/finalize', 'POST');
}

async function getAuditLog() {
    return apiRequest('/admin/audit', 'GET');
}