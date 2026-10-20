/**
 * Boots the app and the in-memory SQLite DB for integration tests.
 * Usage:
 *   const { getApp, syncDb, seedRoles } = require('../setup');
 *   beforeAll(async () => { await syncDb(); await seedRoles(); });
 */
let _app = null;
let _connection = null;
let _models = null;

function getApp() {
    if (_app) return _app;
    _app = require('../app');
    const sequelize = require('../db/sequelize/sequelize');
    _connection = sequelize.connection;
    _models = sequelize.models;
    return _app;
}

function getModels() {
    if (!_models) getApp();
    return _models;
}

function getConnection() {
    if (!_connection) getApp();
    return _connection;
}

async function syncDb() {
    getApp();
    await _connection.sync({ force: true });
}

async function seedRoles() {
    const models = getModels();
    await models.roles.bulkCreate([
        { id: 1, roleName: 'admin', extraData: { description: 'admin' } },
        { id: 2, roleName: 'user', extraData: { description: 'user' } },
    ], { ignoreDuplicates: true });
}

async function closeDb() {
    if (_connection) await _connection.close();
    _connection = null;
    _models = null;
    _app = null;
}

module.exports = {
    getApp,
    getModels,
    getConnection,
    syncDb,
    seedRoles,
    closeDb,
};
