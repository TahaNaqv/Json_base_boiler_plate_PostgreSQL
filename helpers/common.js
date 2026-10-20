const crypto = require('crypto');

const SUPPORTED_LANGUAGES = ['en', 'ar'];

function languageSet(req, _res, next) {
    let lang = (req.headers['accept-language'] || req.headers['x-language'] || 'en')
        .toString()
        .split(',')[0]
        .trim()
        .toLowerCase()
        .slice(0, 2);
    if (!SUPPORTED_LANGUAGES.includes(lang)) lang = 'en';
    req.language = lang;
    next();
}

function generateRandomString(bytes = 32) {
    return crypto.randomBytes(bytes).toString('base64url');
}

function generateOtp(digits = 6) {
    const min = 10 ** (digits - 1);
    const max = 10 ** digits - 1;
    return Math.floor(min + Math.random() * (max - min + 1));
}

function sha256(input) {
    return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function mergeExtraData(existing, incoming) {
    const base = (existing && typeof existing === 'object' && !Array.isArray(existing)) ? existing : {};
    const next = (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) ? incoming : {};
    return Object.assign({}, base, next);
}

function notFound(req, _res, next) {
    const err = new Error('not_found');
    err.statusCode = 404;
    next(err);
}

module.exports = {
    SUPPORTED_LANGUAGES,
    languageSet,
    generateRandomString,
    generateOtp,
    sha256,
    mergeExtraData,
    notFound,
};
