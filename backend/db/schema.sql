-- Create database (run manually or via Docker)
CREATE DATABASE voting_system;

-- Connect to it
\c voting_system;

-- Students table
CREATE TABLE students (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    biometric_hash VARCHAR(255),
    public_key TEXT,
    private_key_encrypted TEXT,  -- In production, never store private keys; for demo we encrypt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    has_voted BOOLEAN DEFAULT FALSE
);

-- Candidates table
CREATE TABLE candidates (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    party VARCHAR(50),
    photo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Election settings (singleton table)
CREATE TABLE election_settings (
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_finalized BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log (optional, but we already have contract audit)
-- We'll keep audit in contract, but can also store transaction records
CREATE TABLE vote_transactions (
    id SERIAL PRIMARY KEY,
    voter_hash VARCHAR(64) NOT NULL,
    candidate_id VARCHAR(20) REFERENCES candidates(id),
    transaction_id VARCHAR(64) NOT NULL,
    block_index INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample candidates
INSERT INTO candidates (id, name, description, party)
VALUES 
    ('CANDIDATE_A', 'Alice Wanjiku', 'Student Welfare Advocate', 'Party of Progress'),
    ('CANDIDATE_B', 'Brian Otieno', 'Academic Excellence Champion', 'Education First'),
    ('CANDIDATE_C', 'Catherine Mwangi', 'Sports & Culture Leader', 'Unity Party'),
    ('CANDIDATE_D', 'David Kiprop', 'Tech Innovation Pioneer', 'Digital Kenya');

-- Insert sample student (password: pass123, hashed with bcrypt)
-- We'll generate this via code; provide a script later.