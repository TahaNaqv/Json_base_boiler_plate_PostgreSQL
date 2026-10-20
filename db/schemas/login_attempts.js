module.exports = function (sequelize, DataTypes) {
    return sequelize.define('login_attempts', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            field: 'id',
        },
        email: {
            type: DataTypes.STRING(128),
            allowNull: true,
            field: 'email',
        },
        attemptStatus: {
            type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
            allowNull: false,
            field: 'attempt_status',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - ip, userAgent
            // - failureReason (e.g. invalid_password, user_inactive)
            // - authProvider (local/google/azuread/etc)
            // - geo (country/region/city)
        },
    }, {
        tableName: 'login_attempts',
        indexes: [
            { name: 'idx_login_email_time', fields: ['email', 'created_at'] },
        ],
    });
};
