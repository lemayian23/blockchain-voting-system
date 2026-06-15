async function loadAdminData() {
    try {
        const tally = await getTally();
        const audit = await getAuditLog();
        
        // Tally display
        const tallyHtml = `
            <p><strong>Total Votes:</strong> ${tally.totalVotes}</p>
            ${Object.entries(tally.candidates || {}).map(([c, v]) => `<div class="tally-item">${c}: ${v} votes</div>`).join('')}
        `;
        document.getElementById('adminTally').innerHTML = tallyHtml;
        
        // Audit log
        const auditHtml = `
            <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse;">
                <thead><tr><th>Voter (hashed)</th><th>Voted For</th><th>Block</th><th>Time</th></tr></thead>
                <tbody>
                    ${audit.auditLog?.map(entry => `
                        <tr>
                            <td>${entry.voterHash}</td>
                            <td>${entry.candidateId}</td>
                            <td>${entry.blockIndex}</td>
                            <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4">No votes yet</td></tr>'}
                </tbody>
            </table>
            <p><em>Voter identities are hashed for privacy.</em></p>
        `;
        document.getElementById('auditLog').innerHTML = auditHtml;
        
        // Contract info
        if (audit.contractInfo) {
            document.getElementById('contractInfo').innerHTML = `
                <p>Contract Address: ${audit.contractInfo.contractAddress}</p>
                <p>Status: ${audit.contractInfo.electionStatus}</p>
                <p>Unique Voters: ${audit.contractInfo.uniqueVoters}</p>
                <p>Deployed: ${new Date(audit.contractInfo.deployedAt).toLocaleString()}</p>
            `;
        }
    } catch (err) {
        console.error('Error loading admin data:', err);
        document.getElementById('adminTally').innerHTML = 'Error loading data. Is server running?';
    }
}

document.getElementById('finalizeElectionBtn')?.addEventListener('click', async () => {
    if (confirm('Finalize election? No more votes can be cast.')) {
        const result = await finalizeElection();
        document.getElementById('finalizeResult').innerHTML = `<div class="status-badge status-ended">${result.message}</div>`;
        loadAdminData();
    }
});

document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadAdminData();
});

loadAdminData();
setInterval(loadAdminData, 10000);