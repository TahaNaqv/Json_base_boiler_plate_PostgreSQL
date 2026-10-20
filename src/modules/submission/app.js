const express = require('express');

module.exports = function () {
    const router = express();
    router.use('/', require('./routes/submission')());
    return router;
};
