const Sequelize = require('sequelize');
const config = require('../../config/config.json');

const env = process.env.NODE_ENV || 'development';
const envConfig = Object.assign({}, config[env]);

if (envConfig.dialect !== 'sqlite') {
    if (process.env.DATABASE_HOST) envConfig.host = process.env.DATABASE_HOST;
    if (process.env.DATABASE_PORT) envConfig.port = process.env.DATABASE_PORT;
}

let connection;
if (envConfig.dialect === 'sqlite') {
    connection = new Sequelize(envConfig);
} else {
    connection = new Sequelize(
        process.env.DATABASE_NAME,
        process.env.DATABASE_USER,
        process.env.DATABASE_PASS,
        envConfig,
    );
}

module.exports = {
    config,
    sequelize: Sequelize,
    connection,
};
