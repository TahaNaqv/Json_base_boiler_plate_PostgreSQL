const sequelizeWrapper = require('../../../../db/sequelize/sequelize');
const { models, db: Db } = sequelizeWrapper;
const auth = require('../../../../middleware/auth');
const constants = require('../../../../config/constants.json');
const { mergeExtraData, sha256, generateRandomString } = require('../../../../helpers/common');
const { pageQuery, paginateResult } = require('../../../../helpers/pagination');

const ROLE_USER = 2;

function publicUser(user) {
    if (!user) return null;
    const data = typeof user.toJSON === 'function' ? user.toJSON() : user;
    delete data.password;
    return {
        id: data.id,
        email: data.email,
        roleId: data.roleId,
        role: data.role && data.role.roleName ? data.role.roleName : null,
        status: data.status,
        extraData: data.extraData || null,
        createdAt: data.createdAt || data.created_at,
        updatedAt: data.updatedAt || data.updated_at,
    };
}

function validateExtraDataSize(extraData) {
    if (extraData == null) return null;
    const max = constants.extraDataMaxBytes || 65536;
    const size = Buffer.byteLength(JSON.stringify(extraData), 'utf8');
    if (size > max) {
        const err = new TypeError('extra_data_too_large');
        err.statusCode = 422;
        return err;
    }
    return null;
}

function ttlToSeconds(value) {
    const fallback = 900;
    if (!value) return fallback;
    if (typeof value === 'number') return value;
    const m = String(value).match(/^(\d+)\s*([smhd])?$/i);
    if (!m) return fallback;
    const n = parseInt(m[1], 10);
    const u = (m[2] || 's').toLowerCase();
    const mult = { s: 1, m: 60, h: 3600, d: 86400 }[u] || 1;
    return n * mult;
}

exports.register = async function register(body) {
    const sizeErr = validateExtraDataSize(body.extraData);
    if (sizeErr) return [null, sizeErr];

    const repo = new Db(models.users);
    const [existing] = await repo.fetchOne({ email: body.email });
    if (existing) {
        const err = new TypeError('duplicate_email');
        err.statusCode = 422;
        return [null, err];
    }

    return repo.create({
        roleId: ROLE_USER,
        email: body.email,
        password: body.password,
        status: 'active',
        extraData: body.extraData || null,
    });
};

exports.login = async function login(body, ctx = {}) {
    const userRepo = new Db(models.users);
    const [user, ferr] = await userRepo.findOne({
        where: { email: body.email },
        include: [{ model: models.roles, as: 'role' }],
    });
    if (ferr) return [null, ferr];

    const attemptRepo = new Db(models.login_attempts);

    if (!user) {
        await attemptRepo.create({
            email: body.email,
            attemptStatus: 'FAILURE',
            extraData: { reason: 'unknown_email', ip: ctx.ip || null, userAgent: ctx.userAgent || null },
        });
        const err = new TypeError('invalid_credentials');
        err.statusCode = 401;
        return [null, err];
    }

    const ok = await user.validatePassword(body.password);
    if (!ok) {
        await attemptRepo.create({
            email: body.email,
            attemptStatus: 'FAILURE',
            extraData: { userId: user.id, reason: 'invalid_password', ip: ctx.ip || null, userAgent: ctx.userAgent || null },
        });
        const err = new TypeError('invalid_credentials');
        err.statusCode = 401;
        return [null, err];
    }

    if (user.status !== 'active') {
        await attemptRepo.create({
            email: body.email,
            attemptStatus: 'FAILURE',
            extraData: { userId: user.id, reason: 'account_inactive', ip: ctx.ip || null, userAgent: ctx.userAgent || null },
        });
        const err = new TypeError('account_inactive');
        err.statusCode = 401;
        return [null, err];
    }

    const refreshTokenRaw = generateRandomString(constants.tokens && constants.tokens.refreshTokenBytes ? constants.tokens.refreshTokenBytes : 48);

    const authRepo = new Db(models.authorizations);
    const [authRow, aerr] = await authRepo.create({
        userId: user.id,
        refreshTokenHash: sha256(refreshTokenRaw),
        extraData: {
            ip: ctx.ip || null,
            userAgent: ctx.userAgent || null,
            issuedAt: new Date().toISOString(),
        },
    });
    if (aerr) return [null, aerr];

    await attemptRepo.create({
        email: body.email,
        attemptStatus: 'SUCCESS',
        extraData: { userId: user.id, ip: ctx.ip || null, userAgent: ctx.userAgent || null },
    });

    const role = user.role && user.role.roleName ? user.role.roleName : 'user';
    const accessToken = auth.signAccessToken({ sub: user.id, jti: authRow.id, role });
    const accessExpires = ttlToSeconds(process.env.JWT_ACCESS_TTL || '15m');

    return [{
        accessToken,
        refreshToken: `${authRow.id}.${refreshTokenRaw}`,
        expiresIn: accessExpires,
        user: publicUser(user),
    }, null];
};

