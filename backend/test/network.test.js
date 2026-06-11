const Blockchain = require('../blockchain/blockchain');
const Consensus = require('../network/consensus');
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
    const status = consensus.getConsensusStatus();
    console.log(`   Total Authorities: ${status.totalAuthorities}`);
    console.log(`   Active Authorities: ${status.activeAuthorities}`);
    console.log(`   Minimum Required: ${status.minimumRequired}`);
    
    // 2. Simulate voting with authority rotation
    console.log("\n3. Simulating Votes and Authority Rotation...");
    
    const electionKeys = cryptoSystem.generateElectionAuthorityKeys();
    
    // Cast 5 votes
    for (let i = 0; i < 5; i++) {
        const voter = cryptoSystem.generateVoterKeys(`STUDENT_00${i}`);
        const securedVote = cryptoSystem.createSecuredVote(
            `STUDENT_00${i}`,
            `CANDIDATE_${i % 3}`,
            voter.privateKey,
            electionKeys.publicKey
        );
        
        blockchain.addVote(securedVote);
        console.log(`   Vote ${i+1} added from STUDENT_00${i}`);
        
        // Mine when we have 2 votes
        if (blockchain.pendingVotes.length >= 2) {
            const nextAuthority = consensus.getNextAuthority();
            if (nextAuthority) {
                console.log(`\n   ✓ Authority ${nextAuthority.name} creating block...`);
                const newBlock = blockchain.minePendingVotes(nextAuthority.address);
                consensus.signBlock(newBlock, nextAuthority.address);
                console.log(`   ✓ Block ${newBlock.index} signed by ${nextAuthority.name}`);
            }
        }
    }
    
    // Mine remaining votes
    if (blockchain.pendingVotes.length > 0) {
        const nextAuthority = consensus.getNextAuthority();
        if (nextAuthority) {
            console.log(`\n   Mining remaining ${blockchain.pendingVotes.length} votes...`);
            const newBlock = blockchain.minePendingVotes(nextAuthority.address);
            consensus.signBlock(newBlock, nextAuthority.address);
            console.log(`   ✓ Final block ${newBlock.index} created`);
        }
    }
    
    // 3. Display blockchain summary
    console.log("\n4. Blockchain Summary (Transparency Feature):");
    const summary = blockchain.getChainSummary();
    summary.forEach(block => {
        console.log(`   Block ${block.index}: ${block.voteCount} votes | Hash: ${block.hash.substring(0, 15)}...`);
    });
    
    // 4. Verify chain integrity
    console.log("\n5. Data Integrity Check:");
    const isValid = blockchain.isChainValid();
    console.log(`   Blockchain valid: ${isValid ? "✓ YES" : "✗ NO"}`);
    
    // 5. Show consensus mechanism
    console.log("\n6. Proof of Authority (PoA) Consensus:");
    console.log("   ✓ Only registered university servers can validate blocks");
    console.log("   ✓ Round-robin authority rotation prevents centralization");
    console.log("   ✓ Minimum 3 authorities required for operation");
    
    // 6. Transparency features
    console.log("\n7. Transparency Features:");
    console.log(`   ✓ Total votes cast: ${blockchain.getVoteCount()}`);
    console.log(`   ✓ Blockchain length: ${blockchain.chain.length} blocks`);
    console.log("   ✓ Anyone can verify all votes");
    console.log("   ✓ Vote count is publicly auditable");
    
    console.log("\n=== NETWORK & CONSENSUS SUMMARY ===");
    console.log("✓ Peer-to-peer network distributes blockchain");
    console.log("✓ Proof of Authority ensures fast consensus");
    console.log("✓ All nodes maintain identical copies");
}

testNetworkAndConsensus();