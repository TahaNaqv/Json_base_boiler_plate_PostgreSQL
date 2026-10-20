module.exports = function (sequelize, DataTypes) {
    const Model = sequelize.define('otp_verifications', {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
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
        otp: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'otp',
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'expires_at',
        },
        verified: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'verified',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - channel (email/sms/whatsapp)
            // - destination (masked email/phone)
            // - attemptCount
            // - ip, userAgent
            // - sentAt, providerMessageId
        },
        isExpired: {
            type: DataTypes.VIRTUAL,
            get() {
                if (!this.expiresAt) return false;
                return new Date(this.expiresAt).getTime() < Date.now();
            },
        },
        isPending: {
            type: DataTypes.VIRTUAL,
            get() {
                if (!this.expiresAt || this.verified) return false;
                return new Date(this.expiresAt).getTime() > Date.now();
            },
        },
    }, {
        tableName: 'otp_verifications',
        indexes: [
            { name: 'idx_otp_user', fields: ['user_id', 'verified', 'expires_at'] },
        ],
    });

    return Model;
};
