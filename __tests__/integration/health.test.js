const request = require('supertest');
const { getApp, closeDb } = require('../setup');

let app;
beforeAll(() => { app = getApp(); });
afterAll(async () => { await closeDb(); });

describe('health + auth gate', () => {
    test('GET /health returns ok (public)', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    test('unknown protected route returns 401 (auth gate first)', async () => {
        const res = await request(app).post('/api/v1/users/no-such-route');
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('invalid_token');
    });

    test('PUT method is rejected with 405', async () => {
        const res = await request(app).put('/health');
        expect(res.status).toBe(405);
        expect(res.body.status).toBe('error');
    });
});
