const { sequelize, connection } = require('./connection');
const Db = require('./instance');
const associations = require('./associations');
const hooks = require('./hooks');
const scopes = require('./scopes');

const models = {
    roles: require('../schemas/roles')(connection, sequelize),
    users: require('../schemas/users')(connection, sequelize),
    authorizations: require('../schemas/authorizations')(connection, sequelize),
    login_attempts: require('../schemas/login_attempts')(connection, sequelize),
    otp_verifications: require('../schemas/otp_verifications')(connection, sequelize),
    sent_email_logs: require('../schemas/sent_email_logs')(connection, sequelize),
};

associations(models);
hooks(models);
scopes(models);

module.exports = {
    sequelize,
    connection,
    models,
    db: Db,
};
