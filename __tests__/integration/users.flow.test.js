const request = require('supertest');
const { getApp, syncDb, seedRoles, getModels, closeDb } = require('../setup');

let app;

beforeAll(async () => {
    app = getApp();
    await syncDb();
    await seedRoles();
});

afterAll(async () => {
    await closeDb();
});

describe('users module: full flow', () => {
    const creds = { email: 'jane.doe@example.com', password: 'StrongPass1!' };
    let accessToken;
    let refreshToken;

    test('register creates a user', async () => {
        const res = await request(app)
            .post('/api/v1/users/register')
            .send({ ...creds, extraData: { name: 'Jane Doe', preferences: { language: 'en' } } });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.email).toBe(creds.email);
        expect(res.body.data.password).toBeUndefined();
        expect(res.body.data.extraData).toEqual({ name: 'Jane Doe', preferences: { language: 'en' } });
    });

    test('register rejects duplicate email', async () => {
        const res = await request(app).post('/api/v1/users/register').send(creds);
        expect(res.status).toBe(422);
        expect(res.body.status).toBe('error');
    });

    test('login returns access + refresh tokens', async () => {
        const res = await request(app).post('/api/v1/users/login').send(creds);
        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeTruthy();
        expect(res.body.data.refreshToken).toBeTruthy();
        expect(res.body.data.expiresIn).toBeGreaterThan(0);
        expect(res.body.data.user.email).toBe(creds.email);
        accessToken = res.body.data.accessToken;
        refreshToken = res.body.data.refreshToken;

        const auths = await getModels().authorizations.findAll();
        expect(auths.length).toBe(1);
    });

    test('login rejects bad password', async () => {
        const res = await request(app).post('/api/v1/users/login').send({ email: creds.email, password: 'wrong-pass-123' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('invalid_credentials');
    });

    test('profile requires JWT', async () => {
        const res = await request(app).post('/api/v1/users/profile');
        expect(res.status).toBe(401);
    });

    test('profile returns the user when authenticated', async () => {
        const res = await request(app)
            .post('/api/v1/users/profile')
            .set('Authorization', `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(creds.email);
    });

    test('update merges extraData rather than replacing', async () => {
        const res = await request(app)
            .post('/api/v1/users/update')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ extraData: { phoneNumber: '+966500000000' } });
        expect(res.status).toBe(200);
        expect(res.body.data.extraData.name).toBe('Jane Doe');
        expect(res.body.data.extraData.phoneNumber).toBe('+966500000000');
        expect(res.body.data.extraData.preferences).toEqual({ language: 'en' });
    });

    test('refresh-token rotates the session and burns on replay', async () => {
        const rotated = await request(app)
            .post('/api/v1/users/refresh-token')
            .send({ refreshToken });
        expect(rotated.status).toBe(200);
        expect(rotated.body.data.accessToken).toBeTruthy();
        expect(rotated.body.data.refreshToken).toBeTruthy();
        expect(rotated.body.data.refreshToken).not.toBe(refreshToken);

        const replay = await request(app)
            .post('/api/v1/users/refresh-token')
            .send({ refreshToken });
        expect(replay.status).toBe(401);
        expect(replay.body.error).toBe('invalid_refresh_token');

        const stillNew = await request(app)
            .post('/api/v1/users/refresh-token')
            .send({ refreshToken: rotated.body.data.refreshToken });
        expect(stillNew.status).toBe(401);
    });

    test('logout deletes the authorization row', async () => {
        const login = await request(app).post('/api/v1/users/login').send(creds);
        expect(login.status).toBe(200);
        const freshAccess = login.body.data.accessToken;

        const res = await request(app)
            .post('/api/v1/users/logout')
            .set('Authorization', `Bearer ${freshAccess}`);
        expect(res.status).toBe(200);

        const after = await request(app)
            .post('/api/v1/users/profile')
            .set('Authorization', `Bearer ${freshAccess}`);
        expect(after.status).toBe(401);
        expect(after.body.error).toBe('access_token_expired');
    });

    test('non-admin cannot list users', async () => {
        const login = await request(app).post('/api/v1/users/login').send(creds);
        const userToken = login.body.data.accessToken;

        const list = await request(app)
            .post('/api/v1/users/list')
            .set('Authorization', `Bearer ${userToken}`)
            .send({});
        expect(list.status).toBe(403);
        expect(list.body.error).toBe('forbidden');
    });
});
