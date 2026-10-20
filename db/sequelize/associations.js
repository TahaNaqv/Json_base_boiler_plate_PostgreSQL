module.exports = function (models) {
    const {
        roles,
        users,
        authorizations,
        otp_verifications,
        sent_email_logs,
    } = models;

    roles.hasMany(users, { foreignKey: 'role_id', sourceKey: 'id', as: 'users' });
    users.belongsTo(roles, { foreignKey: 'role_id', targetKey: 'id', as: 'role' });

    users.hasMany(authorizations, { foreignKey: 'user_id', sourceKey: 'id', as: 'authorizations', onDelete: 'CASCADE' });
    authorizations.belongsTo(users, { foreignKey: 'user_id', targetKey: 'id', as: 'user' });

    users.hasMany(otp_verifications, { foreignKey: 'user_id', sourceKey: 'id', as: 'otps', onDelete: 'CASCADE' });
    otp_verifications.belongsTo(users, { foreignKey: 'user_id', targetKey: 'id', as: 'user' });

    users.hasMany(sent_email_logs, { foreignKey: 'user_id', sourceKey: 'id', as: 'sentEmails', onDelete: 'SET NULL' });
    sent_email_logs.belongsTo(users, { foreignKey: 'user_id', targetKey: 'id', as: 'user' });
};
