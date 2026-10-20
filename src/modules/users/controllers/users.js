const service = require('../services/users');

function ctx(req) {
    return {
        ip: req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null,
        userAgent: req.headers['user-agent'] || null,
    };
}

exports.register = async function register(req, _res, next) {
    try {
        const [data, err] = await service.register(req.body || {});
        return next(err || data);
    } catch (e) { next(e); }
};

exports.login = async function login(req, _res, next) {
    try {
        const [data, err] = await service.login(req.body || {}, ctx(req));
        return next(err || data);
    } catch (e) { next(e); }
};

exports.refreshToken = async function refreshToken(req, _res, next) {
    try {
        const [data, err] = await service.refreshToken((req.body || {}).refreshToken);
        return next(err || data);
    } catch (e) { next(e); }
};

exports.logout = async function logout(req, _res, next) {
    try {
        const [data, err] = await service.logout(req.authorization);
        return next(err || data);
    } catch (e) { next(e); }
};

exports.profile = async function profile(req, _res, next) {
    try {
        const [data, err] = await service.getProfile(req.appUser);
        return next(err || data);
    } catch (e) { next(e); }
};

exports.list = async function list(req, _res, next) {
    try {
        const [data, err] = await service.list(req.body || {});
        return next(err || data);
    } catch (e) { next(e); }
};

exports.update = async function update(req, _res, next) {
    try {
        const [data, err] = await service.update(req.body || {}, req.appUser);
        return next(err || data);
    } catch (e) { next(e); }
};

exports.remove = async function remove(req, _res, next) {
    try {
        const [data, err] = await service.remove(req.body || {});
        return next(err || data);
    } catch (e) { next(e); }
};
