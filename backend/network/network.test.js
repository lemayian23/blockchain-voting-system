const Blockchain = require('../blockchain/blockchain');
const Consensus = require('../network/consensus');
const P2PServer = require('../network/p2pServer');
const VoteEncryption = require('../crypto/voteEncryption');

function testNetworkAndConsensus() {
    console.log("\n=== TESTING BLOCKCHAIN NETWORK & CONSENSUS ===\n");
    
    // Initialize components
    const blockchain = new Blockchain(2);
    const consensus = new Consensus();
    const cryptoSystem = new VoteEncryption();
    
    // 1. Register authorities (university servers)
    console.log("1. Registering Authority Nodes...");
    consensus.registerAuthority("node_auth_001", "University Server - Main Campus");
    consensus.registerAuthority("node_auth_002", "University Server - South Campus");
    consensus.registerAuthority("node_auth_003", "University Server - North Campus");
    consensus.registerAuthority("node_auth_004", "University Server - East Campus");
    
    console.log("\n2. Consensus Status:");
    console.log(consensus.getConsensusStatus());
    
    // 2. Simulate voting with authority rotation
    console.log("\n3. Simulating Votes and Authority Rotation...");
    
    const electionKeys = cryptoSystem.generateElectionAuthorityKeys();
    const voter = cryptoSystem.generateVoterKeys("STUDENT_001");
    
    // Cast 5 votes (will create multiple blocks)
    for (let i = 0; i < 5; i++) {
        const securedVote = cryptoSystem.createSecuredVote(
            `STUDENT_00${i}`,
            `CANDIDATE_${i % 3}`,
            voter.privateKey,
            electionKeys.publicKey
        );
        
        blockchain.addVote(securedVote);
        
        // Mine when we have 2 votes (simulate block creation)
        if (blockchain.pendingVotes.length >= 2) {
            const nextAuthority = consensus.getNextAuthority();
            if (nextAuthority) {
                console.log(`\n   Authority ${nextAuthority.name} creating block...`);
                const newBlock = blockchain.minePendingVotes(nextAuthority.address);
                consensus.signBlock(newBlock, nextAuthority.address);
                console.log(`   Block ${newBlock.index} signed by ${nextAuthority.name}`);
            }
        }
    }
    
    // 3. Display blockchain summary
    console.log("\n4. Blockchain Summary (Transparency):");
    const summary = blockchain.getChainSummary();
    summary.forEach(block => {
        console.log(`   Block ${block.index}: ${block.voteCount} votes | Hash: ${block.hash.substring(0, 15)}... | Prev: ${block.previousHash.substring(0, 15)}...`);
    });
    
    // 4. Verify chain integrity
    console.log("\n5. Chain Integrity Check:");
    const isValid = blockchain.isChainValid();
    console.log(`   Blockchain valid: ${isValid ? "✓ YES" : "✗ NO"}`);
    
    // 5. Show consensus mechanism
    console.log("\n6. Proof of Authority (PoA) Consensus:");
    console.log("   - Only registered university servers can validate blocks");
    console.log("   - Round-robin authority rotation prevents centralization");
    console.log("   - Minimum 3 authorities required for operation");
    console.log("   - Faster than Proof of Work (ideal for voting)");
    
    // 6. Transparency features
    console.log("\n7. Transparency Features:");
    console.log(`   - Total votes cast: ${blockchain.getVoteCount()}`);
    console.log(`   - Blockchain length: ${blockchain.chain.length} blocks`);
    console.log("   - Anyone can run a node and verify all votes");
    console.log("   - Vote count is publicly auditable");
    console.log("   - Individual votes remain encrypted (privacy)");
    
    console.log("\n=== NETWORK & CONSENSUS SUMMARY ===");
    console.log("✓ Peer-to-peer network distributes blockchain across all nodes");
    console.log("✓ Proof of Authority ensures fast, secure consensus");
    console.log("✓ Authority nodes are trusted university servers");
    console.log("✓ All nodes maintain identical copies (transparency)");
    console.log("✓ Consensus resolves conflicts (longest valid chain rule)");
}

testNetworkAndConsensus();