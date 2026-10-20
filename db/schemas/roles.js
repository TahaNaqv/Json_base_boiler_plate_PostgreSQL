module.exports = function (sequelize, DataTypes) {
    return sequelize.define('roles', {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            field: 'id',
        },
        roleName: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            field: 'role_name',
        },
        extraData: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            field: 'extra_data',
            // Extra columns (store in JSON):
            // - description
            // - permissions (array/string map)
            // - scope (e.g. tenant/global)
            // - isSystem, isDefault
        },
    }, {
        tableName: 'roles',
    });
};
