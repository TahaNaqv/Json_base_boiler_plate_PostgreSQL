const handler = require('../../middleware/response_handler');

function fakeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('response_handler', () => {
    test('formats success payload', () => {
        const res = fakeRes();
        handler({ id: 1 }, { language: 'en' }, res, () => {});
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.status).toBe('success');
        expect(body.statusCode).toBe(200);
        expect(body.data).toEqual({ id: 1 });
        expect(body.error).toBeNull();
        expect(body.messageAr).toBeTruthy();
    });

    test('formats TypeError using custom_exceptions key', () => {
        const res = fakeRes();
        const err = new TypeError('invalid_credentials');
        err.statusCode = 401;
        handler(err, { language: 'en' }, res, () => {});
        expect(res.status).toHaveBeenCalledWith(401);
        const body = res.json.mock.calls[0][0];
        expect(body.status).toBe('error');
        expect(body.message).toMatch(/incorrect/);
        expect(body.messageAr).toBeTruthy();
    });

    test('uses 500 status for unknown error without statusCode', () => {
        const res = fakeRes();
        handler(new Error('boom'), { language: 'en' }, res, () => {});
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('strips __messageKey from data and translates it', () => {
        const res = fakeRes();
        handler({ __messageKey: 'logged_out' }, { language: 'en' }, res, () => {});
        const body = res.json.mock.calls[0][0];
        expect(body.message).toMatch(/Logged out/i);
        expect(body.data).toEqual({});
    });
});
