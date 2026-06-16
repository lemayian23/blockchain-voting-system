const pool = require('./pool');
const bcrypt = require('bcrypt');

// Student operations
async function findStudentById(studentId) {
    const result = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
    return result.rows[0];
}

async function createStudent(studentId, name, password, biometricHash = null) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
        `INSERT INTO students (id, name, password_hash, biometric_hash) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [studentId, name, hashedPassword, biometricHash]
    );
    return result.rows[0];
}

async function verifyStudentPassword(studentId, plainPassword) {
    const student = await findStudentById(studentId);
    if (!student) return null;
    const isValid = await bcrypt.compare(plainPassword, student.password_hash);
    if (isValid) return student;
    return null;
}

async function setStudentVoted(studentId) {
    await pool.query('UPDATE students SET has_voted = TRUE WHERE id = $1', [studentId]);
}

// Candidate operations
async function getAllCandidates() {
    const result = await pool.query('SELECT * FROM candidates ORDER BY id');
    return result.rows;
}

async function getCandidateById(candidateId) {
    const result = await pool.query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
    return result.rows[0];
}

// Election settings
async function getElectionSettings() {
    const result = await pool.query(
        'SELECT * FROM election_settings ORDER BY id DESC LIMIT 1'
    );
    return result.rows[0];
}

async function updateElectionSettings(startTime, endTime) {
    // We'll just update the only row (id=1) or insert if missing
    const result = await pool.query(
        `INSERT INTO election_settings (id, start_time, end_time) 
         VALUES (1, $1, $2) 
         ON CONFLICT (id) DO UPDATE SET start_time = $1, end_time = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [startTime, endTime]
    );
    return result.rows[0];
}

async function finalizeElection() {
    const result = await pool.query(
        `UPDATE election_settings SET is_finalized = TRUE, updated_at = CURRENT_TIMESTAMP 
         WHERE id = 1 RETURNING *`
    );
    return result.rows[0];
}

// Vote transaction logging (optional)
async function logVoteTransaction(voterHash, candidateId, transactionId, blockIndex) {
    await pool.query(
        `INSERT INTO vote_transactions (voter_hash, candidate_id, transaction_id, block_index) 
         VALUES ($1, $2, $3, $4)`,
        [voterHash, candidateId, transactionId, blockIndex]
    );
}

async function getVoteTransactionByTxId(transactionId) {
    const result = await pool.query(
        'SELECT * FROM vote_transactions WHERE transaction_id = $1',
        [transactionId]
    );
    return result.rows[0];
}

module.exports = {
    findStudentById,
    createStudent,
    verifyStudentPassword,
    setStudentVoted,
    getAllCandidates,
    getCandidateById,
    getElectionSettings,
    updateElectionSettings,
    finalizeElection,
    logVoteTransaction,
    getVoteTransactionByTxId,
};