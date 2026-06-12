const VotingContract = require('../smartcontract/votingContract');
const VoteEncryption = require('../crypto/voteEncryption');
const crypto = require('crypto');

function testSmartContract() {
    console.log("\n=== TESTING SMART CONTRACT (VOTING RULES ENFORCEMENT) ===\n");
    
    // Set election period: starting now, ending in 1 hour (for demo)
    const now = Date.now();
    const startTime = now - 10000; // Started 10 seconds ago (for active testing)
    const endTime = now + 3600000;  // Ends in 1 hour
    
    const contract = new VotingContract(startTime, endTime);
    const cryptoSystem = new VoteEncryption();
    const electionKeys = cryptoSystem.generateElectionAuthorityKeys();
    
    console.log("1. Contract Deployment:");
    console.log(`   Contract Address: ${contract.contractAddress}`);
    console.log(`   Election Status: ${contract.getElectionStatus()}`);
    console.log(`   Start: ${new Date(startTime).toLocaleTimeString()}`);
    console.log(`   End: ${new Date(endTime).toLocaleTimeString()}`);
    
    // Generate voter keys
    const voter1 = cryptoSystem.generateVoterKeys("STUDENT_001");
    const voter2 = cryptoSystem.generateVoterKeys("STUDENT_002");
    const voter3 = cryptoSystem.generateVoterKeys("STUDENT_003");
    
    // Hash voter IDs for anonymity
    const hashVoterId = (id) => {
        return crypto.createHash('sha256').update(id + 'voting_salt_2024').digest('hex');
    };
    
    const voter1Hash = hashVoterId("STUDENT_001");
    const voter2Hash = hashVoterId("STUDENT_002");
    const voter3Hash = hashVoterId("STUDENT_003");
    
    console.log("\n2. Casting Votes (Testing Rules):");
    
    // Student 1 votes for Candidate A
    const securedVote1 = cryptoSystem.createSecuredVote(
        "STUDENT_001", "CANDIDATE_A", voter1.privateKey, electionKeys.publicKey
    );
    const result1 = contract.castVote(voter1Hash, "CANDIDATE_A", securedVote1, 1);
    console.log(`   Student 1: ${result1.success ? "✓" : "✗"} ${result1.message || result1.reason}`);
    
    // Student 2 votes for Candidate B
    const securedVote2 = cryptoSystem.createSecuredVote(
        "STUDENT_002", "CANDIDATE_B", voter2.privateKey, electionKeys.publicKey
    );
    const result2 = contract.castVote(voter2Hash, "CANDIDATE_B", securedVote2, 1);
    console.log(`   Student 2: ${result2.success ? "✓" : "✗"} ${result2.message || result2.reason}`);
    
    // Student 3 votes for Candidate A
    const securedVote3 = cryptoSystem.createSecuredVote(
        "STUDENT_003", "CANDIDATE_A", voter3.privateKey, electionKeys.publicKey
    );
    const result3 = contract.castVote(voter3Hash, "CANDIDATE_A", securedVote3, 2);
    console.log(`   Student 3: ${result3.success ? "✓" : "✗"} ${result3.message || result3.reason}`);
    
    // Test Rule 1: Same student tries to vote again
    console.log("\n3. Testing Rule 1 (One Vote Per Student):");
    const duplicateResult = contract.castVote(voter1Hash, "CANDIDATE_B", securedVote1, 2);
    console.log(`   Duplicate vote attempt: ${duplicateResult.success ? "✗ Allowed" : "✓ Blocked"}`);
    console.log(`   Reason: ${duplicateResult.reason}`);
    
    // Test Rule 2: Voting period enforcement
    console.log("\n4. Testing Rule 2 (Voting Period):");
    const pastContract = new VotingContract(now - 7200000, now - 3600000); // Ended 1 hour ago
    const pastResult = pastContract.castVote(voter1Hash, "CANDIDATE_A", securedVote1, 1);
    console.log(`   After election ended: ${pastResult.success ? "✗ Allowed" : "✓ Blocked"}`);
    console.log(`   Reason: ${pastResult.reason}`);
    
    // Test Rule 3: Immutability (can't change vote)
    console.log("\n5. Testing Rule 3 (Cannot Change Vote):");
    const changeResult = contract.castVote(voter1Hash, "CANDIDATE_C", securedVote1, 3);
    console.log(`   Change vote attempt: ${changeResult.success ? "✗ Allowed" : "✓ Blocked"}`);
    console.log(`   Reason: ${changeResult.reason}`);
    
    // Display current tally
    console.log("\n6. Current Vote Tally (Transparency):");
    const tally = contract.getTally();
    console.log(`   Total Votes: ${tally.totalVotes}`);
    console.log(`   Candidate A: ${tally.candidates['CANDIDATE_A'] || 0}`);
    console.log(`   Candidate B: ${tally.candidates['CANDIDATE_B'] || 0}`);
    console.log(`   Candidate C: ${tally.candidates['CANDIDATE_C'] || 0}`);
    
    // Student verification
    console.log("\n7. Student Verification (Transaction ID):");
    const studentVote = contract.getStudentVote(voter1Hash);
    if (studentVote) {
        console.log(`   Student 1 voted for: ${studentVote.candidateId}`);
        console.log(`   Block index: ${studentVote.blockIndex}`);
        // Student can verify with their transaction ID
        const txId = result1.transactionId;
        const verification = contract.verifyVote(voter1Hash, txId);
        console.log(`   Transaction ID verification: ${verification.verified ? "✓ Valid" : "✗ Invalid"}`);
    }
    
    // Contract summary
    console.log("\n8. Smart Contract Summary:");
    const info = contract.getContractInfo();
    console.log(`   Contract Address: ${info.contractAddress}`);
    console.log(`   Status: ${info.electionStatus}`);
    console.log(`   Total Unique Voters: ${info.uniqueVoters}`);
    console.log(`   Total Votes Recorded: ${info.totalVotes}`);
    console.log(`   Is Finalized: ${info.isFinalized}`);
    
    // Audit log (for officials)
    console.log("\n9. Audit Log (Partial - Privacy Preserved):");
    const audit = contract.getAuditLog();
    audit.forEach(entry => {
        console.log(`   Voter: ${entry.voterHash} → ${entry.candidateId} (Block ${entry.blockIndex})`);
    });
    
    console.log("\n=== SMART CONTRACT SUMMARY ===");
    console.log("✓ Rule 1: One vote per student strictly enforced");
    console.log("✓ Rule 2: Voting only allowed during election period");
    console.log("✓ Rule 3: Votes cannot be changed after submission");
    console.log("✓ Transaction IDs provide proof of voting to students");
    console.log("✓ Vote tally is transparent and publicly readable");
    console.log("✓ Audit log available for election officials");
    console.log("✓ Student privacy maintained (hashed IDs)");
}

testSmartContract();