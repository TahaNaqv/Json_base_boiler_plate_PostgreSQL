const Response = require('../utils/response');
const customExceptions = require('../utils/custom_exceptions.json');
const logger = require('../utils/logger');

function pickMessage(lang, key, fallback) {
    const en = customExceptions.en || {};
    const ar = customExceptions.ar || {};
    return {
        message: en[key] || fallback || key,
        messageAr: ar[key] || ar[String(fallback)] || (en[key] || fallback || key),
    };
}

function isError(value) {
    return value instanceof Error;
}

module.exports = function responseHandler(payload, req, res, _next) {
    const language = req.language || 'en';
    const responder = new Response();

    if (!isError(payload)) {
        const data = payload == null ? {} : payload;
        const messageKey = (data && data.__messageKey) ? data.__messageKey : '200';
        if (data && data.__messageKey) delete data.__messageKey;
        const { message, messageAr } = pickMessage(language, messageKey, '200');
        responder.setSuccess(data, message, 200);
        responder.messageAr = messageAr;
        return responder.sendRes(req, res);
    }

    let statusCode = payload.statusCode || 500;
    if (payload.name === 'SequelizeUniqueConstraintError') statusCode = 409;
    if (payload.name === 'SequelizeValidationError') statusCode = 422;
    if (payload instanceof TypeError && !payload.statusCode) statusCode = 422;

    if (statusCode >= 500) {
        logger.error('unhandled server error', {
            module: 'response_handler',
            correlationId: req.correlationId || null,
            userId: req.appUser ? req.appUser.id : null,
            error: payload,
        });
    }

    const key = payload.message || String(statusCode);
    const en = customExceptions.en || {};
    const ar = customExceptions.ar || {};
    const message = en[key] || en[String(statusCode)] || payload.message || 'Error';
    const messageAr = ar[key] || ar[String(statusCode)] || message;

    responder.setError(payload, message, messageAr, statusCode);
    if (process.env.NODE_ENV !== 'production' && payload.stack) {
        responder.setErrorStack(payload.stack);
    }
    return responder.sendRes(req, res);
};
