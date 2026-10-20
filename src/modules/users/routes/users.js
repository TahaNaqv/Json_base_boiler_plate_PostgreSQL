const express = require('express');
const ctrl = require('../controllers/users');
const rules = require('../validations/users');
const { validate } = require('../validations/validation');
const authChecker = require('../../../../middleware/auth_checker');

module.exports = function () {
    const r = express.Router({ mergeParams: true });

    r.post('/register', rules.rule('register'), validate, ctrl.register);
    r.post('/login', rules.rule('login'), validate, ctrl.login);
    r.post('/refresh-token', rules.rule('refresh'), validate, ctrl.refreshToken);

    r.post('/logout', authChecker('admin,user'), ctrl.logout);
    r.post('/profile', authChecker('admin,user'), ctrl.profile);
    r.post('/list', authChecker('admin'), rules.rule('list'), validate, ctrl.list);
    r.post('/update', authChecker('admin,user'), rules.rule('update'), validate, ctrl.update);
    r.post('/remove', authChecker('admin'), rules.rule('remove'), validate, ctrl.remove);

    return r;
};
