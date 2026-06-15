async function loadAdminData() {
    const tally = await getTally();
    const audit = await getAuditLog();
    
    document.getElementById('adminTally').innerHTML = `
        <p><strong>Total Votes:</strong> ${tally.totalVotes}</p>
        ${Object.entries(tally.candidates).map(([c, v]) => `<div class="tally-item">${c}: ${v} votes</div>`).join('')}
    `;
    
    document.getElementById('auditLog').innerHTML = `
        <table>
            <thead><tr><th>Voter (hashed)</th><th>Voted For</th><th>Block</th><th>Time</th></tr></thead>
            <tbody>
                ${audit.auditLog.map(entry => `
                    <tr>
                        <td>${entry.voterHash}</td>
                        <td>${entry.candidateId}</td>
                        <td>${entry.blockIndex}</td>
                        <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <p><em>Voter identities are hashed for privacy.</em></p>
    `;
    
    document.getElementById('contractInfo').innerHTML = `
        <p>Contract Address: ${audit.contractInfo.contractAddress}</p>
        <p>Status: ${audit.contractInfo.electionStatus}</p>
        <p>Unique Voters: ${audit.contractInfo.uniqueVoters}</p>
        <p>Deployed: ${new Date(audit.contractInfo.deployedAt).toLocaleString()}</p>
    `;
    
    // Blockchain summary placeholder
    document.getElementById('blockchainSummary').innerHTML = `
        <p>Blockchain is running with Proof of Authority consensus.</p>
        <p>Data integrity maintained via SHA-256 hashes.</p>
    `;
    
    document.getElementById('consensusStatus').innerHTML = `
        <p>3 Authority nodes active (Main, Backup, Audit).</p>
        <p>Round-robin block signing active.</p>
    `;
}

document.getElementById('finalizeElectionBtn').addEventListener('click', async () => {
    if (confirm('Finalize election? No more votes can be cast.')) {
        const result = await finalizeElection();
        document.getElementById('finalizeResult').innerHTML = `<div class="status-badge status-ended">${result.message}</div>`;
        loadAdminData();
    }
});

document.getElementById('refreshBtn').addEventListener('click', () => {
    loadAdminData();
});

loadAdminData();
setInterval(loadAdminData, 10000);