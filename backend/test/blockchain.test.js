const Block = require('../blockchain/block');

// Test the block integrity mechanism
function testBlockIntegrity() {
    console.log("\n=== TESTING BLOCK INTEGRITY ===\n");
    
    // Create genesis block
    const genesisBlock = new Block(0, Date.now(), [], "0");
    genesisBlock.mineBlock(2);
    
    console.log("Genesis block created:", genesisBlock.getSummary());
    
    // Create a block with votes (votes are encrypted - will add encryption later)
    const votes = [
        { voterId: "encrypted_voter_1", candidateId: "candidate_A", signature: "sig_1" },
        { voterId: "encrypted_voter_2", candidateId: "candidate_B", signature: "sig_2" }
    ];
    
    const block1 = new Block(1, Date.now(), votes, genesisBlock.hash);
    block1.mineBlock(2);
    
    console.log("Block 1 created:", block1.getSummary());
    
    // Verify integrity
    console.log("\n--- Integrity Verification ---");
    console.log(`Block 1 integrity: ${block1.verifyIntegrity() ? "VALID ✓" : "FAILED ✗"}`);
    
    // Simulate tampering
    console.log("\n--- Simulating Tampering ---");
    block1.votes[0].candidateId = "candidate_C";  // Changing a vote
    console.log(`After tampering - Block 1 integrity: ${block1.verifyIntegrity() ? "VALID ✓" : "FAILED ✗"}`);
    
    // Recalculate hash to fix (shows how tampering is detected)
    console.log("\n--- Hash Mismatch ---");
    console.log(`Original hash: ${block1.hash}`);
    console.log(`Recalculated: ${block1.calculateHash()}`);
    
    console.log("\n✓ Data integrity maintained through cryptographic hashing");
}

testBlockIntegrity();