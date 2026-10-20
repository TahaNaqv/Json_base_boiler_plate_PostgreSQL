/**
 * Role allow-list middleware. Mount AFTER `middleware/auth.js`.
 *
 *   const authChecker = require('../../../../middleware/auth_checker');
 *   router.post('/list', authChecker('admin'), ctrl.list);
 *   router.post('/profile', authChecker('admin,user'), ctrl.profile);
 */
module.exports = function authChecker(allow) {
    const allowed = String(allow || '')
        .split(',')
        .map((r) => r.trim().toLowerCase())
        .filter(Boolean);

    return function (req, _res, next) {
        if (!req.appUser) {
            const err = new Error('invalid_token');
            err.statusCode = 401;
            return next(err);
        }
        const role = String(req.appUserRole || '').toLowerCase();
        if (allowed.length && !allowed.includes(role)) {
            const err = new Error('forbidden');
            err.statusCode = 403;
            return next(err);
        }
        return next();
    };
};
