const express = require('express');

module.exports = function () {
    const router = express();
    router.use('/', require('./routes/notify')());
    return router;
};
