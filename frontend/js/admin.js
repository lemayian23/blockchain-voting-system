async function loadAdminData() {
    try {
        const tally = await getTally();
        const audit = await getAuditLog();
        
        // Tally display
        const tallyHtml = `
            <p><strong>Total Votes:</strong> ${tally.totalVotes || 0}</p>
            ${Object.entries(tally.candidates || {}).map(([c, v]) => `<div class="tally-item">${c}: ${v} votes</div>`).join('')}
        `;
        const tallyDiv = document.getElementById('adminTally');
        if (tallyDiv) tallyDiv.innerHTML = tallyHtml;
        
        // Audit log
        let auditHtml = '<table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;"><thead><tr><th>Voter (hashed)</th><th>Voted For</th><th>Block</th><th>Time</th></tr></thead><tbody>';
        if (audit.auditLog && audit.auditLog.length > 0) {
            audit.auditLog.forEach(entry => {
                auditHtml += `<tr><td>${entry.voterHash}</td><td>${entry.candidateId}</td><td>${entry.blockIndex}</td><td>${new Date(entry.timestamp).toLocaleTimeString()}</td></tr>`;
            });
        } else {
            auditHtml += '<tr><td colspan="4">No votes yet</td></tr>';
        }
        auditHtml += '</tbody></table><p><em>Voter identities are hashed for privacy.</em></p>';
        const auditDiv = document.getElementById('auditLog');
        if (auditDiv) auditDiv.innerHTML = auditHtml;
        
        // Contract info
        if (audit.contractInfo) {
            const contractDiv = document.getElementById('contractInfo');
            if (contractDiv) {
                contractDiv.innerHTML = `
                    <p>Contract Address: ${audit.contractInfo.contractAddress}</p>
                    <p>Status: ${audit.contractInfo.electionStatus}</p>
                    <p>Unique Voters: ${audit.contractInfo.uniqueVoters}</p>
                    <p>Deployed: ${new Date(audit.contractInfo.deployedAt).toLocaleString()}</p>
                `;
            }
        }
    } catch (err) {
        console.error('Error loading admin data:', err);
        const tallyDiv = document.getElementById('adminTally');
        if (tallyDiv) tallyDiv.innerHTML = 'Error loading data. Is server running?';
    }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const finalizeBtn = document.getElementById('finalizeElectionBtn');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', async () => {
            if (confirm('Finalize election? No more votes can be cast.')) {
                const result = await finalizeElection();
                const resultDiv = document.getElementById('finalizeResult');
                if (resultDiv) resultDiv.innerHTML = `<div class="status-badge status-ended">${result.message}</div>`;
                loadAdminData();
            }
        });
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAdminData());
    }
    
    loadAdminData();
    setInterval(loadAdminData, 10000);
});