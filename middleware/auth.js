const jwt = require('jsonwebtoken');
const { models } = require('../db/sequelize/sequelize');

const PUBLIC_PATHS = new Set([
    '/api/v1/users/register',
    '/api/v1/users/login',
    '/api/v1/users/refresh-token',
    '/health',
]);

function isPublic(req) {
    if (PUBLIC_PATHS.has(req.path)) return true;
    if (req.path === '/' || req.path === '') return true;
    return false;
}

function extractToken(req) {
    const header = req.headers.authorization || req.headers.Authorization;
    if (header && /^Bearer /i.test(header)) {
        return header.replace(/^Bearer /i, '').trim();
    }
    if (req.query && req.query.nekot) return String(req.query.nekot);
    return null;
}

function signAccessToken(payload) {
    const opts = {
        algorithm: 'HS256',
        expiresIn: process.env.JWT_ACCESS_TTL || '15m',
    };
    if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
    if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
    return jwt.sign(payload, process.env.JWT_SECRET, opts);
}

function verifyToken(token) {
    const opts = { algorithms: ['HS256'] };
    if (process.env.JWT_ISSUER) opts.issuer = process.env.JWT_ISSUER;
    if (process.env.JWT_AUDIENCE) opts.audience = process.env.JWT_AUDIENCE;
    return jwt.verify(token, process.env.JWT_SECRET, opts);
}

async function authMiddleware(req, _res, next) {
    if (isPublic(req)) return next();

    const token = extractToken(req);
    if (!token) {
        const err = new Error('invalid_token');
        err.statusCode = 401;
        return next(err);
    }

    let decoded;
    try {
        decoded = verifyToken(token);
    } catch (e) {
        const code = e && e.name === 'TokenExpiredError' ? 'access_token_expired' : 'invalid_token';
        const err = new Error(code);
        err.statusCode = 401;
        return next(err);
    }

    if (decoded && decoded.type === 'refresh') {
        const err = new Error('invalid_token');
        err.statusCode = 401;
        return next(err);
    }

    try {
        const auth = await models.authorizations.findByPk(decoded.jti);
        if (!auth) {
            const err = new Error('access_token_expired');
            err.statusCode = 401;
            return next(err);
        }
        const user = await models.users.scope('withRole').findByPk(decoded.sub);
        if (!user) {
            const err = new Error('access_token_expired');
            err.statusCode = 401;
            return next(err);
        }
        req.appUser = user;
        req.appUserRole = decoded.role || (user.role && user.role.roleName);
        req.authorization = auth;
        return next();
    } catch (e) {
        return next(e);
    }
}

authMiddleware.signAccessToken = signAccessToken;
authMiddleware.PUBLIC_PATHS = PUBLIC_PATHS;

module.exports = authMiddleware;
