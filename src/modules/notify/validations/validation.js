const { validationResult } = require('express-validator');

exports.validate = function validate(req, _res, next) {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const first = errors.array({ onlyFirstError: true })[0];
    const err = new TypeError(first.msg || 'validation_failed');
    err.statusCode = 422;
    return next(err);
};
