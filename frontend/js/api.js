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

async function getTally() {
    return apiRequest('/tally', 'GET');
}

async function getAuditLog() {
    return apiRequest('/admin/audit', 'GET');
}

async function finalizeElection() {
    return apiRequest('/admin/finalize', 'POST');
}