const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;

module.exports = function (sequelize, DataTypes) {
    const Model = sequelize.define('users', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            field: 'id',
        },
        roleId: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 2,
            field: 'role_id',
            references: {
                model: 'roles',
                key: 'id',
            },
        },
        email: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true,
            field: 'email',
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING(128),
            allowNull: true,
            field: 'passWord',
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'inactive'),
            allowNull: false,
            defaultValue: 'pending',
            field: 'status',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - firstName, lastName
            // - phone, countryCode
            // - avatarUrl
            // - timezone, locale
            // - lastLoginAt, lastLoginIp
            // - emailVerifiedAt, phoneVerifiedAt
            // - termsAcceptedAt, marketingOptIn
            // - metadata (any additional flags/attrs)
        },
    }, {
        tableName: 'users',
    });

    Model.prototype.toJSON = function () {
        const attrs = { ...this.get() };
        delete attrs.password;
        return attrs;
    };

    Model.prototype.hashPassword = async function () {
        if (this.password) {
            this.password = await bcrypt.hash(String(this.password), BCRYPT_ROUNDS);
        }
    };

    Model.prototype.validatePassword = async function (plain) {
        if (!this.password || !plain) return false;
        return bcrypt.compare(String(plain), String(this.password));
    };

    return Model;
};
