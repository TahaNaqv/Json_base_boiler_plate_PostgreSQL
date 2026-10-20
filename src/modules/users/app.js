const express = require('express');

module.exports = function () {
    const router = express();
    router.use('/', require('./routes/users')());
    return router;
};
