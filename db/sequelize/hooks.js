module.exports = function (models) {
    const { users } = models;

    users.beforeCreate(async (user) => {
        if (user.password) {
            await user.hashPassword();
        }
    });

    users.beforeUpdate(async (user) => {
        if (user.changed('password') && user.password) {
            await user.hashPassword();
        }
    });
};
