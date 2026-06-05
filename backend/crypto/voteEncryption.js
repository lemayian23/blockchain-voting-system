const crypto = require('crypto');

class VoteEncryption {
    constructor() {
        this.electionAuthorityPublicKey = null;
        this.electionAuthorityPrivateKey = null;
    }

    // Generate key pair for election authority (for decrypting votes)
    generateElectionAuthorityKeys() {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        this.electionAuthorityPublicKey = publicKey;
        this.electionAuthorityPrivateKey = privateKey;
        
        return { publicKey, privateKey };
    }

    // Encrypt a vote using election authority's public key
    encryptVote(voteData, publicKey) {
        try {
            const voteString = JSON.stringify(voteData);
            const encrypted = crypto.publicEncrypt(
                {
                    key: publicKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                Buffer.from(voteString)
            );
            return encrypted.toString('base64');
        } catch (error) {
            console.error('Encryption failed:', error);
            return null;
        }
    }

    // Decrypt a vote (only election authority can do this)
    decryptVote(encryptedVoteBase64, privateKey) {
        try {
            const encryptedBuffer = Buffer.from(encryptedVoteBase64, 'base64');
            const decrypted = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedBuffer
            );
            return JSON.parse(decrypted.toString());
        } catch (error) {
            console.error('Decryption failed:', error);
            return null;
        }
    }

    // Generate digital signature for a vote (proves voter authenticity)
    generateDigitalSignature(voterPrivateKey, voteHash) {
        const sign = crypto.createSign('SHA256');
        sign.update(voteHash);
        sign.end();
        return sign.sign(voterPrivateKey, 'base64');
    }

    // Verify digital signature (proves vote came from registered voter)
    verifyDigitalSignature(voterPublicKey, voteHash, signature) {
        const verify = crypto.createVerify('SHA256');
        verify.update(voteHash);
        verify.end();
        return verify.verify(voterPublicKey, Buffer.from(signature, 'base64'));
    }

    // Generate voter key pair (for demo - in real system, keys come from registrar)
    generateVoterKeys(voterId) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
        
        return {
            voterId,
            publicKey,
            privateKey
        };
    }

    // Create a complete secured vote packet
    createSecuredVote(voterId, candidateId, voterPrivateKey, electionPublicKey) {
        // 1. Create vote data
        const timestamp = Date.now();
        const voteData = {
            voterId: this.hashVoterId(voterId),  // Hash voter ID for anonymity
            candidateId: candidateId,
            timestamp: timestamp
        };
        
        // 2. Create vote hash (for signing)
        const voteHash = this.hashVoteData(voteData);
        
        // 3. Generate digital signature
        const signature = this.generateDigitalSignature(voterPrivateKey, voteHash);
        
        // 4. Encrypt the vote data
        const encryptedVote = this.encryptVote(voteData, electionPublicKey);
        
        // 5. Return secured vote packet
        return {
            encryptedVote: encryptedVote,
            signature: signature,
            voterPublicKey: null,  // Will be verified from voter registry
            timestamp: timestamp,
            voteHash: voteHash
        };
    }

    // Hash voter ID for anonymity (one-way function)
    hashVoterId(voterId) {
        return crypto.createHash('sha256')
            .update(voterId + 'voting_salt_2024')
            .digest('hex');
    }

    // Hash vote data for integrity
    hashVoteData(voteData) {
        return crypto.createHash('sha256')
            .update(JSON.stringify(voteData))
            .digest('hex');
    }

    // Verify a secured vote packet
    verifySecuredVote(securedVote, voterPublicKeyFromRegistry, electionPrivateKey) {
        try {
            // 1. Decrypt the vote
            const decryptedVote = this.decryptVote(securedVote.encryptedVote, electionPrivateKey);
            if (!decryptedVote) return { valid: false, reason: 'Decryption failed' };
            
            // 2. Recalculate vote hash
            const calculatedHash = this.hashVoteData(decryptedVote);
            
            // 3. Verify signature matches
            const signatureValid = this.verifyDigitalSignature(
                voterPublicKeyFromRegistry,
                calculatedHash,
                securedVote.signature
            );
            
            if (!signatureValid) return { valid: false, reason: 'Invalid signature' };
            
            // 4. Verify hash matches
            if (calculatedHash !== securedVote.voteHash) {
                return { valid: false, reason: 'Hash mismatch' };
            }
            
            return { 
                valid: true, 
                vote: decryptedVote,
                reason: 'Vote verified successfully'
            };
            
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }
}

module.exports = VoteEncryption;