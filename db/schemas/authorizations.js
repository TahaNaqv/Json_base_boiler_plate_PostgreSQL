module.exports = function (sequelize, DataTypes) {
    return sequelize.define('authorizations', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            field: 'id',
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        refreshTokenHash: {
            type: DataTypes.CHAR(64),
            allowNull: true,
            field: 'refresh_token_hash',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - ip, userAgent
            // - deviceId, deviceName
            // - sessionId
            // - refreshTokenRotatedAt, revokedAt, revokeReason
        },
    }, {
        tableName: 'authorizations',
        indexes: [
            { name: 'idx_auth_user', fields: ['user_id'] },
        ],
    });
};
