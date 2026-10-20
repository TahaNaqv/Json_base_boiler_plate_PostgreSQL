const ALLOWED = new Set(['GET', 'POST', 'OPTIONS']);

module.exports = function allowedMethods(req, res, next) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (!ALLOWED.has(req.method)) {
        const err = new Error('method_not_allowed');
        err.statusCode = 405;
        return next(err);
    }
    next();
};
