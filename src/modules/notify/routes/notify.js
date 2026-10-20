const express = require('express');
const ctrl = require('../controllers/notify');
const authChecker = require('../../../../middleware/auth_checker');

module.exports = function () {
    const r = express.Router({ mergeParams: true });
    // TODO: define routes for the 'notify' module.
    r.post('/ping', authChecker('admin,user'), ctrl.ping);
    return r;
};
