const authChecker = require('../../middleware/auth_checker');

function call(mw, req) {
    return new Promise((resolve) => {
        mw(req, {}, (err) => resolve(err));
    });
}

describe('auth_checker middleware', () => {
    test('rejects when req.appUser is missing', async () => {
        const err = await call(authChecker('admin'), {});
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe('invalid_token');
        expect(err.statusCode).toBe(401);
    });

    test('rejects when role is not in allow-list', async () => {
        const err = await call(authChecker('admin'), { appUser: { id: 1 }, appUserRole: 'user' });
        expect(err.message).toBe('forbidden');
        expect(err.statusCode).toBe(403);
    });

    test('passes when role is in allow-list', async () => {
        const err = await call(authChecker('admin,user'), { appUser: { id: 1 }, appUserRole: 'user' });
        expect(err).toBeUndefined();
    });

    test('passes when allow-list is empty (auth only)', async () => {
        const err = await call(authChecker(''), { appUser: { id: 1 }, appUserRole: 'user' });
        expect(err).toBeUndefined();
    });
});