exports.refreshToken = async function refreshToken(refreshTokenStr) {
    if (!refreshTokenStr || typeof refreshTokenStr !== 'string') {
        const err = new TypeError('invalid_refresh_token');
        err.statusCode = 401;
        return [null, err];
    }
    const dot = refreshTokenStr.indexOf('.');
    if (dot < 1) {
        const err = new TypeError('invalid_refresh_token');
        err.statusCode = 401;
        return [null, err];
    }
    const jti = refreshTokenStr.slice(0, dot);
    const raw = refreshTokenStr.slice(dot + 1);

    const authRepo = new Db(models.authorizations);
    const [authRow] = await authRepo.find(jti);
    if (!authRow) {
        const err = new TypeError('invalid_refresh_token');
        err.statusCode = 401;
        return [null, err];
    }

    if (!authRow.refreshTokenHash || authRow.refreshTokenHash !== sha256(raw)) {
        await authRow.destroy();
        const err = new TypeError('invalid_refresh_token');
        err.statusCode = 401;
        return [null, err];
    }

    const user = await models.users.scope('withRole').findByPk(authRow.userId);
    if (!user || user.status !== 'active') {
        await authRow.destroy();
        const err = new TypeError('invalid_refresh_token');
        err.statusCode = 401;
        return [null, err];
    }

    const newRaw = generateRandomString(constants.tokens && constants.tokens.refreshTokenBytes ? constants.tokens.refreshTokenBytes : 48);
    authRow.refreshTokenHash = sha256(newRaw);
    authRow.extraData = mergeExtraData(authRow.extraData, { rotatedAt: new Date().toISOString() });
    await authRow.save();

    const role = user.role && user.role.roleName ? user.role.roleName : 'user';
    const accessToken = auth.signAccessToken({ sub: user.id, jti: authRow.id, role });
    const accessExpires = ttlToSeconds(process.env.JWT_ACCESS_TTL || '15m');

    return [{
        accessToken,
        refreshToken: `${authRow.id}.${newRaw}`,
        expiresIn: accessExpires,
    }, null];
};

exports.logout = async function logout(authorization) {
    if (!authorization) {
        const err = new TypeError('invalid_token');
        err.statusCode = 401;
        return [null, err];
    }
    await authorization.destroy();
    return [{ __messageKey: 'logged_out' }, null];
};

exports.getProfile = async function getProfile(user) {
    return [publicUser(user), null];
};

exports.list = async function list(body) {
    const { page, limit, offset } = pageQuery(body || {});
    const where = {};
    if (body && body.filter) {
        if (body.filter.status) where.status = body.filter.status;
        if (body.filter.email) where.email = body.filter.email;
        if (body.filter.roleId) where.roleId = body.filter.roleId;
    }
    const repo = new Db(models.users);
    const [result, err] = await repo.findAndCountAll({
        where,
        offset,
        limit,
        order: [['id', 'DESC']],
        include: [{ model: models.roles, as: 'role' }],
    });
    if (err) return [null, err];
    const rows = result.rows.map(publicUser);
    return [paginateResult({ rows, count: result.count, page, limit }), null];
};

exports.update = async function update(body, actor) {
    if (!body) {
        const err = new TypeError('id_required');
        err.statusCode = 422;
        return [null, err];
    }

    const isAdmin = actor && actor.role && actor.role.roleName === 'admin';
    const targetId = body.id ? Number(body.id) : (actor ? actor.id : null);
    if (!targetId) {
        const err = new TypeError('id_required');
        err.statusCode = 422;
        return [null, err];
    }
    if (!isAdmin && actor && Number(targetId) !== Number(actor.id)) {
        const err = new TypeError('forbidden');
        err.statusCode = 403;
        return [null, err];
    }

    const sizeErr = validateExtraDataSize(body.extraData);
    if (sizeErr) return [null, sizeErr];

    const repo = new Db(models.users);
    const [user] = await repo.find(targetId, { include: [{ model: models.roles, as: 'role' }] });
    if (!user) {
        const err = new TypeError('user_not_found');
        err.statusCode = 404;
        return [null, err];
    }

    const patch = {};
    if (typeof body.email === 'string') patch.email = body.email;
    if (typeof body.password === 'string') patch.password = body.password;
    if (typeof body.status === 'string' && isAdmin) patch.status = body.status;
    if (body.roleId && isAdmin) patch.roleId = Number(body.roleId);
    if (body.extraData !== undefined) {
        patch.extraData = mergeExtraData(user.extraData, body.extraData);
    }

    Object.assign(user, patch);
    await user.save();
    await user.reload({ include: [{ model: models.roles, as: 'role' }] });

    return [publicUser(user), null];
};

exports.remove = async function remove(body) {
    if (!body || !body.id) {
        const err = new TypeError('id_required');
        err.statusCode = 422;
        return [null, err];
    }
    const repo = new Db(models.users);
    const [user] = await repo.find(body.id);
    if (!user) {
        const err = new TypeError('user_not_found');
        err.statusCode = 404;
        return [null, err];
    }
    await user.destroy();
    await models.authorizations.destroy({ where: { userId: user.id } });
    return [{ id: user.id, deleted: true }, null];
};
