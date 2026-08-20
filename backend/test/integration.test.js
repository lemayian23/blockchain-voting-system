const request = require('supertest');
const app = require('../api/server'); //export app from server.js

describe('Voting API', () => {
    let token;
    test('Login returns  token', async () => {
        const res await request(app)
            .post('api/auth/login')
            .send({ studentId: 'S001', password: 'pass123'});
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        token = res.body.token;
    });

    test('Cast vote with valid token', async () => {
        const res = await request(app)
            .post('/api/vote/cast')
            .set('Authorization', `Bearer ${token}`)
            .send({ candidateId: 'CANDIDATE_A'});
        expect(res.body.success).toBe(true);
    });
});