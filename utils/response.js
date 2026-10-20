const customExceptions = require('./custom_exceptions.json');

class Response {
    constructor() {
        this.status = null;
        this.statusCode = null;
        this.message = null;
        this.messageAr = null;
        this.data = null;
        this.error = null;
        this.errorStack = null;
    }

    setSuccess(data, message, statusCode) {
        this.status = 'success';
        this.statusCode = statusCode || 200;
        this.message = message || customExceptions.en['200'];
        this.messageAr = customExceptions.ar['200'];
        this.data = data == null ? {} : data;
        this.error = null;
        return this;
    }

    setError(error, message, messageAr, statusCode) {
        this.status = 'error';
        this.statusCode = statusCode || 500;
        this.message = message || customExceptions.en[String(statusCode || 500)] || 'Error';
        this.messageAr = messageAr || customExceptions.ar[String(statusCode || 500)] || 'Error';
        this.data = {};
        this.error = error == null ? null : (typeof error === 'string' ? error : (error.message || String(error)));
        this.errorStack = null;
        return this;
    }

    setErrorStack(stack) {
        this.errorStack = stack || null;
        return this;
    }

    sendRes(req, res) {
        const includeStack = process.env.NODE_ENV !== 'production' && this.status === 'error';
        const body = {
            status: this.status,
            statusCode: this.statusCode,
            message: this.message,
            messageAr: this.messageAr,
            data: this.data,
            error: this.error,
            errorStack: includeStack ? this.errorStack : null,
        };
        return res.status(this.statusCode).json(body);
    }
}

module.exports = Response;
