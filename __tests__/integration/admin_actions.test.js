const request = require('supertest');
const { getApp, syncDb, seedRoles, getModels, closeDb } = require('../setup');

let app;
let adminToken;

beforeAll(async () => {
    app = getApp();
    await syncDb();
    await seedRoles();

    const admin = await getModels().users.create({
        roleId: 1,
        email: 'admin@example.com',
        password: 'AdminPass1!',
        status: 'active',
        extraData: { name: 'Admin' },
    });

    const login = await request(app).post('/api/v1/users/login').send({
        email: 'admin@example.com',
        password: 'AdminPass1!',
    });
    expect(login.status).toBe(200);
    adminToken = login.body.data.accessToken;
    expect(admin.id).toBeTruthy();
});

afterAll(async () => {
    await closeDb();
});

describe('admin actions', () => {
    test('admin can list users', async () => {
        const res = await request(app)
            .post('/api/v1/users/list')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ page: 1, limit: 10 });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data.rows)).toBe(true);
        expect(res.body.data.count).toBeGreaterThanOrEqual(1);
    });

    test('admin can soft-delete a user', async () => {
        const created = await getModels().users.create({
            roleId: 2, email: 'tmp@example.com', password: 'TempPass1!', status: 'active',
        });

        const res = await request(app)
            .post('/api/v1/users/remove')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ id: created.id });
        expect(res.status).toBe(200);
        expect(res.body.data).toEqual({ id: created.id, deleted: true });

        const reloaded = await getModels().users.findByPk(created.id);
        expect(reloaded).toBeNull();
    });
});
