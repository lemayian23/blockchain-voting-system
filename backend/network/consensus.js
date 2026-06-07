// Proof of Authority (PoA) consensus mechanism for voting system
// PoA is ideal for voting as it's faster and nodes are trusted (university servers)

class Consensus {
    constructor() {
        this.authorities = new Map(); // address -> { isActive, stake, name }
        this.authorityList = [];
        this.currentAuthorityIndex = 0;
        this.minimumAuthorities = 3;
    }

    // Register an authority node (university server/validator)
    registerAuthority(address, name) {
        if (this.authorities.has(address)) {
            console.log(`Authority ${address} already registered`);
            return false;
        }
        
        const authority = {
            address: address,
            name: name,
            isActive: true,
            registeredAt: Date.now(),
            blocksSigned: 0
        };
        
        this.authorities.set(address, authority);
        this.authorityList.push(address);
        console.log(`Authority ${name} (${address}) registered successfully`);
        return true;
    }

    // Remove an authority (if compromised or offline)
    removeAuthority(address) {
        if (!this.authorities.has(address)) {
            return false;
        }
        
        this.authorities.delete(address);
        this.authorityList = this.authorityList.filter(addr => addr !== address);
        console.log(`Authority ${address} removed`);
        return true;
    }

    // Get next authority to create block (round-robin)
    getNextAuthority() {
        if (this.authorityList.length < this.minimumAuthorities) {
            console.log(`Insufficient authorities: ${this.authorityList.length}/${this.minimumAuthorities}`);
            return null;
        }
        
        const authorityAddress = this.authorityList[this.currentAuthorityIndex];
        this.currentAuthorityIndex = (this.currentAuthorityIndex + 1) % this.authorityList.length;
        
        const authority = this.authorities.get(authorityAddress);
        if (authority && authority.isActive) {
            return authority;
        }
        
        return this.getNextAuthority(); // Skip inactive and try next
    }

    // Verify that a block was signed by a valid authority
    verifyBlockAuthority(block, expectedAuthorityAddress) {
        // In real implementation, block would contain authority signature
        // For demo, we check if block has valid authority marker
        if (!block.authoritySignature) {
            console.log("Block missing authority signature");
            return false;
        }
        
        // Verify the signature (simplified for demo)
        const isValid = this.verifyAuthoritySignature(
            block.hash,
            block.authoritySignature,
            expectedAuthorityAddress
        );
        
        return isValid;
    }

    // Simplified signature verification (in production, use real crypto)
    verifyAuthoritySignature(blockHash, signature, authorityAddress) {
        // In real system: crypto.verify(blockHash, signature, authorityPublicKey)
        // For demo, we simulate
        const expectedSignature = this.generateMockSignature(blockHash, authorityAddress);
        return signature === expectedSignature;
    }

    // Generate mock signature for authority (replace with real crypto in production)
    generateMockSignature(data, authorityAddress) {
        const crypto = require('crypto');
        return crypto.createHash('sha256')
            .update(data + authorityAddress + "authority_secret")
            .digest('hex');
    }

    // Authority signs a block
    signBlock(block, authorityAddress) {
        const authority = this.authorities.get(authorityAddress);
        if (!authority || !authority.isActive) {
            console.log(`Authority ${authorityAddress} not active`);
            return false;
        }
        
        block.authoritySignature = this.generateMockSignature(block.hash, authorityAddress);
        block.authorityAddress = authorityAddress;
        authority.blocksSigned++;
        
        console.log(`Block ${block.index} signed by authority ${authority.name}`);
        return true;
    }

    // Reach consensus on which chain is valid (longest valid chain rule)
    reachConsensus(blockchain, peerChains) {
        console.log("\n=== REACHING CONSENSUS ===");
        
        let longestValidChain = blockchain.chain;
        let maxLength = blockchain.chain.length;
        
        for (const peerChain of peerChains) {
            if (peerChain.length > maxLength && this.validateChain(peerChain)) {
                maxLength = peerChain.length;
                longestValidChain = peerChain;
                console.log(`Found longer valid chain (length: ${maxLength})`);
            }
        }
        
        if (longestValidChain !== blockchain.chain) {
            console.log("Consensus reached: Replacing chain with longest valid chain");
            blockchain.chain = longestValidChain;
            return true;
        }
        
        console.log("Consensus reached: Current chain is already the longest valid chain");
        return false;
    }

    // Validate entire chain against consensus rules
    validateChain(chain) {
        if (!chain || chain.length === 0) return false;
        
        // Check genesis block
        if (chain[0].index !== 0 || chain[0].previousHash !== "0") {
            return false;
        }
        
        // Validate each block
        for (let i = 1; i < chain.length; i++) {
            const currentBlock = chain[i];
            const previousBlock = chain[i - 1];
            
            // Check hash integrity
            if (!this.validateBlockHash(currentBlock)) {
                console.log(`Block ${i} has invalid hash`);
                return false;
            }
            
            // Check chain linkage
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.log(`Block ${i} has incorrect previous hash`);
                return false;
            }
            
            // Check authority signature (PoA)
            if (!currentBlock.authoritySignature) {
                console.log(`Block ${i} missing authority signature`);
                return false;
            }
        }
        
        return true;
    }

    validateBlockHash(block) {
        const recalculatedHash = block.calculateHash();
        return block.hash === recalculatedHash;
    }

    getConsensusStatus() {
        return {
            totalAuthorities: this.authorityList.length,
            activeAuthorities: Array.from(this.authorities.values()).filter(a => a.isActive).length,
            minimumRequired: this.minimumAuthorities,
            currentAuthorityIndex: this.currentAuthorityIndex,
            authorities: Array.from(this.authorities.entries()).map(([addr, data]) => ({
                address: addr.substring(0, 10) + "...",
                name: data.name,
                isActive: data.isActive,
                blocksSigned: data.blocksSigned
            }))
        };
    }
}

module.exports = Consensus;