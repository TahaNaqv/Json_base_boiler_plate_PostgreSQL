module.exports = function (sequelize, DataTypes) {
    return sequelize.define('sent_email_logs', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            field: 'id',
        },
        userId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            field: 'user_id',
            references: {
                model: 'users',
                key: 'id',
            },
            onDelete: 'SET NULL',
        },
        status: {
            type: DataTypes.ENUM('sent', 'failed'),
            allowNull: false,
            field: 'status',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - to, cc, bcc
            // - subject, templateId, templateData
            // - provider (ses/sendgrid/mailgun/etc)
            // - providerMessageId
            // - errorCode, errorMessage
        },
    }, {
        tableName: 'sent_email_logs',
        indexes: [
            { name: 'idx_email_user_time', fields: ['user_id', 'created_at'] },
        ],
    });
};
