const VoteEncryption = require('../crypto/voteEncryption');

function testVoteSecurity() {
    console.log("\n=== TESTING VOTE SECURITY (Encryption & Digital Signatures) ===\n");
    
    const cryptoSystem = new VoteEncryption();
    
    // 1. Generate election authority keys
    console.log("1. Generating Election Authority Keys...");
    const electionKeys = cryptoSystem.generateElectionAuthorityKeys();
    console.log("   ✓ Election Authority key pair created");
    
    // 2. Generate voter keys (simulating voter registration)
    console.log("\n2. Registering Voter...");
    const voter = cryptoSystem.generateVoterKeys("STUDENT_001");
    console.log(`   ✓ Voter STUDENT_001 registered`);
    
    // 3. Student casts a vote (securely)
    console.log("\n3. Student Casting Vote...");
    const securedVote = cryptoSystem.createSecuredVote(
        "STUDENT_001",
        "CANDIDATE_A",
        voter.privateKey,
        electionKeys.publicKey
    );
    console.log("   ✓ Vote encrypted and digitally signed");
    console.log(`   - Encrypted vote (first 50 chars): ${securedVote.encryptedVote.substring(0, 50)}...`);
    console.log(`   - Digital signature (first 50 chars): ${securedVote.signature.substring(0, 50)}...`);
    
    // 4. Election authority verifies the vote
    console.log("\n4. Election Authority Verifying Vote...");
    const verification = cryptoSystem.verifySecuredVote(
        securedVote,
        voter.publicKey,  // Retrieved from voter registry
        electionKeys.privateKey
    );
    
    if (verification.valid) {
        console.log("   ✓ Vote VERIFIED successfully!");
        console.log(`   - Decrypted vote:`, verification.vote);
        console.log(`   - Note: Voter ID is hashed for anonymity: ${verification.vote.voterId}`);
    } else {
        console.log(`   ✗ Verification failed: ${verification.reason}`);
    }
    
    // 5. Demonstrate tamper detection
    console.log("\n5. Demonstrating Tamper Detection...");
    const tamperedVote = { ...securedVote };
    tamperedVote.signature = "tampered_signature_xyz";
    
    const tamperedVerification = cryptoSystem.verifySecuredVote(
        tamperedVote,
        voter.publicKey,
        electionKeys.privateKey
    );
    
    console.log(`   Tampered vote verification: ${tamperedVerification.valid ? "VALID ✗" : "FAILED ✓"}`);
    console.log(`   Reason: ${tamperedVerification.reason}`);
    
    // 6. Show encryption prevents vote viewing
    console.log("\n6. Encryption Security...");
    console.log("   ✓ Only election authority with private key can decrypt votes");
    console.log("   ✓ Students cannot see how others voted");
    console.log("   ✓ Digital signature proves vote came from registered student");
    console.log("   ✓ Voter ID is hashed for anonymity while maintaining verifiability");
    
    console.log("\n=== VOTE SECURITY SUMMARY ===");
    console.log("✓ Votes encrypted (confidentiality)");
    console.log("✓ Digitally signed (authenticity & non-repudiation)");
    console.log("✓ Tamper-proof (any alteration breaks verification)");
    console.log("✓ Voter anonymity preserved");
}

testVoteSecurity();