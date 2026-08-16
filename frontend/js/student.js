let currentStudent = null;
let selectedCandidate = null;

// Wait for DOM to load first
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const submitVoteBtn = document.getElementById('submitVoteBtn');
    if (submitVoteBtn) {
        submitVoteBtn.addEventListener('click', handleCastVote);
    }
    
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerify);
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Load election status and tally if already logged in (persistence)
    checkSession();
});

async function handleLogin(e) {
    e.preventDefault();
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('password').value;
    
    const result = await login(studentId, password);
    if (result.success) {
        currentStudent = result.student;
        document.getElementById('studentName').innerText = currentStudent.name;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('votingSection').style.display = 'block';
        
        if (result.hasVoted) {
            document.getElementById('hasVotedWarning').style.display = 'block';
            document.getElementById('submitVoteBtn').style.display = 'none';
        } else if (!result.electionActive) {
            const warningDiv = document.getElementById('hasVotedWarning');
            warningDiv.innerHTML = '⚠️ Election is not active.';
            warningDiv.style.display = 'block';
            document.getElementById('submitVoteBtn').style.display = 'none';
        } else {
            document.getElementById('submitVoteBtn').style.display = 'block';
        }
        
        loadElectionStatus();
        loadTally();
        loadCandidates();
        
        // Auto-refresh tally every 5 seconds
        if (window.tallyInterval) clearInterval(window.tallyInterval);
        window.tallyInterval = setInterval(loadTally, 5000);
    } else {
        alert('Login failed: ' + (result.error || 'Invalid credentials'));
    }
}

async function loadElectionStatus() {
    const status = await getElectionStatus();
    const statusDiv = document.getElementById('electionStatus');
    if (!statusDiv) return;
    
    let statusClass = '';
    if (status.status === 'ACTIVE') statusClass = 'status-active';
    else if (status.status === 'ENDED') statusClass = 'status-ended';
    else statusClass = 'status-notstarted';
    
    statusDiv.innerHTML = `Election Status: <span class="status-badge ${statusClass}">${status.status}</span>`;
}

async function loadTally() {
    const tally = await getTally();
    const tallyDiv = document.getElementById('tallyDisplay');
    if (!tallyDiv) return;
    
    let html = `<p><strong>Total Votes Cast:</strong> ${tally.totalVotes || 0}</p>`;
    if (tally.candidates) {
        for (const [candidate, count] of Object.entries(tally.candidates)) {
            html += `<div class="tally-item"><strong>${candidate}</strong>: ${count} votes</div>`;
        }
    } else {
        html += '<p>No votes yet.</p>';
    }
    tallyDiv.innerHTML = html;
}

function loadCandidates() {
    const candidates = ['CANDIDATE_A', 'CANDIDATE_B', 'CANDIDATE_C', 'CANDIDATE_D'];
    const container = document.getElementById('candidatesList');
    if (!container) return;
    
    container.innerHTML = '';
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'candidate-card';
        card.innerHTML = `
            <div class="candidate-name">${candidate}</div>
            <div class="candidate-desc">Student Representative Candidate</div>
        `;
        card.onclick = () => {
            document.querySelectorAll('.candidate-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCandidate = candidate;
            const submitBtn = document.getElementById('submitVoteBtn');
            if (submitBtn) submitBtn.style.display = 'block';
        };
        container.appendChild(card);
    });
}

async function handleCastVote() {
    if (!selectedCandidate) {
        alert('Please select a candidate first');
        return;
    }
    const password = prompt('Enter your password to confirm vote:');
    if (!password) return;
    
    const result = await castVote(currentStudent.id, selectedCandidate, password);
    if (result.success) {
        alert(`✓ Vote cast successfully!\nTransaction ID: ${result.transactionId}\nPlease save this ID to verify your vote later.`);
        location.reload(); // Reload to update UI
    } else {
        alert('Vote failed: ' + (result.error || 'Unknown error'));
    }
}

async function handleVerify() {
    const txId = document.getElementById('verifyTxId').value;
    if (!txId || !currentStudent) {
        alert('Enter Transaction ID');
        return;
    }
    const result = await verifyVote(currentStudent.id, txId);
    const resultDiv = document.getElementById('verificationResult');
    if (result.verified) {
        resultDiv.innerHTML = `<div class="status-active" style="padding:10px;">✓ Vote verified! You voted for ${result.vote.candidateId} at ${new Date(result.vote.timestamp).toLocaleString()}</div>`;
    } else {
        resultDiv.innerHTML = `<div class="warning">✗ Verification failed: ${result.reason || 'Invalid Transaction ID'}</div>`;
    }
}

function handleLogout() {
    currentStudent = null;
    selectedCandidate = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('votingSection').style.display = 'none';
    document.getElementById('loginForm').reset();
    if (window.tallyInterval) clearInterval(window.tallyInterval);
}

async function checkSession() {
    // Simple check: if we have currentStudent from earlier reload? Not persistent across page reloads.
    // Just show login by default.
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('votingSection').style.display = 'none';
}

//After successful vote, show QR code
function showQRCode(transactionId) {
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';  //clear
    const qr = new QRCode(qrContainer, {
        text: transactionId,
        width: 150,
        height: 150,
    });
    document.getElementById('qrSection').style.display = 'block';

}